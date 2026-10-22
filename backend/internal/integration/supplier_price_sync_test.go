//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproductevent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproductrelease"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpricerun"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/supply"
)

func TestSupplierPriceSyncMigrationStartupReadiness(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	if err := r.Apply(t.Context(), 48); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err == nil {
		t.Fatal("schema48 must not start a schema49 application")
	}
	if err := r.Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err != nil {
		t.Fatal("migrated price sync must pass actual API/worker startup readiness:", err)
	}
	// The CLI may step back over 49: it removes only automatic check records.
	if err := r.Down(t.Context(), 1); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err == nil {
		t.Fatal("schema48 after rollback must not start a schema49 application")
	}
	if err := r.Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err != nil {
		t.Fatal("reapplied migration must pass readiness:", err)
	}
	if _, err := db.ExecContext(t.Context(), "ALTER TABLE supplier_price_reviews MODIFY COLUMN attention INT NOT NULL DEFAULT 0"); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err == nil || !strings.Contains(err.Error(), "supplier_price_reviews.attention") {
		t.Fatal("readiness must still reject schema drift:", err)
	}
}

func priceSyncJob(t *testing.T, window int64, batch int) jobs.Job {
	t.Helper()
	raw, err := json.Marshal(map[string]any{"connection": "nexus-sandbox", "window": window, "batch": batch})
	if err != nil {
		t.Fatal(err)
	}
	return jobs.Job{Payload: raw}
}

// markupPublication republishes the fixture through the normal editor path
// with the default 15% markup and no selling-price override.
func markupPublication(t *testing.T, f checkoutFixture) checkoutFixture {
	t.Helper()
	ctx := t.Context()
	base := f.payment.base
	row, err := base.auth.client.SupplierPrice.Query().Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	price, err := f.library.SetPrice(ctx, base.admin, suppliers.NexusSandbox, f.preparation.ProductID, "default", supply.PriceInput{Version: row.Version, ImportID: f.preparation.ImportID, GameID: base.game.ID, Region: "Test region", DeliveryMethod: "id"})
	if err != nil {
		t.Fatal(err)
	}
	conn, err := base.auth.client.SupplierConnection.Get(ctx, string(suppliers.NexusSandbox))
	if err != nil {
		t.Fatal(err)
	}
	input := f.preparation
	input.PriceVersion, input.ConnectionVersion, input.ShopVersion = price.Version, conn.Version, f.product.Version
	refreshed, err := f.shop.PrepareSupplier(ctx, base.admin, input)
	if err != nil {
		t.Fatal("refresh", err)
	}
	refreshed.Definition.Reviewed = true
	if refreshed, err = f.shop.Save(ctx, base.admin, refreshed.ID, refreshed.Version, refreshed.Definition); err != nil {
		t.Fatal(err)
	}
	if f.product, err = f.shop.Change(ctx, base.admin, refreshed.ID, refreshed.Version, "publish"); err != nil {
		t.Fatal(err)
	}
	if f.product.Definition.Variants[0].UnitAmountMinor != "116" {
		t.Fatal("15% markup on 1.005 rounds half up once", f.product.Definition.Variants[0].UnitAmountMinor)
	}
	return f
}

func supplierQuote(f checkoutFixture, total suppliers.Decimal) {
	f.provider.quote.TotalCost = total
	f.provider.quote.Offer.Cost = total
}

func TestSupplierPriceSyncRepricesMarkupThroughNewRelease(t *testing.T) {
	f := markupPublication(t, nexusCheckoutFixture(t, false))
	ctx := t.Context()
	base := f.payment.base
	client := base.auth.client
	// An accepted unpaid order keeps its own contract and snapshot.
	reserved, err := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, f.acceptance(f.quote(t)))
	if err != nil {
		t.Fatal("reserve", err)
	}
	accepted, err := client.Order.Get(ctx, reserved.OrderID)
	if err != nil {
		t.Fatal(err)
	}
	contract, err := client.OrderContract.Get(ctx, accepted.CurrentContract)
	if err != nil {
		t.Fatal(err)
	}
	oldRelease, err := client.ShopProductRelease.Get(ctx, f.product.CurrentRelease)
	if err != nil {
		t.Fatal(err)
	}
	oldBinding, err := client.SupplierBinding.Get(ctx, f.product.CurrentRelease)
	if err != nil {
		t.Fatal(err)
	}

	handler := f.shop.PriceSyncHandler()
	if err = handler(ctx, priceSyncJob(t, 1761120000, 0)); err != nil {
		t.Fatal("unchanged sync", err)
	}
	if count := releaseCount(t, f); count != 2 {
		t.Fatal("unchanged supplier price created a release", count)
	}
	review, err := client.SupplierPriceReview.Get(ctx, f.product.ID)
	if err != nil || review.Status != "current" || review.Attention != "" || review.SellingMinor != "116" {
		t.Fatal("first check", review, err)
	}

	supplierQuote(f, "2.00")
	if err = handler(ctx, priceSyncJob(t, 1761148800, 0)); err != nil {
		t.Fatal("reprice", err)
	}
	draft, err := f.shop.Draft(ctx, base.admin, f.product.ID)
	if err != nil {
		t.Fatal(err)
	}
	if draft.CurrentRelease == f.product.CurrentRelease || draft.Version != f.product.Version+1 || draft.State != "published" {
		t.Fatal("reprice must publish one new release", draft.CurrentRelease, draft.Version)
	}
	// 2.00 * 1.15 = 2.30: the untouched draft follows so a manual publish cannot restore 1.16.
	if draft.Definition.Variants[0].UnitAmountMinor != "230" || draft.PriceReview == nil || draft.PriceReview.Status != "repriced" || draft.PriceReview.RepricedFromMinor != "116" || draft.PriceReview.RepricedToMinor != "230" {
		t.Fatal("repriced draft/review", draft.Definition.Variants[0], draft.PriceReview)
	}
	public, err := f.shop.Published(ctx, base.game.Slug, f.product.ID)
	if err != nil || public.ReleaseID != draft.CurrentRelease || public.Definition.Variants[0].UnitAmountMinor != "230" {
		t.Fatal("public release", public.ReleaseID, err)
	}
	newBinding, err := client.SupplierBinding.Get(ctx, draft.CurrentRelease)
	if err != nil || newBinding.Data.Product.Offers[0].Cost != "2" || newBinding.Data.MarkupBPS != 1500 || newBinding.Data.OverrideMinor != "" {
		t.Fatal("new binding cost evidence", err)
	}
	// History, its binding, the accepted order and its contract are unchanged.
	sameRelease, err := client.ShopProductRelease.Get(ctx, oldRelease.ID)
	if err != nil || sameJSON(t, sameRelease.Data) != sameJSON(t, oldRelease.Data) {
		t.Fatal("historical release changed", err)
	}
	sameBinding, err := client.SupplierBinding.Get(ctx, oldBinding.ID)
	if err != nil || sameBinding.Data.Product.Offers[0].Cost != "1.005" {
		t.Fatal("historical binding changed", err)
	}
	afterOrder, err := client.Order.Get(ctx, accepted.ID)
	if err != nil || sameJSON(t, afterOrder.ShopSnapshot) != sameJSON(t, accepted.ShopSnapshot) || afterOrder.UpdatedAt != accepted.UpdatedAt {
		t.Fatal("accepted order snapshot changed", err)
	}
	afterContract, err := client.OrderContract.Get(ctx, contract.ID)
	if err != nil || sameJSON(t, afterContract.Data) != sameJSON(t, contract.Data) {
		t.Fatal("accepted contract changed", err)
	}
	purchase, err := client.SupplierPurchase.Query().Only(ctx)
	if err != nil || purchase.OrderID != accepted.ID || purchase.AmountMinor != reserved.Purchase.AmountMinor || purchase.AmountMinor != "116" {
		t.Fatal("stored purchase snapshot", err)
	}
	// Attributable system actor: release event and audit carry no staff identity.
	event, err := client.ShopProductEvent.Query().Where(shopproductevent.ProductIDEQ(f.product.ID), shopproductevent.ActionEQ("supplier_repriced")).Only(ctx)
	if err != nil || event.ActorID != "" || event.Version != draft.Version {
		t.Fatal("system event", err)
	}
	audit, err := client.AuthAudit.Query().Where(authaudit.ActionEQ("shop_product_supplier_repriced"), authaudit.TargetIDEQ(f.product.ID)).Only(ctx)
	if err != nil || audit.ActorID != "" || audit.ActorReference != "system:supplier-price-sync" || audit.Metadata["from_minor"] != "116" || audit.Metadata["to_minor"] != "230" {
		t.Fatal("system audit", err)
	}
	run, err := client.SupplierPriceRun.Query().Where(supplierpricerun.WindowStartEQ(timeAt(1761148800))).Only(ctx)
	if err != nil || run.State != "complete" || run.Repriced != 1 || run.Checked != 1 || run.LeaseOwner != "" {
		t.Fatal("run record", run, err)
	}
	// Replaying the finished window and checking an unchanged price are no-ops.
	if err = handler(ctx, priceSyncJob(t, 1761148800, 0)); err != nil {
		t.Fatal(err)
	}
	if err = handler(ctx, priceSyncJob(t, 1761177600, 0)); err != nil {
		t.Fatal(err)
	}
	if count := releaseCount(t, f); count != 3 {
		t.Fatal("idempotent sync created extra releases", count)
	}
	// A quote against the superseded release is refused; the current one is fresh.
	if _, err = f.shop.QuoteSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, f.product.CurrentRelease, "1"); !errors.Is(err, shop.ErrConflict) {
		t.Fatal("superseded release quoted", err)
	}
	if q, quoteErr := f.shop.QuoteSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, draft.CurrentRelease, "1"); quoteErr != nil || q.AmountMinor != "230" {
		t.Fatal("current release quote", q.AmountMinor, quoteErr)
	}
	overview, err := f.shop.PriceSync(ctx, base.admin)
	if err != nil || len(overview.Repriced) != 1 || overview.Repriced[0].Title == "" || overview.Repriced[0].SupplierProductID != f.preparation.ProductID || overview.AttentionCount != 0 {
		t.Fatal("overview", overview, err)
	}
	list, err := f.shop.List(ctx, base.admin, shop.Filters{})
	if err != nil || len(list.Items) == 0 {
		t.Fatal(err)
	}
	for _, item := range list.Items {
		if item.ID == f.product.ID && (item.PriceStatus != "current" || item.RepricedAt == nil) {
			t.Fatal("list badge", item)
		}
	}
	if _, err = f.shop.PriceSync(ctx, base.buyer); err == nil {
		t.Fatal("customer read automatic pricing")
	}
}

func TestSupplierPriceSyncFlagsOverrideWithoutRepricing(t *testing.T) {
	f := nexusCheckoutFixture(t, false)
	ctx := t.Context()
	base := f.payment.base
	client := base.auth.client
	handler := f.shop.PriceSyncHandler()
	if err := handler(ctx, priceSyncJob(t, 1761120000, 0)); err != nil {
		t.Fatal(err)
	}
	supplierQuote(f, "1.5")
	if err := handler(ctx, priceSyncJob(t, 1761148800, 0)); err != nil {
		t.Fatal(err)
	}
	draft, err := f.shop.Draft(ctx, base.admin, f.product.ID)
	if err != nil {
		t.Fatal(err)
	}
	if draft.CurrentRelease != f.product.CurrentRelease || draft.Version != f.product.Version || draft.Definition.Variants[0].UnitAmountMinor != "1234" {
		t.Fatal("overridden price must never change automatically")
	}
	review := draft.PriceReview
	if review == nil || review.Status != "override_changed" || review.Attention != "open" || review.BaselineTotal != "1.005" || review.SupplierTotal != "1.5" || review.SellingMinor != "1234" || review.DetectedAt == nil {
		t.Fatal("override alert", review)
	}
	overview, err := f.shop.PriceSync(ctx, base.admin)
	if err != nil || overview.AttentionCount != 1 || len(overview.Attention) != 1 || overview.Attention[0].ProductID != f.product.ID || overview.LastRun == nil || overview.LastRun.Flagged != 1 || overview.NextCheckAt == nil {
		t.Fatal("attention overview", overview, err)
	}
	list, err := f.shop.List(ctx, base.admin, shop.Filters{})
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range list.Items {
		if item.ID == f.product.ID && item.PriceAttention != "open" {
			t.Fatal("list alert badge", item)
		}
	}
	// Only current administrators may acknowledge, with the exact review version.
	// The fixture's mail-only drain stops at the directly handled import job.
	if _, err = base.auth.db.ExecContext(ctx, "UPDATE jobs SET state='complete' WHERE kind='supplier.import'"); err != nil {
		t.Fatal(err)
	}
	_, booster := base.auth.staffLogin(t, "price-booster@example.test", identity.RoleBooster)
	for _, p := range []*identity.Principal{nil, base.buyer, booster} {
		if _, err = f.shop.AcknowledgePrice(ctx, p, f.product.ID, review.Version); err == nil {
			t.Fatal("non-admin acknowledged")
		}
	}
	if _, err = f.shop.AcknowledgePrice(ctx, base.admin, f.product.ID, review.Version+1); !errors.Is(err, shop.ErrConflict) {
		t.Fatal("stale acknowledgement", err)
	}
	acknowledged, err := f.shop.AcknowledgePrice(ctx, base.admin, f.product.ID, review.Version)
	if err != nil || acknowledged.Attention != "acknowledged" || acknowledged.BaselineTotal != "1.5" || acknowledged.SellingMinor != "1234" {
		t.Fatal("acknowledge", acknowledged, err)
	}
	if again, againErr := f.shop.AcknowledgePrice(ctx, base.admin, f.product.ID, acknowledged.Version); againErr != nil || again.Version != acknowledged.Version {
		t.Fatal("repeat acknowledgement must be idempotent", againErr)
	}
	if count, countErr := client.AuthAudit.Query().Where(authaudit.ActionEQ("shop_product_price_acknowledged"), authaudit.ActorIDEQ(base.admin.User.ID)).Count(ctx); countErr != nil || count != 1 {
		t.Fatal("acknowledgement audit", count)
	}
	if overview, err = f.shop.PriceSync(ctx, base.admin); err != nil || overview.AttentionCount != 0 {
		t.Fatal("acknowledged alert left the banner", err)
	}
	// The same supplier amount stays quiet; a further change alerts again.
	if err = handler(ctx, priceSyncJob(t, 1761177600, 0)); err != nil {
		t.Fatal(err)
	}
	if row := priceReview(t, f); row.Status != "current" || row.Attention != "" {
		t.Fatal("acknowledged amount alerted again", row)
	}
	supplierQuote(f, "1.75")
	if err = handler(ctx, priceSyncJob(t, 1761206400, 0)); err != nil {
		t.Fatal(err)
	}
	if row := priceReview(t, f); row.Status != "override_changed" || row.Attention != "open" || row.BaselineTotal != "1.5" || row.SupplierTotal != "1.75" {
		t.Fatal("further change must reopen", row)
	}
	if count := releaseCount(t, f); count != 1 {
		t.Fatal("override product gained releases", count)
	}
}

func TestSupplierPriceSyncFailuresKeepLastPriceAndDefer(t *testing.T) {
	f := markupPublication(t, nexusCheckoutFixture(t, false))
	ctx := t.Context()
	base := f.payment.base
	client := base.auth.client
	handler := f.shop.PriceSyncHandler()
	releases := func() int {
		count, err := client.ShopProductRelease.Query().Where(shopproductrelease.ProductIDEQ(f.product.ID)).Count(ctx)
		if err != nil {
			t.Fatal(err)
		}
		return count
	}
	supplierQuote(f, "3")
	f.provider.quoteErr = suppliers.ErrUnavailable
	if err := handler(ctx, priceSyncJob(t, 1761120000, 0)); err != nil {
		t.Fatal(err)
	}
	row, err := client.SupplierPriceReview.Get(ctx, f.product.ID)
	if err != nil || row.Status != "unavailable" || row.Attention != "" || row.Failures != 1 || row.SellingMinor != "116" || releases() != 2 {
		t.Fatal("first unavailable read keeps the last good price quietly", row, err)
	}
	if err = handler(ctx, priceSyncJob(t, 1761148800, 0)); err != nil {
		t.Fatal(err)
	}
	if row = priceReview(t, f); row.Attention != "open" || row.Failures != 2 {
		t.Fatal("repeated unavailability needs attention", row)
	}
	f.provider.quoteErr = suppliers.ErrChanged
	if err = handler(ctx, priceSyncJob(t, 1761177600, 0)); err != nil {
		t.Fatal(err)
	}
	if row = priceReview(t, f); row.Status != "requirements_changed" || row.Attention != "open" || releases() != 2 {
		t.Fatal("changed requirements are flagged, not repriced", row)
	}
	f.provider.quoteErr = nil
	// An unconsumed checkout quote finishes on its release; the check is deferred.
	q := f.quote(t)
	if err = handler(ctx, priceSyncJob(t, 1761206400, 0)); err != nil {
		t.Fatal(err)
	}
	run, err := client.SupplierPriceRun.Query().Where(supplierpricerun.WindowStartEQ(timeAt(1761206400))).Only(ctx)
	if err != nil || run.Deferred != 1 || run.Repriced != 0 || releases() != 2 {
		t.Fatal("active quote must defer repricing", run, err)
	}
	if _, err = f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, f.acceptance(q)); err != nil {
		t.Fatal("deferred quote must still be accepted on its release", err)
	}
	// An administrator archiving the product mid-read wins over the stale check.
	f.provider.beforeQuote = func() {
		current, readErr := f.shop.Draft(ctx, base.admin, f.product.ID)
		if readErr == nil {
			_, readErr = f.shop.Change(ctx, base.admin, current.ID, current.Version, "archive")
		}
		if readErr != nil {
			t.Error("archive", readErr)
		}
	}
	if err = handler(ctx, priceSyncJob(t, 1761235200, 0)); err != nil {
		t.Fatal(err)
	}
	f.provider.beforeQuote = nil
	if run, err = client.SupplierPriceRun.Query().Where(supplierpricerun.WindowStartEQ(timeAt(1761235200))).Only(ctx); err != nil || run.Deferred != 1 || releases() != 2 {
		t.Fatal("concurrent staff change must not be overwritten", run, err)
	}
	// Recovery clears attention without inventing history.
	current, err := f.shop.Draft(ctx, base.admin, f.product.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.shop.Change(ctx, base.admin, current.ID, current.Version, "restore"); err != nil {
		t.Fatal(err)
	}
	if err = handler(ctx, priceSyncJob(t, 1761264000, 0)); err != nil {
		t.Fatal(err)
	}
	if row = priceReview(t, f); row.Status != "repriced" || row.Attention != "" || row.Failures != 0 || row.SellingMinor != "345" {
		t.Fatal("restored paused product is repriced once its supplier read succeeds", row)
	}
}

func TestSupplierPriceSyncConcurrentWorkersAndOutage(t *testing.T) {
	f := markupPublication(t, nexusCheckoutFixture(t, false))
	ctx := t.Context()
	client := f.payment.base.auth.client
	supplierQuote(f, "2.00")
	handler := f.shop.PriceSyncHandler()
	var wg sync.WaitGroup
	results := make(chan error, 4)
	for range 4 {
		wg.Go(func() { results <- handler(ctx, priceSyncJob(t, 1761120000, 0)) })
	}
	wg.Wait()
	close(results)
	for err := range results {
		if err != nil && !errors.Is(err, shop.ErrConflict) && !strings.Contains(err.Error(), "Deadlock") && !strings.Contains(err.Error(), "Duplicate entry") && !strings.Contains(err.Error(), "Write conflict") {
			t.Fatal("concurrent sync", err)
		}
	}
	// A retried job finishes the window if every racer lost its fence.
	if err := handler(ctx, priceSyncJob(t, 1761120000, 0)); err != nil {
		t.Fatal(err)
	}
	if count := releaseCount(t, f); count != 3 {
		t.Fatal("concurrent workers must publish exactly one new release", count)
	}
	if count, countErr := client.SupplierPriceRun.Query().Count(ctx); countErr != nil || count != 1 {
		t.Fatal("one run per window", count)
	}
	// Scheduling is idempotent per window.
	if err := f.shop.ScheduleSupplierPrices(ctx); err != nil {
		t.Fatal(err)
	}
	if err := f.shop.ScheduleSupplierPrices(ctx); err != nil {
		t.Fatal(err)
	}
	var queued int
	if err := f.payment.base.auth.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM jobs WHERE kind='supplier.price_sync'").Scan(&queued); err != nil || queued != 1 {
		t.Fatal("schedule must enqueue one job per window", queued, err)
	}
	// Three products failing before any success are an outage: fail the window
	// without marking products.
	for range 2 {
		publishExtraSupplierProduct(t, f)
	}
	f.provider.quoteErr = suppliers.ErrUnavailable
	if err := handler(ctx, priceSyncJob(t, 1761148800, 0)); err != nil {
		t.Fatal(err)
	}
	run, err := client.SupplierPriceRun.Query().Where(supplierpricerun.WindowStartEQ(timeAt(1761148800))).Only(ctx)
	if err != nil || run.State != "failed" || run.Issue != "supplier_unavailable" {
		t.Fatal("outage run", run, err)
	}
	if row := priceReview(t, f); row.Failures != 0 || row.Status != "repriced" {
		t.Fatal("outage marked products", row)
	}
}

// publishExtraSupplierProduct imports another synthetic offer for the same
// merchant and publishes it through the normal editor path.
func publishExtraSupplierProduct(t *testing.T, f checkoutFixture) {
	t.Helper()
	ctx := t.Context()
	base := f.payment.base
	product := f.provider.quote.Product
	product.ID = "test:coins:" + uuid.NewString()[:8]
	reader := &supplierReader{merchant: "101", value: suppliers.Catalog{Connection: suppliers.NexusSandbox, Games: []suppliers.Game{{ID: "test", Name: "Test game"}}, Categories: []suppliers.Category{{ID: "test:coins", GameID: "test", Name: "Coins"}}, Products: []suppliers.Product{product}}}
	library, err := supply.New(base.auth.client, base.auth.service, []supply.CatalogReader{reader}, nil)
	if err != nil {
		t.Fatal(err)
	}
	run, err := library.RequestImport(ctx, base.admin, suppliers.NexusSandbox, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	if err = library.ImportHandler()(ctx, supplierImportJob(t, run.ID)); err != nil {
		t.Fatal(err)
	}
	pricing, err := library.SetPrice(ctx, base.admin, suppliers.NexusSandbox, product.ID, "default", supply.PriceInput{ImportID: run.ID, GameID: base.game.ID, Region: "Test region", DeliveryMethod: "id"})
	if err != nil {
		t.Fatal(err)
	}
	conn, err := base.auth.client.SupplierConnection.Get(ctx, string(suppliers.NexusSandbox))
	if err != nil {
		t.Fatal(err)
	}
	draft, err := f.shop.PrepareSupplier(ctx, base.admin, shop.SupplierPreparation{Connection: suppliers.NexusSandbox, ImportID: run.ID, ProductID: product.ID, OfferID: "default", PriceVersion: pricing.Version, ConnectionVersion: conn.Version})
	if err != nil {
		t.Fatal(err)
	}
	value := draft.Definition
	value.Asset, value.AssetAlt, value.AssetSource, value.Policy, value.Reviewed = f.product.Definition.Asset, f.product.Definition.AssetAlt, f.product.Definition.AssetSource, f.product.Definition.Policy, true
	if draft, err = f.shop.Save(ctx, base.admin, draft.ID, draft.Version, value); err != nil {
		t.Fatal(err)
	}
	if _, err = f.shop.Change(ctx, base.admin, draft.ID, draft.Version, "publish"); err != nil {
		t.Fatal(err)
	}
}

func releaseCount(t *testing.T, f checkoutFixture) int {
	t.Helper()
	count, err := f.payment.base.auth.client.ShopProductRelease.Query().Where(shopproductrelease.ProductIDEQ(f.product.ID)).Count(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	return count
}

func priceReview(t *testing.T, f checkoutFixture) *ent.SupplierPriceReview {
	t.Helper()
	row, err := f.payment.base.auth.client.SupplierPriceReview.Get(t.Context(), f.product.ID)
	if err != nil {
		t.Fatal(err)
	}
	return row
}

func sameJSON(t *testing.T, value any) string { return string(mustJSON(t, value)) }

func timeAt(unix int64) time.Time { return time.Unix(unix, 0).UTC() }
