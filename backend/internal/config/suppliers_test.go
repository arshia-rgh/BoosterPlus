package config

import (
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func TestDeferredVendoriaCannotEnableRuntimeConnections(t *testing.T) {
	const token = "123:synthetic-deferred-token"
	for _, row := range []struct{ app, mode string }{{"test", "test"}, {"staging", "test"}, {"production", "production"}, {"production", "disabled"}} {
		values := map[string]string{"SUPPLIER_ENVIRONMENT": row.mode, "NEXUS_SHOP_TOKEN": "123:synthetic-nexus-token", "VENDORIA_SHOP_TOKEN": token}
		config, err := SupplierCatalogs(func(k string) string { return values[k] }, row.app)
		if err == nil || len(config) != 0 || strings.Contains(err.Error(), token) {
			t.Fatal("deferred provider activated or credentials exposed", err)
		}
		delete(values, "NEXUS_SHOP_TOKEN")
		if config, err = SupplierCatalogs(func(k string) string { return values[k] }, row.app); err == nil || len(config) != 0 {
			t.Fatal("deferred provider became the fallback", err)
		}
	}
}

func TestSupplierConfigurationSeparatesTestAndLiveWithBuyingDisabledByDefault(t *testing.T) {
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
		{"production", "", "", "123:synthetic-test-token"}, {"production", "production", "true", "123:synthetic-test-token"},
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

func TestSupplierTestBuyingRequiresExplicitIsolatedSwitch(t *testing.T) {
	values := map[string]string{"SUPPLIER_ENVIRONMENT": "test", "SUPPLIER_PURCHASES_ENABLED": "true", "NEXUS_SHOP_TOKEN": "123:synthetic-test-token"}
	configurations, err := SupplierCatalogs(func(k string) string { return values[k] }, "test")
	if err != nil || len(configurations) != 1 || !configurations[0].TestOrdersEnabled || configurations[0].Connection != suppliers.NexusSandbox {
		t.Fatal("isolated opt-in failed", err)
	}
}
