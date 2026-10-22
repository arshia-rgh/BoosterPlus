package shop

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func pricedBinding(override string, markup int, kind string) suppliers.ListingBinding {
	quantity := suppliers.Quantity{Kind: "one", Min: "1", Max: "1", Step: "1"}
	if kind == "multiple" {
		quantity = suppliers.Quantity{Kind: "multiple", Min: "5", Max: "100", Step: "5"}
	}
	return suppliers.ListingBinding{Connection: suppliers.NexusProduction, MerchantID: "101", ImportID: "00000000-0000-4000-8000-000000004901",
		Product: suppliers.Product{ID: "mlbb:diamonds:86", GameID: "mlbb", CategoryID: "mlbb:diamonds", Offers: []suppliers.Offer{{ID: "default", Cost: "1.00", Available: true, Quantity: quantity}}},
		OfferID: "default", MarkupBPS: markup, OverrideMinor: override}
}

func pricedObservation(t *testing.T, binding suppliers.ListingBinding, selling string) priceObservation {
	t.Helper()
	value := Definition{Supplier: &SupplierProduct{Method: "id"}, Variants: []Variant{{Key: "supplier", Currency: "USD", UnitAmountMinor: selling}}}
	seen, ok := observe("00000000-0000-4000-8000-000000004902", "00000000-0000-4000-8000-000000004903", value, &binding)
	if !ok {
		t.Fatal("observation refused")
	}
	return seen
}

func freshQuote(binding suppliers.ListingBinding, quantity suppliers.Decimal, unit, total suppliers.Decimal) suppliers.Quote {
	offer := binding.Product.Offers[0]
	offer.Cost = unit
	return suppliers.Quote{Connection: binding.Connection, MerchantID: binding.MerchantID, Product: binding.Product, Offer: offer, Quantity: quantity, TotalCost: total}
}

func TestObservationUsesPreparedDisplayQuantity(t *testing.T) {
	seen := pricedObservation(t, pricedBinding("", 1500, "multiple"), "575")
	if seen.Quantity != "5" || seen.ReleaseTotal != "5" {
		t.Fatal("multiple offers must use their reviewed minimum", seen.Quantity, seen.ReleaseTotal)
	}
	if seen = pricedObservation(t, pricedBinding("", 1500, "one"), "115"); seen.Quantity != "1" || seen.ReleaseTotal != "1" {
		t.Fatal("single offers use one unit", seen.Quantity, seen.ReleaseTotal)
	}
	binding := pricedBinding("", 1500, "one")
	for _, value := range []Definition{
		{Variants: []Variant{{Currency: "USD", UnitAmountMinor: "115"}}},
		{Supplier: &SupplierProduct{}, Variants: []Variant{{Currency: "EUR", UnitAmountMinor: "115"}}},
		{Supplier: &SupplierProduct{}, Variants: []Variant{{Currency: "USD", UnitAmountMinor: "115"}, {Currency: "USD", UnitAmountMinor: "115"}}},
		{Supplier: &SupplierProduct{}, Variants: []Variant{{Currency: "USD", UnitAmountMinor: "0"}}},
	} {
		if _, ok := observe("p", "r", value, &binding); ok {
			t.Fatal("unsupported publication was observed", value)
		}
	}
	missing := binding
	missing.OfferID = "removed"
	if _, ok := observe("p", "r", Definition{Supplier: &SupplierProduct{}, Variants: []Variant{{Currency: "USD", UnitAmountMinor: "115"}}}, &missing); ok {
		t.Fatal("binding without its offer was observed")
	}
}

func TestEvaluateRepricesMarkupWithHalfUpRounding(t *testing.T) {
	binding := pricedBinding("", 1500, "one")
	seen := pricedObservation(t, binding, "115")
	if got := evaluatePrice(seen, freshQuote(binding, "1", "1.00", "1.00"), nil); got.Status != priceCurrent || got.Total != "1" {
		t.Fatal("unchanged supplier price", got)
	}
	// 1.005 * 1.15 = 1.15575 -> 116 cents, rounded once after markup.
	got := evaluatePrice(seen, freshQuote(binding, "1", "1.005", "1.005"), nil)
	if got.Status != priceRepriced || got.NewMinor != "116" || got.UnitCost != "1.005" || got.Total != "1.005" {
		t.Fatal("markup reprice", got)
	}
	// A sub-cent change that rounds to the same price needs no new release.
	if got = evaluatePrice(seen, freshQuote(binding, "1", "1.001", "1.001"), nil); got.Status != priceCurrent {
		t.Fatal("same rounded price must not reprice", got)
	}
	decrease := evaluatePrice(seen, freshQuote(binding, "1", "0.80", "0.80"), nil)
	if decrease.Status != priceRepriced || decrease.NewMinor != "92" {
		t.Fatal("price decreases are applied too", decrease)
	}
	multiple := pricedBinding("", 2000, "multiple")
	seen = pricedObservation(t, multiple, "600")
	if got = evaluatePrice(seen, freshQuote(multiple, "5", "1.10", "5.50"), nil); got.Status != priceRepriced || got.NewMinor != "660" {
		t.Fatal("per-offer markup uses the quoted total for the reviewed quantity", got)
	}
}

func TestEvaluateNeverRepricesOverrideOrFabricatesPrice(t *testing.T) {
	binding := pricedBinding("1234", 1500, "one")
	seen := pricedObservation(t, binding, "1234")
	got := evaluatePrice(seen, freshQuote(binding, "1", "2.50", "2.50"), nil)
	if got.Status != priceOverride || got.NewMinor != "" || got.Total != "2.5" {
		t.Fatal("override must be reported, never repriced", got)
	}
	markup := pricedBinding("", 1500, "one")
	seen = pricedObservation(t, markup, "115")
	for _, row := range []struct {
		err  error
		want string
	}{
		{suppliers.ErrChanged, priceRequirements},
		{fmt.Errorf("wrapped: %w", suppliers.ErrUnavailable), priceUnavailable},
		{suppliers.ErrEvidence, priceCheckFailed},
		{errors.New("timeout"), priceCheckFailed},
	} {
		if got = evaluatePrice(seen, suppliers.Quote{}, row.err); got.Status != row.want || got.Total != "" || got.NewMinor != "" {
			t.Fatal("provider failure", row.err, got)
		}
	}
	for name, quote := range map[string]suppliers.Quote{
		"connection": func() suppliers.Quote {
			q := freshQuote(markup, "1", "2", "2")
			q.Connection = suppliers.NexusSandbox
			return q
		}(),
		"merchant":  func() suppliers.Quote { q := freshQuote(markup, "1", "2", "2"); q.MerchantID = "102"; return q }(),
		"product":   func() suppliers.Quote { q := freshQuote(markup, "1", "2", "2"); q.Product.ID = "other"; return q }(),
		"offer":     func() suppliers.Quote { q := freshQuote(markup, "1", "2", "2"); q.Offer.ID = "other"; return q }(),
		"quantity":  freshQuote(markup, "2", "2", "4"),
		"total":     freshQuote(markup, "1", "2", "0"),
		"unit":      freshQuote(markup, "1", "-1", "2"),
		"malformed": freshQuote(markup, "1", "2", "NaN"),
	} {
		if got = evaluatePrice(seen, quote, nil); got.Status != priceCheckFailed || got.NewMinor != "" {
			t.Fatal("inconsistent quote accepted", name, got)
		}
	}
}

func TestReviewTransitionsAlertAcknowledgeAndReset(t *testing.T) {
	now := time.Date(2026, 10, 22, 8, 0, 0, 0, time.UTC)
	binding := pricedBinding("1234", 1500, "one")
	seen := pricedObservation(t, binding, "1234")
	first := nextReview(nil, seen, priceOutcome{Status: priceOverride, Total: "1"}, seen.ReleaseID, now)
	if first.Status != priceCurrent || first.Attention != "" || first.Baseline != "1" || first.Version != 1 {
		t.Fatal("unchanged override must stay quiet", first)
	}
	changed := nextReview(&first, seen, priceOutcome{Status: priceOverride, Total: "1.2"}, seen.ReleaseID, now.Add(8*time.Hour))
	if changed.Status != priceOverride || changed.Attention != "open" || changed.Supplier != "1.2" || changed.Baseline != "1" || changed.Selling != "1234" || changed.DetectedAt == nil {
		t.Fatal("override change must open an alert without changing our price", changed)
	}
	again := nextReview(&changed, seen, priceOutcome{Status: priceOverride, Total: "1.3"}, seen.ReleaseID, now.Add(16*time.Hour))
	if again.Attention != "open" || !again.DetectedAt.Equal(*changed.DetectedAt) || again.Supplier != "1.3" {
		t.Fatal("persisting alert keeps first detection and latest amount", again)
	}
	// Acknowledgement (store) accepts the reviewed amount as the new baseline.
	acknowledged := again
	acknowledged.Status, acknowledged.Attention, acknowledged.Baseline = priceCurrent, "acknowledged", again.Supplier
	quiet := nextReview(&acknowledged, seen, priceOutcome{Status: priceOverride, Total: "1.30"}, seen.ReleaseID, now.Add(24*time.Hour))
	if quiet.Status != priceCurrent || quiet.Attention != "" {
		t.Fatal("acknowledged amount must not alert again", quiet)
	}
	reopened := nextReview(&acknowledged, seen, priceOutcome{Status: priceOverride, Total: "1.4"}, seen.ReleaseID, now.Add(24*time.Hour))
	if reopened.Attention != "open" || reopened.Baseline != "1.3" {
		t.Fatal("a further supplier change must reopen the alert", reopened)
	}
	// An administrator's new release resets the baseline to that release's cost.
	republished := seen
	republished.ReleaseID, republished.ReleaseTotal = "00000000-0000-4000-8000-000000004904", "1.4"
	reset := nextReview(&reopened, republished, priceOutcome{Status: priceOverride, Total: "1.4"}, republished.ReleaseID, now.Add(32*time.Hour))
	if reset.Status != priceCurrent || reset.Attention != "" || reset.Baseline != "1.4" || reset.ReleaseID != republished.ReleaseID {
		t.Fatal("republication must start a fresh baseline", reset)
	}
}

func TestReviewRepriceHistoryAndFailureThresholds(t *testing.T) {
	now := time.Date(2026, 10, 22, 8, 0, 0, 0, time.UTC)
	binding := pricedBinding("", 1500, "one")
	seen := pricedObservation(t, binding, "115")
	newRelease := "00000000-0000-4000-8000-000000004905"
	repriced := nextReview(nil, seen, priceOutcome{Status: priceRepriced, Total: "1.2", UnitCost: "1.2", NewMinor: "138"}, newRelease, now)
	if repriced.Status != priceRepriced || repriced.ReleaseID != newRelease || repriced.Selling != "138" || repriced.FromMinor != "115" || repriced.ToMinor != "138" || repriced.FromTotal != "1" || repriced.ToTotal != "1.2" || repriced.RepricedAt == nil || repriced.Attention != "" {
		t.Fatal("reprice record", repriced)
	}
	next := seen
	next.ReleaseID, next.SellingMinor, next.ReleaseTotal = newRelease, "138", "1.2"
	current := nextReview(&repriced, next, priceOutcome{Status: priceCurrent, Total: "1.2"}, newRelease, now.Add(8*time.Hour))
	if current.Status != priceCurrent || current.RepricedAt == nil || current.ToMinor != "138" {
		t.Fatal("the last automatic update remains visible", current)
	}
	down := nextReview(&current, next, priceOutcome{Status: priceUnavailable}, newRelease, now.Add(16*time.Hour))
	if down.Attention != "" || down.Failures != 1 || down.Supplier != "1.2" || down.Selling != "138" {
		t.Fatal("one unavailable read keeps the last good price quietly", down)
	}
	down = nextReview(&down, next, priceOutcome{Status: priceUnavailable}, newRelease, now.Add(24*time.Hour))
	if down.Attention != "open" || down.Failures != 2 {
		t.Fatal("repeated unavailability needs attention", down)
	}
	failed := nextReview(&current, next, priceOutcome{Status: priceCheckFailed}, newRelease, now)
	failed = nextReview(&failed, next, priceOutcome{Status: priceCheckFailed}, newRelease, now)
	if failed.Attention != "" {
		t.Fatal("two transient failures stay quiet", failed)
	}
	if failed = nextReview(&failed, next, priceOutcome{Status: priceCheckFailed}, newRelease, now); failed.Attention != "open" {
		t.Fatal("three failures need attention", failed)
	}
	changed := nextReview(&current, next, priceOutcome{Status: priceRequirements}, newRelease, now)
	if changed.Attention != "open" {
		t.Fatal("requirements change needs attention immediately", changed)
	}
	changed.Attention = "acknowledged"
	if kept := nextReview(&changed, next, priceOutcome{Status: priceRequirements}, newRelease, now); kept.Attention != "acknowledged" {
		t.Fatal("acknowledged unchanged problem stays acknowledged", kept)
	}
	if recovered := nextReview(&changed, next, priceOutcome{Status: priceCurrent, Total: "1.2"}, newRelease, now); recovered.Attention != "" || recovered.Failures != 0 {
		t.Fatal("recovery clears attention", recovered)
	}
}

func TestPriceJobKeysAndContract(t *testing.T) {
	if priceKey(priceJob{Connection: suppliers.NexusProduction, Window: 1761120000}) != "supplier-price-sync:nexus-production:1761120000" || priceKey(priceJob{Connection: suppliers.NexusProduction, Window: 1761120000, Batch: 3}) != "supplier-price-sync:nexus-production:1761120000:3" {
		t.Fatal("job idempotency keys")
	}
	var document any
	if err := json.Unmarshal(api.Contract, &document); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("contract.json", document); err != nil {
		t.Fatal(err)
	}
	id := "00000000-0000-4000-8000-000000004906"
	now := time.Unix(0, 0).UTC()
	review := PriceReview{ProductID: id, Title: strings.Repeat("é", 120), Game: "Mobile Legends", State: "published", SupplierProductID: "mlbb:diamonds:86", Status: priceOverride, Attention: "open", Version: 2, Quantity: "1", BaselineTotal: "1", SupplierTotal: "1.2", SellingMinor: "1234", CheckedAt: now, DetectedAt: &now}
	valid := map[string]any{
		"ShopPriceReview":    review,
		"ShopPriceSync":      PriceSync{IntervalMinutes: 480, Configured: true, LastRun: &PriceRun{State: "complete", StartedAt: now, FinishedAt: &now, Checked: 3}, NextCheckAt: &now, AttentionCount: 1, Attention: []PriceReview{review}, Repriced: []PriceReview{}},
		"ShopProductSummary": Summary{ID: id, GameID: id, Game: "Mobile Legends", Slug: id, Title: "x", Version: 1, State: "published", UpdatedAt: now, PriceStatus: priceRepriced, RepricedAt: &now},
	}
	invalid := map[string]any{
		"ShopPriceReview": map[string]any{"product_id": id, "status": "invented"},
		"ShopPriceSync":   PriceSync{IntervalMinutes: 5},
	}
	check := func(name string, value any) error {
		schema, err := compiler.Compile("contract.json#/components/schemas/" + name)
		if err != nil {
			t.Fatal(err)
		}
		encoded, err := json.Marshal(value)
		if err != nil {
			t.Fatal(err)
		}
		var data any
		if err = json.Unmarshal(encoded, &data); err != nil {
			t.Fatal(err)
		}
		return schema.Validate(data)
	}
	for name, value := range valid {
		if err := check(name, value); err != nil {
			t.Fatal(name, err)
		}
	}
	for name, value := range invalid {
		if check(name, value) == nil {
			t.Fatal("contract accepted invalid", name)
		}
	}
}
