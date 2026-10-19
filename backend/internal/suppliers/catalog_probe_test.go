//go:build suppliertest

package suppliers

import (
	"os"
	"testing"
)

// TestCapturedTestCatalogs is an explicitly invoked, fail-closed compatibility
// probe for complete test catalogs fetched privately by the operator. It reads
// no credentials and performs no network writes. Counts are reported, not fixed.
func TestCapturedTestCatalogs(t *testing.T) {
	checkCapturedCatalogs(t, NexusSandbox, VendoriaTest)
}

// TestCapturedProductionCatalogs reads operator-captured GET responses only.
// It cannot create orders or enable production purchasing.
func TestCapturedProductionCatalogs(t *testing.T) {
	checkCapturedCatalogs(t, NexusProduction, VendoriaProduction)
}

func checkCapturedCatalogs(t *testing.T, nexusConnection, vendoriaConnection Connection) {
	t.Helper()
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
		raw, readErr := captures.ReadFile(name)
		if readErr != nil {
			t.Fatal("captured catalog missing")
		}
		return raw
	}
	nexus, err := normalizeNexus(nexusConnection, read(string(nexusConnection)+"-catalog.json"))
	if err != nil {
		t.Fatal("Nexus catalog failed normalization", err)
	}
	prefix := string(vendoriaConnection)
	values := [4][]byte{read(prefix + "-services.json"), read(prefix + "-categories.json"), read(prefix + "-forms.json"), read(prefix + "-products.json")}
	vendoria, err := normalizeVendoria(vendoriaConnection, values)
	if err != nil {
		t.Fatal("Vendoria catalog failed normalization", err)
	}
	for _, catalog := range []Catalog{nexus, vendoria} {
		available, review := 0, 0
		for _, product := range catalog.Products {
			for _, offer := range product.Offers {
				if offer.Available {
					available++
				}
				if len(offer.ReviewIssues) > 0 {
					review++
				}
			}
		}
		t.Logf("%s: %d products, %d available offers, %d offers requiring field/method review", catalog.Connection, len(catalog.Products), available, review)
	}
}
