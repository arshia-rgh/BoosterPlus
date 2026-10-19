//go:build suppliertest

package suppliers

import (
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"testing"
)

// TestCapturedTestQuotes replays private GET captures through the production
// parser. It does not read tokens or call any real order endpoint.
func TestCapturedTestQuotes(t *testing.T) {
	root := os.Getenv("SUPPLIER_CATALOG_PROBE_DIR")
	if root == "" {
		t.Fatal("SUPPLIER_CATALOG_PROBE_DIR is required")
	}
	captures, err := os.OpenRoot(root)
	if err != nil {
		t.Fatal("capture directory unavailable")
	}
	t.Cleanup(func() {
		if e := captures.Close(); e != nil {
			t.Error(e)
		}
	})
	read := func(name string) []byte {
		t.Helper()
		raw, readErr := captures.ReadFile(name + ".json")
		if readErr != nil {
			t.Fatal("captured response missing")
		}
		return raw
	}
	nexus, err := normalizeNexus(NexusSandbox, read("nexus-sandbox-catalog"))
	if err != nil {
		t.Fatal(err)
	}
	detail := read("nexus-detail")
	var wire struct {
		ID string `json:"id"`
	}
	if err = json.Unmarshal(detail, &wire); err != nil {
		t.Fatal(err)
	}
	var product Product
	for _, p := range nexus.Products {
		if p.ID == wire.ID {
			product = p
			break
		}
	}
	client := fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Error("unexpected mutation")
		}
		reply(t, w, string(detail))
	})
	if _, err = client.QuoteOffer(t.Context(), product, "default", "1"); err != nil {
		t.Fatal("Nexus captured quote incompatible", err)
	}
	values := [4][]byte{read("vendoria-test-services"), read("vendoria-test-categories"), read("vendoria-test-forms"), read("vendoria-test-products")}
	catalog, err := normalizeVendoria(VendoriaTest, values)
	if err != nil {
		t.Fatal(err)
	}
	var form vendoriaForm
	var item vendoriaProduct
	if json.Unmarshal(read("vendoria-form"), &form) != nil || json.Unmarshal(read("vendoria-product"), &item) != nil {
		t.Fatal("invalid captures")
	}
	paths := map[string][]byte{"/api/services/" + strconv.FormatInt(form.ServiceID, 10): read("vendoria-service"), "/api/categories/" + strconv.FormatInt(item.CategoryID, 10): read("vendoria-category"), "/api/forms/" + strconv.FormatInt(form.ID, 10): read("vendoria-form"), "/api/products/" + strconv.FormatInt(item.ID, 10): read("vendoria-product")}
	for _, p := range catalog.Products {
		if p.ID == strconv.FormatInt(item.ID, 10) {
			product = p
			break
		}
	}
	client = fixtureClient(t, VendoriaTest, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || paths[r.URL.Path] == nil {
			t.Error("wrong captured request")
		}
		reply(t, w, string(paths[r.URL.Path]))
	})
	if _, err = client.QuoteOffer(t.Context(), product, strconv.FormatInt(form.ID, 10), "1"); err != nil {
		t.Fatal("Vendoria captured quote incompatible", err)
	}
}
