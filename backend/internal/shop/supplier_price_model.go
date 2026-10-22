package shop

import (
	"errors"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// Automatic supplier price check outcomes. Only "repriced" changes a customer
// price, and only through a new immutable release.
const (
	priceCurrent      = "current"
	priceRepriced     = "repriced"
	priceOverride     = "override_changed"
	priceUnavailable  = "unavailable"
	priceRequirements = "requirements_changed"
	priceCheckFailed  = "check_failed"
	priceRefresh      = "needs_refresh"
)

// priceObservation is the published state a supplier quote is compared with.
type priceObservation struct {
	ProductID    string
	ReleaseID    string
	Binding      suppliers.ListingBinding
	SellingMinor string
	Quantity     suppliers.Decimal
	ReleaseTotal suppliers.Decimal
}

// priceOutcome carries a fresh supplier read; Total is empty when none exists.
type priceOutcome struct {
	Status   string
	Total    suppliers.Decimal
	UnitCost suppliers.Decimal
	NewMinor string
}

// observe derives the reviewed display quantity exactly as PrepareSupplier did.
// It reports false for a publication automatic pricing cannot interpret.
func observe(productID, releaseID string, value Definition, binding *suppliers.ListingBinding) (priceObservation, bool) {
	if binding == nil || value.Supplier == nil || len(value.Variants) != 1 || value.Variants[0].Currency != "USD" || !amountPattern.MatchString(value.Variants[0].UnitAmountMinor) {
		return priceObservation{}, false
	}
	offer, ok := bindingOffer(binding)
	if !ok {
		return priceObservation{}, false
	}
	quantity := offer.Quantity.Min
	if offer.Quantity.Kind == "one" {
		quantity = "1"
	}
	total, err := suppliers.Total(offer.Cost, quantity)
	if err != nil || suppliers.ValidateQuantity(offer.Quantity, quantity) != nil {
		return priceObservation{}, false
	}
	return priceObservation{ProductID: productID, ReleaseID: releaseID, Binding: *binding, SellingMinor: value.Variants[0].UnitAmountMinor, Quantity: quantity, ReleaseTotal: total}, true
}

func bindingOffer(binding *suppliers.ListingBinding) (suppliers.Offer, bool) {
	for _, offer := range binding.Product.Offers {
		if offer.ID == binding.OfferID {
			return offer, true
		}
	}
	return suppliers.Offer{}, false
}

// evaluatePrice never invents a price: any mismatch or provider failure keeps
// the published release and reports why. Explicit selling-price overrides are
// compared later against the acknowledged baseline and are never repriced.
func evaluatePrice(seen priceObservation, quote suppliers.Quote, quoteErr error) priceOutcome {
	switch {
	case errors.Is(quoteErr, suppliers.ErrChanged):
		return priceOutcome{Status: priceRequirements}
	case errors.Is(quoteErr, suppliers.ErrUnavailable):
		return priceOutcome{Status: priceUnavailable}
	case quoteErr != nil:
		return priceOutcome{Status: priceCheckFailed}
	}
	b := seen.Binding
	if quote.Connection != b.Connection || quote.MerchantID != b.MerchantID || quote.Product.ID != b.Product.ID || quote.Offer.ID != b.OfferID || !suppliers.Equal(quote.Quantity, seen.Quantity) {
		return priceOutcome{Status: priceCheckFailed}
	}
	total, err := suppliers.Canonical(quote.TotalCost)
	if err != nil {
		return priceOutcome{Status: priceCheckFailed}
	}
	unit, err := suppliers.Canonical(quote.Offer.Cost)
	if err != nil {
		return priceOutcome{Status: priceCheckFailed}
	}
	if b.OverrideMinor != "" {
		return priceOutcome{Status: priceOverride, Total: total, UnitCost: unit}
	}
	amount, err := quote.CustomerPrice(b.MarkupBPS, "")
	if err != nil {
		return priceOutcome{Status: priceCheckFailed}
	}
	if amount == seen.SellingMinor {
		return priceOutcome{Status: priceCurrent, Total: total, UnitCost: unit}
	}
	return priceOutcome{Status: priceRepriced, Total: total, UnitCost: unit, NewMinor: amount}
}

// reviewState mirrors one supplier_price_reviews row.
type reviewState struct {
	Status, Attention, ReleaseID, Quantity, Baseline, Supplier, Selling string
	Failures, Version                                                   int
	DetectedAt                                                          *time.Time
	RepricedAt                                                          *time.Time
	FromMinor, ToMinor, FromTotal, ToTotal                              string
}

// nextReview applies one check to the previous state. A different release means
// an administrator republished: its own supplier cost becomes the new baseline.
func nextReview(previous *reviewState, seen priceObservation, outcome priceOutcome, releaseID string, now time.Time) reviewState {
	next := reviewState{}
	if previous != nil {
		next = *previous
	}
	if previous == nil || previous.ReleaseID != seen.ReleaseID {
		next.Status, next.Attention, next.DetectedAt, next.Failures = "", "", nil, 0
		next.Baseline = string(seen.ReleaseTotal)
	}
	prior := next.Status
	next.ReleaseID, next.Quantity, next.Selling, next.Version = seen.ReleaseID, string(seen.Quantity), seen.SellingMinor, next.Version+1
	status := outcome.Status
	switch status {
	case priceOverride:
		if suppliers.Equal(outcome.Total, suppliers.Decimal(next.Baseline)) {
			status = priceCurrent
		}
		next.Supplier, next.Failures = string(outcome.Total), 0
	case priceCurrent:
		next.Supplier, next.Failures = string(outcome.Total), 0
	case priceRepriced:
		next.FromMinor, next.ToMinor, next.FromTotal, next.ToTotal = seen.SellingMinor, outcome.NewMinor, next.Baseline, string(outcome.Total)
		next.RepricedAt = &now
		next.ReleaseID, next.Selling, next.Baseline, next.Supplier, next.Failures = releaseID, outcome.NewMinor, string(outcome.Total), string(outcome.Total), 0
	default:
		next.Failures++
	}
	next.Status = status
	attention := status == priceOverride || status == priceRequirements || status == priceRefresh || status == priceUnavailable && next.Failures >= 2 || status == priceCheckFailed && next.Failures >= 3
	switch {
	case !attention:
		next.Attention, next.DetectedAt = "", nil
	case next.Attention != "" && prior == status:
		// Keep an open or acknowledged alert while the same condition persists.
	default:
		next.Attention, next.DetectedAt = "open", &now
	}
	return next
}
