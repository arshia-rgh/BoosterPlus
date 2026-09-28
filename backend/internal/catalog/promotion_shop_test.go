package catalog

import (
	"testing"
	"time"
)

func TestShopPromotionRequiresOneReviewedTargetAndMatchingVariantSyntax(t *testing.T) {
	t.Parallel()
	base := Promotion{Key: "shop", Title: "Synthetic shop offer", Enabled: true, Target: "shop", ProductID: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", ReleaseID: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", Variant: "pc-eu", StartsAt: time.Date(2026, time.September, 1, 0, 0, 0, 0, time.UTC), EndsAt: time.Date(2026, time.October, 1, 0, 0, 0, 0, time.UTC)}
	check := func(value Promotion) []Issue {
		c := discoveryFixture()
		c.Discovery.Capabilities[2].State = "active"
		c.Discovery.Promotions = []Promotion{value}
		return ValidateConfiguration(c, true)
	}
	if issues := check(base); len(issues) != 0 {
		t.Fatal("shop variant syntax", issues)
	}
	for _, change := range []func(*Promotion){
		func(p *Promotion) { p.ProductID = "not-an-id" },
		func(p *Promotion) { p.Package = "other" },
		func(p *Promotion) { p.ListingID = base.ProductID },
		func(p *Promotion) { p.CouponCode = "SALE"; p.CouponVersion = 1 },
		func(p *Promotion) { p.Variant = "bad key" },
		func(p *Promotion) { p.Target = "package"; p.Package = "pack"; p.ReleaseID = "" },
	} {
		p := base
		change(&p)
		if len(check(p)) == 0 {
			t.Fatal("mixed or unsafe promotion accepted", p)
		}
	}
}
