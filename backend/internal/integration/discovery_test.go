//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/submissions"
)

func saveDiscovery(t *testing.T, f *orderFixture, config catalog.Configuration) {
	t.Helper()
	var err error
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: config})
	if err != nil {
		t.Fatal(err)
	}
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "publish", catalog.Change{Revision: f.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDiscoveryPauseDirectPurchaseAndExistingReplay(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	original := f.input("package")
	purchase, err := f.store.Create(ctx, f.buyer, original)
	if err != nil {
		t.Fatal(err)
	}
	c := f.game.Configuration
	c.Discovery = &catalog.Discovery{Capabilities: catalog.Capabilities(c, false)}
	c.Discovery.Capabilities[0].State = "paused"
	c.Discovery.Capabilities[0].Reason = "Reviewing capacity."
	saveDiscovery(t, f, c)
	if _, err = f.store.Create(ctx, f.buyer, f.input("package")); !errors.Is(err, orders.ErrConflict) {
		t.Fatal("paused direct purchase", err)
	}
	replay, err := f.store.Create(ctx, f.buyer, original)
	if err != nil || replay.Order.ID != purchase.Order.ID || replay.Contract.ID != purchase.Contract.ID {
		t.Fatal("existing request lost", err)
	}
	if _, err = f.store.Reorder(ctx, f.buyer, purchase.Order.ID); !errors.Is(err, orders.ErrConflict) {
		t.Fatal("paused reorder", err)
	}
	v, err := f.catalog.DiscoveryProjection(ctx, f.game.Slug, time.Now())
	if err != nil || v.Capabilities[0].State != "paused" || v.Capabilities[1].State != "active" {
		t.Fatal("service isolation", v, err)
	}
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	f.catalog.Register(mux)
	r := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/catalog/games/"+f.game.Slug+"/discovery", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code != http.StatusOK || w.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("public discovery transport", w.Code, w.Body.String())
	}
	for _, input := range []orders.FavoriteInput{
		{Kind: "game", Slug: f.game.Slug},
		{Kind: "package", Slug: f.game.Slug, Package: "pack"},
	} {
		saved, saveErr := f.store.SaveFavorite(ctx, f.buyer, input)
		if saveErr != nil || saved.Available != (input.Kind == "game") {
			t.Fatal("favorite availability confused game and boost service", saved, saveErr)
		}
	}
	list, err := f.store.Favorites(ctx, f.buyer, "")
	if err != nil || len(list.Favorites) != 2 {
		t.Fatal("favorites missing", err)
	}
	for _, saved := range list.Favorites {
		if saved.Available != (saved.Kind == "game") {
			t.Fatal("saved game lost its available accounts service", saved)
		}
	}
	c.Discovery.Capabilities[1].State = "off"
	saveDiscovery(t, f, c)
	list, err = f.store.Favorites(ctx, f.buyer, "")
	if err != nil {
		t.Fatal(err)
	}
	for _, saved := range list.Favorites {
		if saved.Available {
			t.Fatal("favorite with no active service marked available", saved)
		}
	}
}

func TestDiscoveryPromotionsReviewedTargetsTimeCapacityAndPrivacy(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	now := time.Now().UTC()
	coupon, err := f.catalog.SaveCoupon(ctx, f.admin, "", 0, couponPolicy())
	if err != nil {
		t.Fatal(err)
	}
	c := f.game.Configuration
	active := catalog.Promotion{Key: "active", Title: "Reviewed offer", Enabled: true, Target: "package", Package: "pack", Variant: "basic", CouponCode: coupon.Definition.Code, CouponVersion: coupon.Version, StartsAt: now.Add(-time.Minute), EndsAt: now.Add(30 * time.Minute), ShowQuantity: true}
	future := active
	future.Key = "future"
	future.Title = "Private future title"
	future.StartsAt = now.Add(10 * time.Minute)
	disabled := active
	disabled.Key = "disabled"
	disabled.Enabled = false
	disabled.CouponCode = "PRIVATECODE"
	disabled.Title = "Private disabled title"
	c.Discovery = &catalog.Discovery{Capabilities: catalog.Capabilities(c, false), Promotions: []catalog.Promotion{active, future, disabled}}
	saveDiscovery(t, f, c)
	published, err := f.catalog.Published(ctx, f.game.Slug)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(published)
	if err != nil {
		t.Fatal(err)
	}
	for _, secret := range []string{"PRIVATECODE", "Private future title", "Private disabled title", `"promotions"`} {
		if strings.Contains(string(raw), secret) {
			t.Fatal("raw release leaked promotion", secret)
		}
	}
	view, err := f.catalog.DiscoveryProjection(ctx, f.game.Slug, now)
	if err != nil || len(view.Promotions) != 1 {
		t.Fatal("active promotion", view, err)
	}
	offer := view.Promotions[0]
	if offer.AmountMinor != "617" || offer.OriginalMinor != "1234" || offer.Remaining == nil || *offer.Remaining != 2 {
		t.Fatal("incorrect promotion evidence", offer)
	}
	if v, e := f.catalog.DiscoveryProjection(ctx, f.game.Slug, active.StartsAt); e != nil || len(v.Promotions) != 1 {
		t.Fatal("inclusive start", e)
	}
	if v, e := f.catalog.DiscoveryProjection(ctx, f.game.Slug, active.EndsAt); e != nil || len(v.Promotions) != 0 {
		t.Fatal("exclusive end", e)
	}
	// Existing capacity and claim fences remain the only reservation mechanism.
	f.create(t, "package")
	f.create(t, "package")
	if v, e := f.catalog.DiscoveryProjection(ctx, f.game.Slug, now); e != nil || len(v.Promotions) != 0 {
		t.Fatal("exhausted promotion remained", e)
	}
	c.Discovery.Promotions[0].CouponVersion++
	d, e := f.catalog.Mutate(ctx, f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = f.catalog.Mutate(ctx, f.admin, f.game.ID, "publish", catalog.Change{Revision: d.Revision}); e == nil {
		t.Fatal("stale/exhausted offer published")
	}
	// Changing a draft does not replace the already published release.
	again, e := f.catalog.Published(ctx, f.game.Slug)
	if e != nil || again.ID != f.game.CurrentRelease {
		t.Fatal("failed publication replaced release", e)
	}
	if _, e = f.catalog.Mutate(ctx, f.buyer, f.game.ID, "publish", catalog.Change{Revision: d.Revision}); e == nil {
		t.Fatal("customer published offer")
	}
}

func TestDiscoveryAccountPausePreservesPublishedHistoryAndReplay(t *testing.T) {
	f := resaleDB(t, "consignment")
	f.publish(t)
	ctx := t.Context()
	input := f.reserveInput()
	purchase, err := f.resale.Reserve(ctx, f.base.buyer, f.listing.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	c := f.intake.game.Configuration
	c.Discovery = &catalog.Discovery{Capabilities: catalog.Capabilities(c, false)}
	c.Discovery.Capabilities[1].State = "paused"
	c.Discovery.Capabilities[1].Reason = "Inventory review."
	saveDiscovery(t, f.intake.orderFixture, c)
	replay, err := f.resale.Reserve(ctx, f.base.buyer, f.listing.ID, input)
	if err != nil || replay.Order.ID != purchase.Order.ID {
		t.Fatal("paused account replay", err)
	}
	listing, err := f.resale.Published(ctx, f.listing.ID)
	if err != nil || listing.State != "reserved" || listing.ReleaseID != input.ReleaseID {
		t.Fatal("reserved public history disappeared", err)
	}
}

func TestDiscoveryAccountPauseBlocksNewIntakeAndReservation(t *testing.T) {
	f := resaleDB(t, "consignment")
	f.publish(t)
	ctx := t.Context()
	c := f.intake.game.Configuration
	c.Discovery = &catalog.Discovery{Capabilities: catalog.Capabilities(c, false)}
	c.Discovery.Capabilities[1].State = "off"
	saveDiscovery(t, f.intake.orderFixture, c)
	if _, err := f.resale.Reserve(ctx, f.base.buyer, f.listing.ID, f.reserveInput()); !errors.Is(err, resale.ErrConflict) {
		t.Fatal("closed accounts accepted payment contract", err)
	}
	input := f.intake.input
	input.RequestKey = uuid.NewString()
	input.ReleaseID = f.intake.game.CurrentRelease
	if _, err := f.intake.intake.Create(ctx, f.intake.buyer, input); !errors.Is(err, submissions.ErrConflict) {
		t.Fatal("closed accounts accepted intake", err)
	}
	listing, err := f.resale.Published(ctx, f.listing.ID)
	if err != nil || listing.State != "unavailable" {
		t.Fatal("closed listing claimed availability", err)
	}
}

func TestDiscoveryCatalogListUsesBoundedReleaseQueries(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	for i := range 5 {
		d, err := f.catalog.Create(ctx, f.admin, fmt.Sprintf("batch-%d", i), catalogConfig())
		if err != nil {
			t.Fatal(err)
		}
		if _, err = f.catalog.Mutate(ctx, f.admin, d.ID, "publish", catalog.Change{Revision: d.Revision}); err != nil {
			t.Fatal(err)
		}
	}
	var queries int
	f.auth.client.Intercept(ent.InterceptFunc(func(next ent.Querier) ent.Querier {
		return ent.QuerierFunc(func(ctx context.Context, query ent.Query) (ent.Value, error) {
			queries++
			return next.Query(ctx, query)
		})
	}))
	listing, err := f.catalog.List(ctx, nil, false, "")
	if err != nil || len(listing.Games) != 6 || queries != 2 {
		t.Fatal("catalog list must batch releases", len(listing.Games), queries, err)
	}
}

func TestDiscoveryMigrationUpgradeRollbackAndReadiness(t *testing.T) {
	db := testDB(t)
	ctx := t.Context()
	r := runner(t, db)
	if err := r.Apply(ctx, 26); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("old schema passed new readiness")
	}
	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err != nil {
		t.Fatal(err)
	}
	if err := r.Down(ctx, 1); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("rolled-back indexes passed readiness")
	}
	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err != nil {
		t.Fatal(err)
	}
}
