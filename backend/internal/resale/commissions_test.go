package resale

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/accountpricing"
)

func TestCommissionAgreementGuards(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 10, 13, 12, 0, 0, 0, time.UTC)
	price, err := accountpricing.SellerPrice("4999", "1.0001", "synthetic quote", now)
	if err != nil {
		t.Fatal(err)
	}
	terms := agreementDefaults.SellerConsignment
	terms.Commission, terms.Amount = &price, price.NetAmount
	if err = validateTerms(terms); err != nil {
		t.Fatal("approved seller template is invalid", err)
	}
	if err = validateNewCommission(terms, now.Add(7*24*time.Hour), now); err != nil {
		t.Fatal(err)
	}
	without := terms
	without.Commission = nil
	if validateNewCommission(without, now.Add(time.Hour), now) == nil {
		t.Fatal("new offer bypassed commission")
	}
	if validateNewCommission(terms, now.Add(8*24*time.Hour), now) == nil || validateNewCommission(terms, now.Add(3*24*time.Hour), now.Add(2*24*time.Hour)) == nil {
		t.Fatal("accepted an excessive expiry or stale quote")
	}
	data, err := document(terms)
	if err != nil {
		t.Fatal(err)
	}
	product, err := decode[Product](initialListing(data))
	if err != nil || product.AmountMinor != "5249" || product.DisputeHours != 168 {
		t.Fatal("incorrect prospective listing defaults", err)
	}
	if err = listingCommission(product, data); err != nil {
		t.Fatal(err)
	}
	repriced, err := accountpricing.BuyerPrice("6000")
	if err != nil {
		t.Fatal(err)
	}
	product.Commission, product.AmountMinor = &repriced, repriced.TotalMinor
	if listingCommission(product, data) == nil {
		t.Fatal("consignment repriced without seller acceptance")
	}
	data["model"] = "buy_first"
	if err = listingCommission(product, data); err != nil {
		t.Fatal("buy-first resale price should be independent", err)
	}
	product.Commission = nil
	if listingCommission(product, data) == nil {
		t.Fatal("new listing release omitted buyer commission")
	}
}

func TestLegacyAgreementReadAndPublicPricePrivacy(t *testing.T) {
	t.Parallel()
	var terms SellerTerms
	if err := json.Unmarshal([]byte(`{"model":"consignment","amount":"8.7654321"}`), &terms); err != nil || terms.Commission != nil || terms.Amount != "8.7654321" {
		t.Fatal("legacy debt was repriced", err)
	}
	if lines := accountPriceLines(Product{AmountMinor: "1234"}); len(lines) != 0 {
		t.Fatal("invented legacy buyer fee")
	}
	price, err := accountpricing.BuyerPrice("4999")
	if err != nil {
		t.Fatal(err)
	}
	lines := accountPriceLines(Product{Commission: &price})
	if len(lines) != 2 || lines[0].AmountMinor != "4999" || lines[1].AmountMinor != "250" {
		t.Fatal("incorrect receipt breakdown", lines)
	}
	data, err := document(Product{Commission: &price})
	if err != nil {
		t.Fatal(err)
	}
	commission, ok := data["commission"].(map[string]any)
	if !ok || len(commission) != 4 {
		t.Fatal("public price contains private seller quote data")
	}
}
