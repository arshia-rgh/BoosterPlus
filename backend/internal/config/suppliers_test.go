package config

import (
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func TestSupplierConfigurationSeparatesTestAndLiveAndNeverEnablesBuying(t *testing.T) {
	for _, row := range []struct {
		app, mode string
		want      suppliers.Connection
	}{{"test", "test", suppliers.NexusSandbox}, {"staging", "test", suppliers.NexusSandbox}, {"production", "production", suppliers.NexusProduction}} {
		values := map[string]string{"SUPPLIER_ENVIRONMENT": row.mode, "NEXUS_SHOP_TOKEN": "123:synthetic-test-token"}
		config, err := SupplierCatalogs(func(k string) string { return values[k] }, row.app)
		if err != nil || len(config) != 1 || config[0].Connection != row.want || config[0].TestOrdersEnabled {
			t.Fatal("wrong catalog environment", err)
		}
	}
	for _, row := range []struct{ app, mode, enabled, token string }{
		{"production", "test", "", "123:synthetic-test-token"}, {"test", "production", "", "123:synthetic-test-token"},
		{"production", "", "", "123:synthetic-test-token"}, {"test", "test", "true", "123:synthetic-test-token"},
		{"production", "disabled", "true", ""},
		{"test", "unknown", "", "123:synthetic-test-token"}, {"test", "test", "", ""}, {"test", "test", "", "invalid"},
	} {
		values := map[string]string{"SUPPLIER_ENVIRONMENT": row.mode, "SUPPLIER_PURCHASES_ENABLED": row.enabled, "NEXUS_SHOP_TOKEN": row.token}
		if _, err := SupplierCatalogs(func(k string) string { return values[k] }, row.app); err == nil {
			t.Fatal("invalid supplier environment accepted")
		}
	}
	if config, err := SupplierCatalogs(func(string) string { return "" }, "production"); err != nil || len(config) != 0 {
		t.Fatal("disabled integration changed existing production", err)
	}
}
