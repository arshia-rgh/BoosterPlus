package catalog

import (
	"testing"
	"time"
)

func TestPromotionPolicyRejectsInventedAndAmbiguousOffers(t *testing.T) {
	t.Parallel()
	c := discoveryFixture()
	p := Promotion{Key: "reviewed", Title: "Reviewed offer", Target: "package", Package: c.Packages[0].Key, Variant: c.Packages[0].Variants[0].Key, StartsAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), EndsAt: time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC), Enabled: true}
	c.Discovery.Promotions = []Promotion{p}
	if issues := ValidateConfiguration(c, true); len(issues) > 0 {
		t.Fatal(issues)
	}
	cases := []struct {
		name   string
		change func(*Promotion)
	}{
		{"reversed interval", func(p *Promotion) { p.EndsAt = p.StartsAt }},
		{"unsupported shop", func(p *Promotion) { p.Target = "shop" }},
		{"unreviewed coupon", func(p *Promotion) { p.CouponCode = "COUPON" }},
		{"unknown variant", func(p *Promotion) { p.Variant = "absent" }},
		{"negative priority", func(p *Promotion) { p.Priority = -1 }},
		{"excessive priority", func(p *Promotion) { p.Priority = 101 }},
		{"false quantity", func(p *Promotion) { p.ShowQuantity = true }},
		{"ambiguous target", func(p *Promotion) { p.ListingID = "00000000-0000-4000-8000-000000000000" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			next := clone(c)
			tc.change(&next.Discovery.Promotions[0])
			if len(ValidateConfiguration(next, true)) == 0 {
				t.Fatal("invalid promotion accepted")
			}
		})
	}
}
