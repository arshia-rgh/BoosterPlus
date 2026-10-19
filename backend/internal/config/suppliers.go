package config

import (
	"errors"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// SupplierCatalogs selects one environment per application instance. Dashboard
// passwords are not loaded. This stage grants catalog reads, never purchases.
func SupplierCatalogs(getenv func(string) string, environment string) ([]suppliers.Config, error) {
	mode := getenv("SUPPLIER_ENVIRONMENT")
	nexus, vendoria := getenv("NEXUS_SHOP_TOKEN"), getenv("VENDORIA_SHOP_TOKEN")
	if enabled := getenv("SUPPLIER_PURCHASES_ENABLED"); enabled != "" && enabled != "false" {
		return nil, errors.New("supplier purchases are not enabled in the catalog integration stage")
	}
	if mode == "" || mode == "disabled" {
		if nexus != "" || vendoria != "" {
			return nil, errors.New("supplier tokens require an explicit SUPPLIER_ENVIRONMENT")
		}
		return nil, nil
	}
	if mode != "test" && mode != "production" || mode == "test" && environment == "production" || mode == "production" && environment != "production" {
		return nil, errors.New("supplier environment must match the isolated application environment")
	}
	connections := []struct {
		id    suppliers.Connection
		token string
	}{{suppliers.NexusSandbox, nexus}, {suppliers.VendoriaTest, vendoria}}
	if mode == "production" {
		connections[0].id, connections[1].id = suppliers.NexusProduction, suppliers.VendoriaProduction
	}
	result := []suppliers.Config{}
	for _, value := range connections {
		if value.token == "" {
			continue
		}
		cfg := suppliers.Config{Connection: value.id, Token: value.token}
		if _, err := suppliers.New(cfg); err != nil {
			return nil, errors.New("supplier Shop token is invalid")
		}
		result = append(result, cfg)
	}
	if len(result) == 0 {
		return nil, errors.New("supplier environment requires at least one Shop token")
	}
	return result, nil
}
