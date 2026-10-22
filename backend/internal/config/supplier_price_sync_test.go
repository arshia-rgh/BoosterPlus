package config

import (
	"testing"
	"time"
)

func TestSupplierPriceSyncIntervalDefaultsAndBounds(t *testing.T) {
	for raw, want := range map[string]time.Duration{"": 8 * time.Hour, "8h": 8 * time.Hour, "1h": time.Hour, "168h": 168 * time.Hour, "90m": 90 * time.Minute} {
		got, err := SupplierPriceSync(func(string) string { return raw })
		if err != nil || got != want {
			t.Fatal(raw, got, err)
		}
	}
	for _, raw := range []string{"59m", "169h", "8h30s", "-8h", "eight hours", "0"} {
		if _, err := SupplierPriceSync(func(string) string { return raw }); err == nil {
			t.Fatal("accepted", raw)
		}
	}
}
