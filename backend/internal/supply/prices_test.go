package supply

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func TestPricingPreviewSeparatesDefaultOverrideAndUnavailable(t *testing.T) {
	offer := suppliers.Offer{ID: "default", Cost: "0.515", Available: true, Quantity: suppliers.Quantity{Kind: "multiple", Min: "10", Max: "100", Step: "1"}}
	value := pricing(offer, 1500, nil)
	if value.CostUSD != "0.515" || value.PreviewQuantity != "10" || value.PreviewAmountMinor != "592" || value.MarkupBPS != nil {
		t.Fatal("incorrect exact markup preview", value)
	}
	bps := 5000
	value = pricing(offer, 1500, &ent.SupplierPrice{Version: 2, MarkupBps: &bps, OverrideMinor: "125", GameID: "game", Region: "Reviewed region", DeliveryMethod: "id"})
	if value.PreviewAmountMinor != "1250" || value.EffectiveMarkupBPS != bps || len(value.Issues) != 0 {
		t.Fatal("override did not win", value)
	}
	offer.Available = false
	value = pricing(offer, 1500, &ent.SupplierPrice{OverrideMinor: "125"})
	if !strings.Contains(strings.Join(value.Issues, ","), "supplier_unavailable") {
		t.Fatal("override invented availability")
	}
	offer.Cost = "0"
	value = pricing(offer, 1500, nil)
	if value.PreviewAmountMinor != "" {
		t.Fatal("missing cost invented price")
	}
}

func TestPrivateCatalogJSONKeepsFractionalAndLargeNumbersExact(t *testing.T) {
	minimum := suppliers.Decimal("9007199254.123456789")
	product := suppliers.Product{ID: "p", Offers: []suppliers.Offer{{ID: "o", Cost: "0.123456789123456789", Available: true,
		Quantity: suppliers.Quantity{Kind: "one", Min: "1", Max: "1", Step: "1"}, Fields: []suppliers.Field{{ID: "player", Min: &minimum}}}}}
	raw, err := json.Marshal(productView(&product, 1500, nil))
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{`"cost_usd":"0.123456789123456789"`, `"min":"9007199254.123456789"`, `"preview_amount_minor":"14"`} {
		if !strings.Contains(string(raw), expected) {
			t.Fatal("precision lost", string(raw))
		}
	}
}

func TestPriceInputRejectsStaleFormatAndUnsafeText(t *testing.T) {
	base := PriceInput{ImportID: "11111111-1111-4111-8111-111111111111"}
	for _, mutate := range []func(*PriceInput){
		func(v *PriceInput) { v.ImportID = "" }, func(v *PriceInput) { v.Version = -1 },
		func(v *PriceInput) { x := -1; v.MarkupBPS = &x }, func(v *PriceInput) { x := 100001; v.MarkupBPS = &x },
		func(v *PriceInput) { v.OverrideMinor = "1.5" }, func(v *PriceInput) { v.OverrideMinor = "0" },
		func(v *PriceInput) { v.GameID = "not-a-game" }, func(v *PriceInput) { v.Region = "a\x00b" },
		func(v *PriceInput) { v.DeliveryMethod = "instant-guarantee" },
	} {
		value := base
		mutate(&value)
		if validatePrice(value) == nil {
			t.Fatal("invalid private setting accepted")
		}
	}
	if validatePrice(base) != nil {
		t.Fatal("incomplete private mapping must be saveable without publication")
	}
}
