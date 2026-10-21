package supply

import "testing"

func TestListingFilterKeepsOnlyMatchingCurrentOffers(t *testing.T) {
	product := ProductView{ID: "mixed", Offers: []OfferView{
		{ID: "prepared", Pricing: Pricing{ShopProductID: "private-or-published"}},
		{ID: "new", Pricing: Pricing{}},
	}}
	for _, value := range []string{"", "added", "not_added"} {
		if !validListingFilter(value) {
			t.Fatal("valid filter rejected", value)
		}
	}
	for _, value := range []string{"published", "unknown", " added"} {
		if validListingFilter(value) {
			t.Fatal("unsupported filter accepted", value)
		}
	}
	missing := filterListingOffers(product, "not_added")
	added := filterListingOffers(product, "added")
	if len(missing.Offers) != 1 || missing.Offers[0].ID != "new" || len(added.Offers) != 1 || added.Offers[0].ID != "prepared" {
		t.Fatal("mixed product lost its unprepared offer")
	}
	if len(product.Offers) != 2 || len(filterListingOffers(product, "").Offers) != 2 {
		t.Fatal("filter mutated the source or the all-offers view")
	}
	if len(filterListingOffers(ProductView{}, "not_added").Offers) != 0 {
		t.Fatal("filter invented a preparable offer")
	}
}
