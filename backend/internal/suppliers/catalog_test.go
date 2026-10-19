package suppliers

import (
	"errors"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
)

const nexusCatalogFixture = `{"games":[{"id":"test","name":"Test game","icon":""}],"categories":[{"id":"test:coins","name":"Coins"}],"products":[{"id":"test:coins:p1","name":"Coins 1","price":0.515,"type":"topup","deliveryData":[{"id":"player","type":"number","label":"Player ID","required":true,"min":1,"step":1}],"amountType":{"type":"multiple","min":0.1,"max":10,"step":0.1},"metadata":{"region":{"global":false,"countries":["TR"],"excludedCountries":["US"]},"countryPolicyKind":"allow"}},{"id":"test:coins:p2","name":"Code 2","price":0,"type":"cdkey","deliveryData":[],"amountType":{"type":"one"}}]}`

func vendoriaCatalogFixture() [4][]byte {
	return [4][]byte{
		[]byte(`[{"id":30,"name":"Test game","icon":"game.webp","isClosed":false}]`),
		[]byte(`[{"id":40,"name":"Turkey","serviceId":30}]`),
		[]byte(`[{"id":50,"name":"Login","serviceId":30,"fields":[{"id":"login","label":"Login","required":true,"type":"text"},{"id":"password","label":"Password","required":true,"type":"text"},{"id":"region","label":"Region","required":true,"type":"select","options":["TR","EU"]}],"hasRequest":true,"hasGooglePrompt":true,"hasGameExitRequest":true},{"id":51,"name":"ID","serviceId":30,"fields":[{"id":"id","label":"Player ID","type":"text","required":true,"regex":"^\\d+$"}],"hasRequest":false,"hasGooglePrompt":false}]`),
		[]byte(`[{"id":60,"name":"Diamonds","icon":"diamonds.webp","categoryId":40,"haveCDKey":false,"prices":{"50":1.005,"51":1.015}},{"id":61,"name":"Unavailable product","categoryId":40,"prices":{}}]`),
	}
}

func TestNexusNormalizationPreservesPriceQuantityAndRegion(t *testing.T) {
	catalog, err := normalizeNexus(NexusSandbox, []byte(nexusCatalogFixture))
	if err != nil {
		t.Fatal(err)
	}
	if len(catalog.Products) != 2 || catalog.Products[0].GameID != "test" || catalog.Products[0].Offers[0].Cost != "0.515" {
		t.Fatal("lost catalog detail")
	}
	first := catalog.Products[0]
	if first.Region.Global || first.Region.Countries[0] != "TR" || first.Region.PolicyKind != "allow" || first.Region.ExcludedCountries[0] != "US" {
		t.Fatal("lost regional constraints")
	}
	if first.Offers[0].Quantity.Min != "0.1" || first.Offers[0].SuggestedDelivery != "id" {
		t.Fatal("changed method/quantity")
	}
	if catalog.Products[1].Offers[0].Available || catalog.Products[1].Offers[0].SuggestedDelivery != "code" {
		t.Fatal("unpriced code product discarded or enabled")
	}
}
func TestVendoriaImportKeepsEveryProductAndMethod(t *testing.T) {
	catalog, err := normalizeVendoria(VendoriaTest, vendoriaCatalogFixture())
	if err != nil {
		t.Fatal(err)
	}
	if len(catalog.Products) != 2 || len(catalog.Products[0].Offers) != 2 || len(catalog.Products[1].Offers) != 0 {
		t.Fatal("dropped unpriced product or delivery method")
	}
	login := catalog.Products[0].Offers[0]
	ids := catalog.Products[0].Offers[1]
	if login.ID != "50" || login.Cost != "1.005" || login.SuggestedDelivery != "account" || !login.Fields[1].Secret || login.Fields[1].Transient || !login.CodeRequest || !login.GooglePrompt || !login.GameExit {
		t.Fatal("lost secure interactive method")
	}
	if ids.SuggestedDelivery != "id" || ids.Cost != "1.015" || ids.ID != "51" {
		t.Fatal("provider name incorrectly determined delivery")
	}
	if catalog.Products[0].Region.Global || len(catalog.Products[0].Region.Countries) > 0 {
		t.Fatal("invented eligibility from category name")
	}
}
func TestCatalogRejectsPartialOrAmbiguousRelationships(t *testing.T) {
	for _, raw := range []string{
		strings.Replace(nexusCatalogFixture, `"price":0.515`, `"price":0.515,"price":1`, 1),
		strings.Replace(nexusCatalogFixture, `"id":"test:coins:p1"`, `"id":"unknown:coins:p1"`, 1),
		strings.Replace(nexusCatalogFixture, `"id":"test:coins:p2"`, `"id":"test:coins:p1"`, 1),
	} {
		if _, err := normalizeNexus(NexusSandbox, []byte(raw)); !errors.Is(err, ErrEvidence) {
			t.Fatal("accepted invalid catalog")
		}
	}
	values := vendoriaCatalogFixture()
	values[2] = []byte(strings.Replace(string(values[2]), `"serviceId":30`, `"serviceId":99`, 1))
	if _, err := normalizeVendoria(VendoriaTest, values); !errors.Is(err, ErrEvidence) {
		t.Fatal("accepted cross-service method")
	}
}
func TestUnknownFieldsRemainVisibleForReview(t *testing.T) {
	raw := strings.Replace(nexusCatalogFixture, `"type":"number"`, `"type":"future-field"`, 1)
	catalog, err := normalizeNexus(NexusSandbox, []byte(raw))
	if err != nil {
		t.Fatal(err)
	}
	offer := catalog.Products[0].Offers[0]
	if len(offer.ReviewIssues) != 1 || offer.Fields[0].Kind != "future-field" {
		t.Fatal("silently dropped unknown field")
	}
	values := vendoriaCatalogFixture()
	values[2] = []byte(strings.Replace(string(values[2]), `"^\\d+$"`, `"(?=unsafe)"`, 1))
	catalog, err = normalizeVendoria(VendoriaTest, values)
	if err != nil {
		t.Fatal(err)
	}
	if len(catalog.Products[0].Offers[1].ReviewIssues) == 0 {
		t.Fatal("unsupported regex accepted")
	}
}

func TestDeletedSupplierCategoryRetainsPrivateUnpurchasableProduct(t *testing.T) {
	values := vendoriaCatalogFixture()
	values[3] = []byte(strings.ReplaceAll(string(values[3]), `"categoryId":40`, `"categoryId":999`))
	catalog, err := normalizeVendoria(VendoriaTest, values)
	if err != nil || len(catalog.Products) != 2 {
		t.Fatal("orphaned products must remain in the import", err)
	}
	for _, product := range catalog.Products {
		if product.GameID != "" || product.CategoryID != "999" || len(product.ReviewIssues) == 0 {
			t.Fatal("missing category was guessed or hidden")
		}
		for _, offer := range product.Offers {
			if offer.Available || len(offer.ReviewIssues) == 0 {
				t.Fatal("orphaned product enabled")
			}
		}
	}
}
func TestCatalogUsesBoundedBulkRequests(t *testing.T) {
	var calls atomic.Int32
	values := vendoriaCatalogFixture()
	client := fixtureClient(t, VendoriaTest, func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		paths := map[string]int{"/api/services": 0, "/api/categories": 1, "/api/forms": 2, "/api/products": 3}
		index, ok := paths[r.URL.Path]
		if !ok {
			t.Error("per-product request")
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if index == 3 && r.URL.Query().Get("prices") != "true" {
			t.Error("missing priced forms")
		}
		reply(t, w, string(values[index]))
	})
	if _, err := client.Catalog(t.Context()); err != nil || calls.Load() != 4 {
		t.Fatalf("bulk import failed: %v", err)
	}
}
