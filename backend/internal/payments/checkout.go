package payments

import (
	"context"
	"errors"
	"slices"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentallocation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentreceipt"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resaleevents"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shopevents"
)

func owned(ctx context.Context, client *ent.Client, p *identity.Principal, id string, admin bool) (*ent.Order, error) {
	capability := "account"
	if admin {
		capability = "admin"
	}
	if err := identity.Require(p, capability); err != nil {
		return nil, err
	}
	query := client.Order.Query().Where(order.IDEQ(id))
	if !admin {
		query.Where(order.UserIDEQ(p.User.ID))
	}
	return query.Only(ctx)
}

// Start persists one active attempt and its invoice job atomically. Repeated calls reuse it.
func (s *Store) Start(ctx context.Context, p *identity.Principal, id string, input StartInput) (Attempt, error) {
	if !validID(id) || !validID(input.ContractID) || !validID(input.PolicyID) || !input.AcceptPolicy || !codePattern.MatchString(input.Route) {
		return Attempt{}, ErrInvalid
	}
	if s.provider == nil || !s.enabled || s.account == "" {
		return Attempt{}, ErrUnavailable
	}
	if err := s.preflight(ctx, p, id, input); err != nil {
		return Attempt{}, err
	}
	var result Attempt
	err := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		row, err := owned(ctx, tx.Client(), current, id, false)
		if err != nil {
			return err
		}
		if row.State != order.StateAwaitingPayment || row.CurrentContract != input.ContractID {
			return ErrConflict
		}
		existing, err := tx.PaymentAttempt.Query().Where(paymentattempt.ActiveContractIDEQ(input.ContractID)).Only(ctx)
		if err != nil && !ent.IsNotFound(err) {
			return err
		}
		if existing != nil {
			if existing.PolicyID != input.PolicyID || !existing.ExpiresAt.After(s.instant()) {
				return ErrConflict
			}
			route, e := decode[Route](existing.Route)
			if e != nil {
				return e
			}
			if route.Code != input.Route {
				return ErrConflict
			}
			result, e = attemptView(existing)
			return e
		}
		contract, err := tx.OrderContract.Get(ctx, input.ContractID)
		if err != nil {
			return err
		}
		if contract.OrderID != id || contract.UserID != current.User.ID || contract.PaymentState != ordercontract.PaymentStateUnissued {
			return ErrConflict
		}
		policy, err := published(ctx, tx.Client())
		if err != nil {
			return err
		}
		if policy == nil || policy.ID != input.PolicyID || validatePolicy(policy.Data) != nil || validateRemedies(policy.Data.Remedies) != nil {
			return ErrConflict
		}
		commercial, err := decode[orders.Commercial](contract.Data)
		if err != nil {
			return err
		}
		if !minorPattern.MatchString(commercial.AmountMinor) || !slices.Contains(policy.Data.Currencies, commercial.Currency) {
			return ErrConflict
		}
		index := slices.IndexFunc(policy.Data.Routes, func(route Route) bool { return route.Code == input.Route })
		if index < 0 {
			return ErrInvalid
		}
		policyDoc, err := document(policy.Data)
		if err != nil {
			return err
		}
		routeDoc, err := document(policy.Data.Routes[index])
		if err != nil {
			return err
		}
		now := s.instant()
		// New checkout uses the provider-hosted page; persisted native attempts
		// retain their original instructions and reconciliation behavior.
		native := false
		attempt, err := tx.PaymentAttempt.Create().SetPostClaimed(false).SetNativeCheckout(native).SetDepositClaimed(!native).SetOrderID(id).SetContractID(contract.ID).SetActiveContractID(contract.ID).SetUserID(current.User.ID).SetAccount(s.account).SetPolicyID(policy.ID).SetPolicy(policyDoc).SetRoute(routeDoc).SetCurrency(commercial.Currency).SetAmountMinor(commercial.AmountMinor).SetState("new").SetCreatedAt(now).SetUpdatedAt(now).SetExpiresAt(now.Add(time.Duration(policy.Data.WindowMinutes) * time.Minute)).Save(ctx)
		if err != nil {
			return err
		}
		if err = resaleevents.Checkout(ctx, tx, row, attempt.ExpiresAt, now); err != nil {
			return err
		}
		if err = shopevents.Checkout(ctx, tx, row, attempt.ExpiresAt, now); err != nil {
			if errors.Is(err, shopevents.ErrConflict) {
				return ErrConflict
			}
			return err
		}
		if _, err = tx.OrderContract.UpdateOneID(contract.ID).SetPaymentState(ordercontract.PaymentStateInvoicePending).Save(ctx); err != nil {
			return err
		}
		if err = enqueue(ctx, tx, "payments.invoice", "payments-invoice:"+attempt.ID, map[string]string{"attempt_id": attempt.ID}); err != nil {
			return err
		}
		if err = s.audit(ctx, tx, current, "checkout_requested", attempt.ID); err != nil {
			return err
		}
		result, err = attemptView(attempt)
		return err
	})
	return result, err
}

// History enforces ownership before returning any checkout URL or receipt.
func (s *Store) History(ctx context.Context, p *identity.Principal, id string, admin bool) (History, error) {
	result := History{ServerTime: s.instant(), Enabled: s.enabled && s.provider != nil, Attempts: []Attempt{}, Receipts: []Receipt{}}
	if _, err := owned(ctx, s.client, p, id, admin); err != nil {
		return result, err
	}
	var err error
	result.Policy, err = published(ctx, s.client)
	if err != nil {
		return result, err
	}
	attempts, err := s.client.PaymentAttempt.Query().Where(paymentattempt.OrderIDEQ(id)).Order(ent.Desc(paymentattempt.FieldCreatedAt), ent.Desc(paymentattempt.FieldID)).Limit(50).All(ctx)
	if err != nil {
		return result, err
	}
	for _, row := range attempts {
		view, e := attemptView(row)
		if e != nil {
			return result, e
		}
		if row.Account != s.account || !row.ExpiresAt.After(s.instant()) || row.State != "awaiting_payment" {
			view.CheckoutURL = ""
		}
		s.projectDeposit(row, &view)
		result.Attempts = append(result.Attempts, view)
	}
	receipts, err := s.client.PaymentReceipt.Query().Where(paymentreceipt.OrderIDEQ(id)).Order(ent.Desc(paymentreceipt.FieldCreatedAt), ent.Desc(paymentreceipt.FieldID)).Limit(100).All(ctx)
	if err != nil {
		return result, err
	}
	for _, row := range receipts {
		view := Receipt{ID: row.ID, State: row.State, Currency: row.Currency, Network: row.Network, Amount: row.Amount, CreatedAt: row.CreatedAt}
		allocation, e := s.client.PaymentAllocation.Query().Where(paymentallocation.ReceiptIDEQ(row.ID)).Only(ctx)
		if e != nil && !ent.IsNotFound(e) {
			return result, e
		}
		if allocation != nil {
			view.AllocatedCurrency = allocation.Currency
			view.AllocatedMinor = allocation.AmountMinor
		}
		if admin {
			view.RefundableAmount, e = refundableAmount(ctx, s.client, row)
			if e != nil {
				return result, e
			}
		}
		result.Receipts = append(result.Receipts, view)
	}
	return result, nil
}
