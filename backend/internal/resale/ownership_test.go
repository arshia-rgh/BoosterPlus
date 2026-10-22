package resale

import (
	"errors"
	"reflect"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/accountpricing"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

func TestOwnershipDerivesFromOrigin(t *testing.T) {
	t.Parallel()
	for origin, want := range map[accountlisting.Origin]string{
		accountlisting.OriginPlayora:     "playora",
		accountlisting.OriginBuyFirst:    "playora",
		accountlisting.OriginConsignment: "seller",
	} {
		if got := Ownership(origin); got != want {
			t.Fatalf("%s ownership = %s, want %s", origin, got, want)
		}
	}
}

func TestInventoryOriginsFilter(t *testing.T) {
	t.Parallel()
	cases := []struct {
		ownership, origin string
		want              []accountlisting.Origin
		ok                bool
	}{
		{"", "", nil, true},
		{"playora", "", []accountlisting.Origin{accountlisting.OriginPlayora, accountlisting.OriginBuyFirst}, true},
		{"seller", "", []accountlisting.Origin{accountlisting.OriginConsignment}, true},
		{"", "buy_first", []accountlisting.Origin{accountlisting.OriginBuyFirst}, true},
		{"", "playora", []accountlisting.Origin{accountlisting.OriginPlayora}, true},
		{"playora", "buy_first", nil, false},
		{"owner", "", nil, false},
		{"", "seller", nil, false},
		{"", "PLAYORA", nil, false},
	}
	for _, c := range cases {
		got, ok := inventoryOrigins(c.ownership, c.origin)
		if ok != c.ok || !reflect.DeepEqual(got, c.want) {
			t.Fatalf("inventoryOrigins(%q, %q) = %v, %v", c.ownership, c.origin, got, ok)
		}
	}
}

func playoraProduct(t *testing.T) Product {
	t.Helper()
	price, err := accountpricing.BuyerPrice("1175")
	if err != nil {
		t.Fatal(err)
	}
	product := playoraDraft("Synthetic PLAYORA account")
	product.Commission, product.AmountMinor = &price, price.TotalMinor
	return product
}

func TestPlayoraListingUsesPublishedBuyerRule(t *testing.T) {
	t.Parallel()
	product := playoraProduct(t)
	if err := listingCommission(product, nil); err != nil {
		t.Fatal("base + 5% with the seven-day inspection must be accepted:", err)
	}
	missing := product
	missing.Commission = nil
	wrong := product
	wrong.AmountMinor = "1175"
	inspection := product
	inspection.DisputeHours = 72
	for name, value := range map[string]Product{"missing": missing, "wrong total": wrong, "inspection": inspection} {
		var invalid *catalog.Invalid
		if err := listingCommission(value, nil); !errors.As(err, &invalid) {
			t.Fatalf("%s: want a field issue, got %v", name, err)
		}
	}
}

func TestPlayoraDraftInventsNoCommercialFacts(t *testing.T) {
	t.Parallel()
	draft := playoraDraft("Synthetic PLAYORA account")
	if draft.AmountMinor != "" || draft.Commission != nil || draft.DeliveryMinHours != 0 || draft.DeliveryMaxHours != 0 || draft.Description != "" || len(draft.MediaIDs) != 0 || len(draft.Attributes) != 0 {
		t.Fatalf("draft must not invent price, delivery, facts or images: %+v", draft)
	}
	if draft.Currency != "USD" || draft.DisputeHours != 168 || draft.SaleTerms != agreementDefaults.Buyer.SaleTerms || draft.AcknowledgementTerms != agreementDefaults.Buyer.AcknowledgementTerms {
		t.Fatal("draft must start from the owner-approved buyer terms")
	}
	issues := productIssues(draft)
	if len(issues) == 0 {
		t.Fatal("an empty draft must not be publishable")
	}
}
