package config

import (
	"errors"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// SupplierCatalogs selects one Nexus environment per application instance.
// Vendoria is deferred by the owner. Dashboard passwords are not loaded.
// Live purchasing stays disabled while the complete Sandbox flow is qualified.
func SupplierCatalogs(getenv func(string) string, environment string) ([]suppliers.Config, error) {
	mode := getenv("SUPPLIER_ENVIRONMENT")
	nexus, vendoria := getenv("NEXUS_SHOP_TOKEN"), getenv("VENDORIA_SHOP_TOKEN")
	if vendoria != "" {
		return nil, errors.New("supplier Vendoria integration is paused; omit VENDORIA_SHOP_TOKEN from application runtime configuration")
	}
	enabled := getenv("SUPPLIER_PURCHASES_ENABLED")
	if enabled != "" && enabled != "false" && enabled != "true" || enabled == "true" && (mode != "test" || environment == "production") {
		return nil, errors.New("supplier purchases require an isolated test environment")
	}
	if mode == "" || mode == "disabled" {
		if nexus != "" {
			return nil, errors.New("supplier tokens require an explicit SUPPLIER_ENVIRONMENT")
		}
		return nil, nil
	}
	if mode != "test" && mode != "production" || mode == "test" && environment == "production" || mode == "production" && environment != "production" {
		return nil, errors.New("supplier environment must match the isolated application environment")
	}
	id := suppliers.NexusSandbox
	if mode == "production" {
		id = suppliers.NexusProduction
	}
	cfg := suppliers.Config{Connection: id, Token: nexus, TestOrdersEnabled: enabled == "true"}
	if _, err := suppliers.New(cfg); err != nil {
		return nil, errors.New("supplier Nexus Shop token is missing or invalid")
	}
	return []suppliers.Config{cfg}, nil
}
