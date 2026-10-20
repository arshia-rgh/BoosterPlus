package supply

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// FreshQuote refreshes one immutable publication through its original merchant.
// It cannot create a supplier order or change the customer's accepted amount.
func (s *Purchaser) FreshQuote(ctx context.Context, binding *suppliers.ListingBinding, quantity suppliers.Decimal) (suppliers.Quote, error) {
	if binding == nil || (binding.Connection != suppliers.NexusSandbox && binding.Connection != suppliers.NexusProduction) {
		return suppliers.Quote{}, ErrInvalid
	}
	provider := s.providers[binding.Connection]
	if provider == nil || provider.MerchantID() != binding.MerchantID {
		return suppliers.Quote{}, ErrUnavailable
	}
	return provider.QuoteOffer(ctx, binding.Product, binding.OfferID, quantity)
}

// MerchantConfigured is read-only; it is not permission to spend.
func (s *Purchaser) MerchantConfigured(connection suppliers.Connection, merchant string) bool {
	provider := s.providers[connection]
	return provider != nil && validMerchant(merchant) && provider.MerchantID() == merchant
}

// CanPurchase reflects the process kill switch, independently of staff settings.
func (s *Purchaser) CanPurchase(connection suppliers.Connection, merchant string) bool {
	return s.enabled && connection == suppliers.NexusSandbox && s.MerchantConfigured(connection, merchant)
}

// ConfiguredMerchant exposes only the non-secret identity for scoped SQL reads.
func (s *Purchaser) ConfiguredMerchant(connection suppliers.Connection) string {
	if provider := s.providers[connection]; provider != nil {
		return provider.MerchantID()
	}
	return ""
}
