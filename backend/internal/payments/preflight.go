package payments

import (
	"context"
	"errors"
	"slices"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// preflight keeps provider reads outside the authorization transaction. The
// immutable contract and policy identifiers are rechecked inside Start's fence.
func (s *Store) preflight(ctx context.Context, p *identity.Principal, id string, input StartInput) error {
	row, err := owned(ctx, s.client, p, id, false)
	if err != nil {
		return err
	}
	if row.State != order.StateAwaitingPayment || row.CurrentContract != input.ContractID {
		return ErrConflict
	}
	exists, err := s.client.PaymentAttempt.Query().Where(paymentattempt.ActiveContractIDEQ(input.ContractID)).Exist(ctx)
	if err != nil {
		return err
	}
	if exists {
		return nil
	} // Reuse never depends on a fresh provider read.
	contract, err := s.client.OrderContract.Get(ctx, input.ContractID)
	if err != nil {
		return err
	}
	if contract.OrderID != id || contract.UserID != p.User.ID || contract.PaymentState != ordercontract.PaymentStateUnissued {
		return ErrConflict
	}
	policy, err := published(ctx, s.client)
	if err != nil {
		return err
	}
	if policy == nil || policy.ID != input.PolicyID || validatePolicy(policy.Data) != nil || validateRemedies(policy.Data.Remedies) != nil {
		return ErrConflict
	}
	index := slices.IndexFunc(policy.Data.Routes, func(route Route) bool { return route.Code == input.Route })
	if index < 0 {
		return ErrInvalid
	}
	commercial, err := decode[orders.Commercial](contract.Data)
	if err != nil {
		return err
	}
	if !minorPattern.MatchString(commercial.AmountMinor) || !slices.Contains(policy.Data.Currencies, commercial.Currency) {
		return ErrConflict
	}
	availability, availabilityErr := s.currencies(ctx, policy)
	if availabilityErr != nil || !s.instant().Before(availability.ValidUntil) || availability.Routes[input.Route] != policy.Data.Routes[index].Network {
		return ErrUnavailable
	}
	err = s.provider.CheckInvoice(ctx, nowpayments.InvoiceRequest{OrderID: id, AmountMinor: commercial.AmountMinor, Currency: commercial.Currency, PayCurrency: input.Route, FixedRate: policy.Data.RateMode == "fixed", FeePaidByUser: policy.Data.FeeMode == "customer"})
	if err != nil {
		s.minimums.invalidate(routeMinimumKey(policy, commercial.Currency, input.Route))
	}
	if errors.Is(err, nowpayments.ErrBelowMinimum) {
		return nowpayments.ErrBelowMinimum
	}
	if err != nil {
		return ErrUnavailable
	}
	return nil
}
