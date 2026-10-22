package payments

import (
	"context"
	"errors"
	"slices"
	"sync"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// PaymentOption exposes only the approved route and read-only eligibility.
type PaymentOption struct {
	Code          string     `json:"code"`
	Status        string     `json:"status"`
	MinimumCrypto string     `json:"minimum_crypto"`
	MinimumFiat   string     `json:"minimum_fiat"`
	CheckedAt     *time.Time `json:"checked_at"`
	ValidUntil    *time.Time `json:"valid_until"`
}

// Options binds all eligibility to the customer's immutable contract and policy.
type Options struct {
	ContractID  string          `json:"contract_id"`
	PolicyID    string          `json:"policy_id"`
	Currency    string          `json:"currency"`
	AmountMinor string          `json:"amount_minor"`
	ServerTime  time.Time       `json:"server_time"`
	Routes      []PaymentOption `json:"routes"`
}

// PaymentOptions accepts no caller-supplied amount, currency, fee mode or asset.
// It cannot create invoices, payment attempts, reservations or supplier orders.
func (s *Store) PaymentOptions(ctx context.Context, p *identity.Principal, id string) (Options, error) {
	row, err := owned(ctx, s.client, p, id, false)
	if err != nil {
		return Options{}, err
	}
	if !s.enabled || s.provider == nil || s.account == "" {
		return Options{}, ErrUnavailable
	}
	if row.State != order.StateAwaitingPayment || row.CurrentContract == "" {
		return Options{}, ErrConflict
	}
	contract, err := s.client.OrderContract.Get(ctx, row.CurrentContract)
	if err != nil {
		return Options{}, err
	}
	if contract.OrderID != id || contract.UserID != p.User.ID || contract.PaymentState != ordercontract.PaymentStateUnissued {
		return Options{}, ErrConflict
	}
	policy, err := published(ctx, s.client)
	if err != nil {
		return Options{}, err
	}
	if policy == nil || validatePolicy(policy.Data) != nil || validateRemedies(policy.Data.Remedies) != nil {
		return Options{}, ErrUnavailable
	}
	commercial, err := decode[orders.Commercial](contract.Data)
	if err != nil {
		return Options{}, err
	}
	if !minorPattern.MatchString(commercial.AmountMinor) || !slices.Contains(policy.Data.Currencies, commercial.Currency) {
		return Options{}, ErrConflict
	}
	result := Options{ContractID: contract.ID, PolicyID: policy.ID, Currency: commercial.Currency, AmountMinor: commercial.AmountMinor, Routes: make([]PaymentOption, len(policy.Data.Routes))}
	provider, supported := s.provider.(MinimumProvider)
	readCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	availability, availableErr := s.currencies(readCtx, policy)
	var group sync.WaitGroup
	limit := make(chan struct{}, 4)
	for i, route := range policy.Data.Routes {
		result.Routes[i] = PaymentOption{Code: route.Code, Status: "unavailable"}
		if !supported || availableErr != nil || availability.Routes[route.Code] != route.Network || !s.instant().Before(availability.ValidUntil) {
			continue
		}
		group.Go(func() {
			select {
			case limit <- struct{}{}:
			case <-readCtx.Done():
				return
			}
			defer func() { <-limit }()
			entry := s.minimums.get(readCtx, provider, routeMinimumKey(policy, commercial.Currency, route.Code), s.instant)
			if entry.err != nil || !s.instant().Before(entry.until) {
				return
			}
			check := entry.value.Check(commercial.AmountMinor)
			status := "available"
			if errors.Is(check, nowpayments.ErrBelowMinimum) {
				status = "below_minimum"
			} else if check != nil {
				return
			}
			until := minTime(entry.until, availability.ValidUntil)
			result.Routes[i] = PaymentOption{Code: route.Code, Status: status, MinimumCrypto: string(entry.value.Crypto), MinimumFiat: string(entry.value.Fiat), CheckedAt: &entry.checked, ValidUntil: &until}
		})
	}
	group.Wait()
	// Reads took place outside transactions; do not present a changed agreement.
	current, err := owned(ctx, s.client, p, id, false)
	if err != nil {
		return Options{}, err
	}
	currentPolicy, err := published(ctx, s.client)
	if err != nil {
		return Options{}, err
	}
	if current.CurrentContract != contract.ID || current.State != order.StateAwaitingPayment || currentPolicy == nil || currentPolicy.ID != policy.ID {
		return Options{}, ErrConflict
	}
	result.ServerTime = s.instant()
	return result, nil
}
