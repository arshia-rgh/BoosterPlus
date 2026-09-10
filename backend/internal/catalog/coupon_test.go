package catalog

import (
	"math/big"
	"testing"
	"time"
)

func couponFixture(now time.Time) CouponDefinition {
	return CouponDefinition{Code: "TEST50", Name: "Synthetic coupon", Enabled: true, Kind: "percentage", Value: "50", Currency: "USD", StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), MinimumSubtotal: "0", Categories: []string{"boosting"}, CustomerLimit: 1}
}
func TestCouponExactEligibilityAndRounding(t *testing.T) {
	t.Parallel()
	now := time.Now()
	cases := []struct {
		name                                    string
		change                                  func(*CouponDefinition)
		subtotal, currency, game, service, pack string
		valid                                   bool
		amount                                  string
	}{
		{"round after discount", func(_ *CouponDefinition) {}, "100.5", "USD", "game", "service", "", true, "50"},
		{"fixed floor", func(c *CouponDefinition) { c.Kind = "fixed"; c.Value = "1000" }, "100.5", "USD", "game", "service", "", true, "1"},
		{"percent floor", func(c *CouponDefinition) { c.Value = "100" }, "100.5", "USD", "game", "service", "", true, "1"},
		{"maximum discount", func(c *CouponDefinition) { c.MaximumDiscount = "10" }, "100.5", "USD", "game", "service", "", true, "91"},
		{"minimum subtotal", func(c *CouponDefinition) { c.MinimumSubtotal = "101" }, "100.5", "USD", "game", "service", "", false, ""},
		{"starts inclusive", func(c *CouponDefinition) { c.StartsAt = now }, "100", "USD", "game", "service", "", true, "50"},
		{"ends exclusive", func(c *CouponDefinition) { c.EndsAt = now }, "100", "USD", "game", "service", "", false, ""},
		{"not started", func(c *CouponDefinition) { c.StartsAt = now.Add(time.Minute) }, "100", "USD", "game", "service", "", false, ""},
		{"disabled", func(c *CouponDefinition) { c.Enabled = false }, "100", "USD", "game", "service", "", false, ""},
		{"currency mismatch", func(_ *CouponDefinition) {}, "100", "EUR", "game", "service", "", false, ""},
		{"game mismatch", func(c *CouponDefinition) { c.Games = []string{"other"} }, "100", "USD", "game", "service", "", false, ""},
		{"service mismatch", func(c *CouponDefinition) { c.Games = []string{"game"}; c.Services = []string{"other"} }, "100", "USD", "game", "service", "", false, ""},
		{"package mismatch", func(c *CouponDefinition) { c.Games = []string{"game"}; c.Packages = []string{"pack"} }, "100", "USD", "game", "service", "", false, ""},
		{"matching offer", func(c *CouponDefinition) {
			c.Games = []string{"game"}
			c.Services = []string{"service"}
			c.Packages = []string{"pack"}
		}, "100", "USD", "game", "service", "pack", true, "50"},
		{"same keys cannot overwrite scope", func(c *CouponDefinition) {
			c.Games = []string{"other"}
			c.Services = []string{"same"}
			c.Packages = []string{"same"}
		}, "100", "USD", "same", "same", "same", false, ""},
		{"one minor unit", func(_ *CouponDefinition) {}, "1", "USD", "game", "service", "", false, ""},
		{"no effective discount", func(c *CouponDefinition) { c.Value = "0.000001" }, "100", "USD", "game", "service", "", false, ""},
		{"resale excluded", func(c *CouponDefinition) { c.Categories = []string{"account_resale"} }, "100", "USD", "game", "service", "", false, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c := couponFixture(now)
			tc.change(&c)
			subtotal, ok := new(big.Rat).SetString(tc.subtotal)
			if !ok {
				t.Fatal("bad fixture")
			}
			total, valid := couponAmount(c, subtotal, tc.currency, tc.game, tc.service, tc.pack, "boosting", now)
			if valid != tc.valid {
				t.Fatal(valid)
			}
			if valid && rounded(total).String() != tc.amount {
				t.Fatal(total, tc.amount)
			}
		})
	}
}
func TestCouponPolicyValidation(t *testing.T) {
	t.Parallel()
	now := time.Now()
	cases := map[string]func(*CouponDefinition){
		"lowercase code": func(c *CouponDefinition) { c.Code = "coupon" }, "short code": func(c *CouponDefinition) { c.Code = "AB" }, "unicode code": func(c *CouponDefinition) { c.Code = "ＣＯＤＥ" }, "negative": func(c *CouponDefinition) { c.Value = "-1" }, "fractional fixed": func(c *CouponDefinition) { c.Kind = "fixed"; c.Value = "1.5" }, "over 100": func(c *CouponDefinition) { c.Value = "100.01" }, "currency": func(c *CouponDefinition) { c.Currency = "BTC" }, "zero cap": func(c *CouponDefinition) { c.MaximumDiscount = "0" }, "negative min": func(c *CouponDefinition) { c.MinimumSubtotal = "-1" }, "window": func(c *CouponDefinition) { c.EndsAt = c.StartsAt }, "huge limit": func(c *CouponDefinition) { c.GlobalLimit = 1000001 }, "negative limit": func(c *CouponDefinition) { c.CustomerLimit = -1 }, "scope missing game": func(c *CouponDefinition) { c.Services = []string{"boost"} }, "duplicate scope": func(c *CouponDefinition) { c.Games = []string{"same", "same"} }, "no category": func(c *CouponDefinition) { c.Categories = nil }, "bad category": func(c *CouponDefinition) { c.Categories = []string{"wallet"} },
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			c := couponFixture(now)
			change(&c)
			if len(validateCoupon(c)) == 0 {
				t.Fatal("invalid policy accepted")
			}
		})
	}
}
