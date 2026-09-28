//go:build integration

package integration

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
)

func TestShopPromotionReleaseStockAndPrice(t *testing.T) {
	f, store, product, input := shopPurchaseFixture(t)
	ctx := t.Context()
	var err error
	definition := product.Definition
	definition.Variants[0].MinQuantity = 2
	definition.Variants[0].MaxQuantity = 3
	product, err = store.Save(ctx, f.base.admin, product.ID, product.Version, definition)
	if err != nil {
		t.Fatal(err)
	}
	product, err = store.Change(ctx, f.base.admin, product.ID, product.Version, "publish")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	promotion := catalog.Promotion{Key: "shop_offer", Title: "Synthetic featured item", Description: "Isolated stock-backed offer", Enabled: true, Target: "shop", ProductID: product.ID, ReleaseID: product.CurrentRelease, Variant: "fixture", StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), ShowQuantity: true}
	config := f.base.game.Configuration
	config.Discovery.Promotions = []catalog.Promotion{promotion}
	saveDiscovery(t, f.base, config)
	read := func(count int) catalog.DiscoveryView {
		t.Helper()
		out, e := f.base.catalog.DiscoveryProjection(ctx, f.base.game.Slug, now)
		if e != nil || len(out.Promotions) != count {
			t.Fatalf("offers count=%d: %v %+v", count, e, out.Promotions)
		}
		return out
	}
	offer := read(1).Promotions[0]
	if offer.AmountMinor != "2468" || offer.Quantity != 2 || offer.ProductID != product.ID || offer.ReleaseID != product.CurrentRelease || offer.Remaining == nil || *offer.Remaining != 3 {
		t.Fatal("unbound offer", offer)
	}
	for _, at := range []time.Time{now.Add(-2 * time.Hour), now.Add(2 * time.Hour)} {
		out, e := f.base.catalog.DiscoveryProjection(ctx, f.base.game.Slug, at)
		if e != nil || len(out.Promotions) != 0 {
			t.Fatal("offer interval", e)
		}
	}
	product, err = store.Change(ctx, f.base.admin, product.ID, product.Version, "pause")
	if err != nil {
		t.Fatal(err)
	}
	read(0)
	product, err = store.Change(ctx, f.base.admin, product.ID, product.Version, "resume")
	if err != nil {
		t.Fatal(err)
	}
	read(1)
	// Private draft edits cannot change the displayed offer or purchase price.
	definition.Variants[0].UnitAmountMinor = "9999"
	product, err = store.Save(ctx, f.base.admin, product.ID, product.Version, definition)
	if err != nil {
		t.Fatal(err)
	}
	if read(1).Promotions[0].AmountMinor != "2468" {
		t.Fatal("draft price leaked")
	}
	input.ReleaseID, input.Quantity, input.ExpectedAmount = product.CurrentRelease, 2, "2468"
	if _, err = store.Reserve(ctx, f.base.buyer, f.base.game.Slug, product.ID, input); err != nil {
		t.Fatal(err)
	}
	read(0) // One remaining unit does not satisfy the released minimum of two.
	for _, filter := range []string{"available", "unavailable"} {
		rows, e := store.List(ctx, f.base.admin, shop.Filters{Availability: filter})
		expected := 0
		if filter == "unavailable" {
			expected = 1
		}
		if e != nil || len(rows.Items) != expected {
			t.Fatal("minimum quantity filter", filter, e, rows)
		}
	}
	// Restored finite inventory can be shown again; publishing a different release retires the old reviewed offer.
	product, err = store.SetStock(ctx, f.base.admin, product.ID, shop.StockChange{Version: product.Version, StockVersion: product.Stocks[0].Version + 1, VariantKey: "fixture", Total: 5, Reason: "More synthetic inventory after reservation."})
	if err != nil {
		t.Fatal(err)
	}
	read(1)
	_, err = store.Change(ctx, f.base.admin, product.ID, product.Version, "publish")
	if err != nil {
		t.Fatal(err)
	}
	read(0)
}
func TestShopPromotionInvalidTargetsAndAvailabilityBoundaries(t *testing.T) {
	f, store, product, _ := shopPurchaseFixture(t)
	ctx := t.Context()
	now := time.Now().UTC()
	for _, change := range []func(*catalog.Promotion){
		func(p *catalog.Promotion) { p.ProductID = uuid.NewString() },
		func(p *catalog.Promotion) { p.ReleaseID = uuid.NewString() },
		func(p *catalog.Promotion) { p.Variant = "missing" },
		func(p *catalog.Promotion) { p.CouponCode = "INVALID"; p.CouponVersion = 1 },
		func(p *catalog.Promotion) { p.ListingID = uuid.NewString() },
	} {
		p := catalog.Promotion{Key: "shop_offer", Title: "Synthetic invalid offer", Enabled: true, Target: "shop", ProductID: product.ID, ReleaseID: product.CurrentRelease, Variant: "fixture", StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour)}
		change(&p)
		config := f.base.game.Configuration
		config.Discovery.Promotions = []catalog.Promotion{p}
		if len(catalog.ValidateConfiguration(config, true)) > 0 {
			continue
		}
		saved, err := f.base.catalog.Mutate(ctx, f.base.admin, f.base.game.ID, "save", catalog.Change{Revision: f.base.game.Revision, Configuration: config})
		if err != nil {
			t.Fatal(err)
		}
		f.base.game = saved
		if _, err = f.base.catalog.Mutate(ctx, f.base.admin, saved.ID, "publish", catalog.Change{Revision: saved.Revision}); err == nil {
			t.Fatal("invalid offer published")
		}
	}
	if _, err := store.List(ctx, f.base.admin, shop.Filters{Availability: "invented"}); err == nil {
		t.Fatal("unknown filter accepted")
	}
	if _, err := store.List(ctx, f.base.buyer, shop.Filters{Availability: "available"}); err == nil {
		t.Fatal("customer accessed staff availability")
	}
	rows, err := store.List(ctx, f.base.admin, shop.Filters{Availability: "available"})
	if err != nil || len(rows.Items) != 1 {
		t.Fatal("available stock", err, rows)
	}
}

func TestShopAvailabilityUsesPublishedCapabilityAndCurrentVariantRelease(t *testing.T) {
	f, store, product, input := shopPurchaseFixture(t)
	ctx := t.Context()
	available := func(want int) {
		t.Helper()
		rows, err := store.List(ctx, f.base.admin, shop.Filters{Availability: "available"})
		if err != nil || len(rows.Items) != want {
			t.Fatal("available products", err, len(rows.Items), want)
		}
	}
	available(1)
	config := f.base.game.Configuration
	for i := range config.Discovery.Capabilities {
		if config.Discovery.Capabilities[i].Service == "shop" {
			config.Discovery.Capabilities[i].State = "off"
		}
	}
	saved, err := f.base.catalog.Mutate(ctx, f.base.admin, f.base.game.ID, "save", catalog.Change{Revision: f.base.game.Revision, Configuration: config})
	if err != nil {
		t.Fatal(err)
	}
	available(1) // A private draft cannot close a currently released service.
	f.base.game = saved
	saveDiscovery(t, f.base, config)
	available(0)
	for i := range config.Discovery.Capabilities {
		if config.Discovery.Capabilities[i].Service == "shop" {
			config.Discovery.Capabilities[i].State = "active"
		}
	}
	saveDiscovery(t, f.base, config)
	available(1)
	paused, err := f.base.catalog.Mutate(ctx, f.base.admin, f.base.game.ID, "pause", catalog.Change{Revision: f.base.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	available(0)
	f.base.game, err = f.base.catalog.Mutate(ctx, f.base.admin, paused.ID, "resume", catalog.Change{Revision: paused.Revision})
	if err != nil {
		t.Fatal(err)
	}
	available(1)
	product, err = store.Change(ctx, f.base.admin, product.ID, product.Version, "pause")
	if err != nil {
		t.Fatal(err)
	}
	available(0)
	product, err = store.Change(ctx, f.base.admin, product.ID, product.Version, "resume")
	if err != nil {
		t.Fatal(err)
	}
	available(1)
	stock, err := f.base.auth.client.ShopStock.Query().Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.base.auth.client.ShopStock.UpdateOne(stock).SetReleaseID(uuid.NewString()).Save(ctx); err != nil {
		t.Fatal(err)
	}
	available(0)
	if _, err = store.Reserve(ctx, f.base.buyer, f.base.game.Slug, product.ID, input); err == nil {
		t.Fatal("obsolete stock accepted a reservation")
	}
}
