package payments

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// CurrencyProvider is the live provider's read-only availability capability.
// Alternate isolated test providers may use their own minimum-only fixtures.
type CurrencyProvider interface {
	PaymentCurrencies(context.Context, bool) (nowpayments.CurrencyAvailability, error)
}

func (s *Store) currencies(ctx context.Context, policy *PolicyView) (nowpayments.CurrencyAvailability, error) {
	if provider, ok := s.provider.(CurrencyProvider); ok {
		return provider.PaymentCurrencies(ctx, policy.Data.RateMode == "fixed")
	}
	result := nowpayments.CurrencyAvailability{Routes: map[string]string{}, ValidUntil: s.instant().Add(5 * time.Minute)}
	for _, route := range policy.Data.Routes {
		result.Routes[route.Code] = route.Network
	}
	return result, nil
}
