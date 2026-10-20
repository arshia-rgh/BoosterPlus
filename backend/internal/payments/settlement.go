package payments

import (
	"context"
	"errors"
	"math/big"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/couponclaim"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentallocation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/availabilityevents"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resaleevents"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shopevents"
)

func matching(attempt *ent.PaymentAttempt, p nowpayments.Payment) string {
	if p.AttemptID != attempt.ID || attempt.InvoiceID != nil && *attempt.InvoiceID != p.InvoiceID {
		return "reference_mismatch"
	}
	amount, ok := new(big.Int).SetString(attempt.AmountMinor, 10)
	if !ok {
		return "price_mismatch"
	}
	price, err := p.PriceAmount.Rational()
	if err != nil || price.Cmp(new(big.Rat).SetFrac(amount, big.NewInt(100))) != 0 || strings.ToUpper(p.PriceCurrency) != attempt.Currency {
		return "price_mismatch"
	}
	route, err := decode[Route](attempt.Route)
	if err != nil || route.Code != p.PayCurrency || p.Network != "" && strings.ToLower(p.Network) != route.Network {
		return "wrong_route"
	}
	expected, err := p.PayAmount.Rational()
	if err != nil || expected.Sign() <= 0 {
		return "invalid_evidence"
	}
	return ""
}
func (s *Store) event(ctx context.Context, tx *ent.Tx, row *ent.Order, state order.State, action, message string) error {
	if row.Version >= maxVersion {
		return ErrConflict
	}
	count, err := tx.Order.Update().Where(order.IDEQ(row.ID), order.VersionEQ(row.Version)).SetState(state).AddVersion(1).SetUpdatedAt(s.instant()).Save(ctx)
	if err != nil {
		return err
	}
	if count != 1 {
		return ErrConflict
	}
	entry, err := tx.OrderEvent.Create().SetOrderID(row.ID).SetVersion(row.Version + 1).SetAction(action).SetMessage(message).SetActorID("").SetActorRole("system").SetCreatedAt(s.instant()).Save(ctx)
	if err != nil {
		return err
	}
	return notifications.Enqueue(ctx, tx, row.UserID, row.ID, entry.ID, "order_customer", s.instant())
}
func (s *Store) retire(ctx context.Context, tx *ent.Tx, attempt *ent.PaymentAttempt, issue string) error {
	allocation, err := tx.PaymentAllocation.Query().Where(paymentallocation.ContractIDEQ(attempt.ContractID)).Exist(ctx)
	if err != nil {
		return err
	}
	if allocation {
		return nil
	}
	_, err = tx.PaymentAttempt.UpdateOneID(attempt.ID).SetState("closed").SetIssue(issue).SetCheckoutURL("").ClearActiveContractID().SetUpdatedAt(s.instant()).Save(ctx)
	if err != nil {
		return err
	}
	contract, err := tx.OrderContract.Get(ctx, attempt.ContractID)
	if err != nil {
		return err
	}
	if contract.PaymentState == ordercontract.PaymentStateRetired {
		return nil
	}
	if _, err = tx.OrderContract.UpdateOneID(contract.ID).SetPaymentState(ordercontract.PaymentStateRetired).ClearActiveOrderID().SetCapacityHeld(false).Save(ctx); err != nil {
		return err
	}
	if _, err = tx.CouponClaim.Update().Where(couponclaim.ContractIDEQ(contract.ID), couponclaim.StateEQ(couponclaim.StateHeld)).SetState(couponclaim.StateReleased).Save(ctx); err != nil {
		return err
	}
	row, err := tx.Order.Get(ctx, attempt.OrderID)
	if err != nil {
		return err
	}
	if row.State == order.StateAwaitingPayment {
		if err = s.event(ctx, tx, row, order.StateExpired, "checkout_expired", "The local checkout window closed. Any funds received later require review; do not use the old payment link."); err != nil {
			return err
		}
	}
	return availabilityevents.Changed(ctx, tx, contract.GameID)
}
func (s *Store) allocate(ctx context.Context, tx *ent.Tx, attempt *ent.PaymentAttempt, receipt *ent.PaymentReceipt, p nowpayments.Payment) (string, error) {
	existing, err := tx.PaymentAllocation.Query().Where(paymentallocation.ContractIDEQ(attempt.ContractID)).Only(ctx)
	if err != nil && !ent.IsNotFound(err) {
		return "", err
	}
	if existing != nil {
		if existing.ReceiptID != receipt.ID {
			return "duplicate_payment", nil
		}
		return "", nil
	}
	contract, err := tx.OrderContract.Get(ctx, attempt.ContractID)
	if err != nil {
		return "", err
	}
	row, err := tx.Order.Get(ctx, attempt.OrderID)
	if err != nil {
		return "", err
	}
	if contract.PaymentState == ordercontract.PaymentStateRetired || contract.ActiveOrderID == nil || row.State != order.StateAwaitingPayment || row.CurrentContract != contract.ID {
		return "retired_contract", nil
	}
	if !attempt.ExpiresAt.After(s.instant()) && (attempt.FundsDetectedAt == nil || !attempt.FundsDetectedAt.Before(attempt.ExpiresAt)) {
		return "timing_review", nil
	}
	if err = resaleevents.Allocate(ctx, tx, row, s.instant()); err != nil {
		return "", err
	}
	if err = shopevents.Allocate(ctx, tx, row, s.instant()); err != nil {
		if errors.Is(err, shopevents.ErrConflict) {
			return "inventory_review", nil
		}
		return "", err
	}
	if _, err = tx.PaymentAllocation.Create().SetReceiptID(receipt.ID).SetContractID(contract.ID).SetOrderID(row.ID).SetCurrency(attempt.Currency).SetAmountMinor(attempt.AmountMinor).SetCryptoAmount(string(p.PayAmount)).SetCreatedAt(s.instant()).Save(ctx); err != nil {
		return "", err
	}
	if _, err = tx.OrderContract.UpdateOneID(contract.ID).SetPaymentState(ordercontract.PaymentStateSettled).Save(ctx); err != nil {
		return "", err
	}
	if _, err = tx.CouponClaim.Update().Where(couponclaim.ContractIDEQ(contract.ID), couponclaim.StateEQ(couponclaim.StateHeld)).SetState(couponclaim.StateRedeemed).Save(ctx); err != nil {
		return "", err
	}
	next := order.StateQueued
	held, e := tx.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(row.ID)).Exist(ctx)
	if e != nil {
		return "", e
	}
	if held {
		next = order.StateOnHold
	}
	message := "The provider confirmed payment and it was allocated to this agreement. Your order is ready for fulfillment."
	if held {
		message = "The provider confirmed payment and it was allocated to this agreement. Work remains on hold for the active service case."
	}
	if err = s.event(ctx, tx, row, next, "payment_verified", message); err != nil {
		return "", err
	}
	if err = shopevents.ScheduleSupplier(ctx, tx, row); err != nil {
		return "", err
	}
	return "", s.audit(ctx, tx, nil, "allocated", receipt.ID)
}
func (s *Store) reverse(ctx context.Context, tx *ent.Tx, attempt *ent.PaymentAttempt, receipt *ent.PaymentReceipt) error {
	exists, err := tx.PaymentAllocation.Query().Where(paymentallocation.ReceiptIDEQ(receipt.ID)).Exist(ctx)
	if err != nil || !exists {
		return err
	}
	contract, err := tx.OrderContract.Get(ctx, attempt.ContractID)
	if err != nil {
		return err
	}
	if contract.PaymentState != ordercontract.PaymentStateSettled {
		return nil
	}
	if _, err = tx.OrderContract.UpdateOneID(contract.ID).SetPaymentState(ordercontract.PaymentStateFundsDetected).Save(ctx); err != nil {
		return err
	}
	row, err := tx.Order.Get(ctx, attempt.OrderID)
	if err != nil {
		return err
	}
	return s.event(ctx, tx, row, order.StateOnHold, "payment_reversed", "The provider reported a reversal. Financial review is required before work can continue.")
}
