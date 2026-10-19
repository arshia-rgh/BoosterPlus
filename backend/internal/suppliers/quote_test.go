package suppliers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"testing"
)

func firstSourceRow(t *testing.T, raw []byte) string {
	t.Helper()
	var rows []json.RawMessage
	if err := json.Unmarshal(raw, &rows); err != nil || len(rows) == 0 {
		t.Fatal("invalid fixture", err)
	}
	return string(rows[0])
}

func nexusQuoteFixture(t *testing.T) (Product, string) {
	t.Helper()
	catalog, err := normalizeNexus(NexusSandbox, []byte(nexusCatalogFixture))
	if err != nil {
		t.Fatal(err)
	}
	var wire struct {
		Products []json.RawMessage `json:"products"`
	}
	if err = json.Unmarshal([]byte(nexusCatalogFixture), &wire); err != nil {
		t.Fatal(err)
	}
	row := strings.TrimSuffix(string(wire.Products[0]), "}") + `,"quote":{"amount":1.2,"fillableAmount":1.2,"totalPrice":0.618,"parts":[{"amount":1.2,"unitPrice":0.515,"totalPrice":0.618}]}}`
	return catalog.Products[0], row
}

func TestNexusQuoteUsesFullQuantityTotalAndReviewedRequirements(t *testing.T) {
	reviewed, raw := nexusQuoteFixture(t)
	client := fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/api/v1/products/test:coins:p1" || r.URL.Query().Get("amount") != "1.2" || r.URL.Query().Get("include") != "metadata" || r.URL.Query().Has("allowSplit") {
			t.Error("wrong non-split quote request")
		}
		reply(t, w, raw)
	})
	quote, err := client.QuoteOffer(t.Context(), reviewed, "default", "1.2")
	if err != nil || quote.TotalCost != "0.618" || quote.Connection != NexusSandbox {
		t.Fatal("quote lost exact total", err)
	}
	if price, e := quote.CustomerPrice(1500, ""); e != nil || price != "71" {
		t.Fatal("markup rounded before total", price, e)
	}
	if price, e := quote.CustomerPrice(1500, "250"); e != nil || price != "300" {
		t.Fatal("fixed unit override not multiplied exactly", price, e)
	}
}

func TestNexusQuoteRefusesPartialChangedOrMismatchedEvidence(t *testing.T) {
	reviewed, original := nexusQuoteFixture(t)
	for name, raw := range map[string]string{
		"partial":       strings.Replace(original, `"fillableAmount":1.2`, `"fillableAmount":1`, 1),
		"stock":         strings.TrimSuffix(original, "}") + `,"availableAmount":0.5}`,
		"wrong product": strings.Replace(original, `"id":"test:coins:p1"`, `"id":"test:coins:p2"`, 1),
		"part total":    strings.Replace(original, `"unitPrice":0.515,"totalPrice":0.618`, `"unitPrice":0.515,"totalPrice":0.7`, 1),
		"field":         strings.Replace(original, `"required":true`, `"required":false`, 1),
		"region":        strings.Replace(original, `"TR"`, `"EU"`, 1),
	} {
		t.Run(name, func(t *testing.T) {
			client := fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, _ *http.Request) { reply(t, w, raw) })
			if _, err := client.QuoteOffer(t.Context(), reviewed, "default", "1.2"); err == nil {
				t.Fatal("accepted changed/insufficient quote")
			}
		})
	}
}

func TestVendoriaQuoteRefreshesExactFormWithoutPretendingAtomicPriceCap(t *testing.T) {
	values := vendoriaCatalogFixture()
	catalog, err := normalizeVendoria(VendoriaTest, values)
	if err != nil {
		t.Fatal(err)
	}
	paths := map[string]string{}
	for i, path := range []string{"/api/services/30", "/api/categories/40", "/api/forms/50", "/api/products/60"} {
		paths[path] = firstSourceRow(t, values[i])
	}
	paths["/api/products/60"] = strings.Replace(paths["/api/products/60"], `"50":1.005`, `"50":1.125`, 1)
	calls := 0
	client := fixtureClient(t, VendoriaTest, func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Method != http.MethodGet || paths[r.URL.Path] == "" {
			t.Error("quote made a purchase or wrong lookup")
		}
		reply(t, w, paths[r.URL.Path])
	})
	quote, err := client.QuoteOffer(t.Context(), catalog.Products[0], "50", "3")
	if err != nil || calls != 4 || quote.TotalCost != "3.375" || quote.Offer.Cost != "1.125" {
		t.Fatal("did not refresh precise form total", err)
	}
	if price, e := quote.CustomerPrice(1500, ""); e != nil || price != "388" {
		t.Fatal("wrong fresh customer total", price, e)
	}
	// Removal, service closure and form changes must block even when yesterday's
	// catalog was available; no create/retry is performed by any quote path.
	for name, change := range map[string]func(){
		"removed":    func() { paths["/api/products/60"] = strings.Replace(paths["/api/products/60"], `"50":1.125,`, "", 1) },
		"closed":     func() { paths["/api/services/30"] = strings.Replace(paths["/api/services/30"], `false`, `true`, 1) },
		"wrong form": func() { paths["/api/forms/50"] = strings.Replace(paths["/api/forms/50"], `"id":50`, `"id":99`, 1) },
	} {
		t.Run(name, func(t *testing.T) {
			previous := map[string]string{}
			for key, value := range paths {
				previous[key] = value
			}
			change()
			if _, e := client.QuoteOffer(t.Context(), catalog.Products[0], "50", "3"); e == nil {
				t.Fatal("unavailable method accepted")
			}
			paths = previous
		})
	}
}

func TestQuoteRejectsUnreviewedInputWithoutRequests(t *testing.T) {
	reviewed, _ := nexusQuoteFixture(t)
	client := fixtureClient(t, NexusSandbox, func(_ http.ResponseWriter, _ *http.Request) { t.Error("invalid quote made request") })
	if _, err := client.QuoteOffer(t.Context(), reviewed, "default", "0.15"); !errors.Is(err, ErrInvalid) {
		t.Fatal(err)
	}
	reviewed.ReviewIssues = []string{"supplier_category_missing"}
	if _, err := client.QuoteOffer(t.Context(), reviewed, "default", "1.2"); !errors.Is(err, ErrInvalid) {
		t.Fatal(err)
	}
}
