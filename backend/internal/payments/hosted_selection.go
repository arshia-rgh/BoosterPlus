package payments

import (
	"context"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// Only an explicit immutable marker selects hosted coin choice. Missing or
// corrupt historical routes must never weaken legacy asset matching.
func providerSelection(attempt *ent.PaymentAttempt) bool {
	route, err := decode[Route](attempt.Route)
	return err == nil && route.Selection == "provider" && route.Code == "" && route.Network == "" && !attempt.NativeCheckout && attempt.Currency == "USD"
}

type networkReader interface {
	PaymentNetwork(context.Context, string) (string, error)
}

// Metadata I/O runs before the transaction and only for new hosted attempts.
// An authenticated payment's explicit network is authoritative; never overwrite
// it from today's merchant options or guess from the token ticker.
func (s *Store) resolveNetwork(ctx context.Context, p *nowpayments.Payment) error {
	if p.Network != "" || !validID(p.AttemptID) {
		return nil
	}
	attempt, err := s.client.PaymentAttempt.Get(ctx, p.AttemptID)
	if ent.IsNotFound(err) {
		return nil
	}
	if err != nil || !providerSelection(attempt) {
		return err
	}
	reader, ok := s.provider.(networkReader)
	if !ok {
		return nowpayments.ErrEvidence
	}
	network, err := reader.PaymentNetwork(ctx, p.PayCurrency)
	if err != nil {
		return err
	}
	if !codePattern.MatchString(network) || network != strings.ToLower(network) {
		return nowpayments.ErrEvidence
	}
	p.Network, p.NetworkSource = network, "currency_directory"
	return nil
}

// Payout choices cannot disable an otherwise valid USD checkout agreement.
func validateCheckoutPolicy(policy Policy) error {
	policy.Routes = nil
	return validatePolicy(policy)
}
