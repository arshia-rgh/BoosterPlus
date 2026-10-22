package config

import (
	"errors"
	"time"
)

// DefaultSupplierPriceSync is the owner's eight-hour supplier price check cadence.
const DefaultSupplierPriceSync = 8 * time.Hour

// SupplierPriceSync reads the optional cadence for automatic supplier price
// checks. Bounds keep provider reads polite and stale prices short-lived.
func SupplierPriceSync(getenv func(string) string) (time.Duration, error) {
	raw := getenv("SUPPLIER_PRICE_SYNC_INTERVAL")
	if raw == "" {
		return DefaultSupplierPriceSync, nil
	}
	value, err := time.ParseDuration(raw)
	if err != nil || value < time.Hour || value > 7*24*time.Hour || value%time.Minute != 0 {
		return 0, errors.New("SUPPLIER_PRICE_SYNC_INTERVAL must be whole minutes between 1h and 168h")
	}
	return value, nil
}
