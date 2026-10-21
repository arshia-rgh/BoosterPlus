//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplieritem"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierprice"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/supply"
)

type supplierReader struct {
	merchant string
	value    suppliers.Catalog
	err      error
	calls    atomic.Int32
	before   func()
}

func (r *supplierReader) Connection() suppliers.Connection { return r.value.Connection }
func (r *supplierReader) MerchantID() string               { return r.merchant }
func (r *supplierReader) Catalog(context.Context) (suppliers.Catalog, error) {
	r.calls.Add(1)
	if r.before != nil {
		r.before()
	}
	return r.value, r.err
}

func supplierFixture(t *testing.T, f *orderFixture) (*supply.Store, *supplierReader) {
	t.Helper()
	reader := &supplierReader{merchant: "101", value: suppliers.Catalog{Connection: suppliers.NexusSandbox, Games: []suppliers.Game{{ID: "test", Name: "Test game"}}, Categories: []suppliers.Category{{ID: "test:coins", GameID: "test", Name: "Coins"}},
		Products: []suppliers.Product{{ID: "test:coins:p1", GameID: "test", CategoryID: "test:coins", Name: "Test coins", Offers: []suppliers.Offer{{ID: "default", Name: "ID delivery", Cost: "1.005", Available: true, SuggestedDelivery: "id", Quantity: suppliers.Quantity{Kind: "one", Min: "1", Max: "1", Step: "1"}}}},
			{ID: "unavailable", Name: "Unpriced fixture", ReviewIssues: []string{"supplier_category_missing"}, Offers: []suppliers.Offer{}}}}}
	store, err := supply.New(f.auth.client, f.auth.service, []supply.CatalogReader{reader}, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	if err != nil {
		t.Fatal(err)
	}
	return store, reader
}
func supplierImportJob(t *testing.T, id string) jobs.Job {
	t.Helper()
	raw, err := json.Marshal(map[string]string{"import_id": id})
	if err != nil {
		t.Fatal(err)
	}
	return jobs.Job{Payload: raw}
}

func TestSupplierLibraryAuthorityExactPricesAndResync(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store, reader := supplierFixture(t, f)
	for _, p := range []*identity.Principal{nil, f.buyer, {User: f.admin.User, Session: f.buyer.Session}} {
		if _, err := store.RequestImport(ctx, p, suppliers.NexusSandbox, uuid.NewString()); err == nil {
			t.Fatal("unauthorized import")
		}
	}
	request := uuid.NewString()
	run, err := store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, request)
	if err != nil {
		t.Fatal(err)
	}
	if again, e := store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, request); e != nil || again.ID != run.ID {
		t.Fatal("duplicate import", e)
	}
	if _, err = store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, uuid.NewString()); !errors.Is(err, supply.ErrConflict) {
		t.Fatal("parallel import accepted", err)
	}
	if _, err = store.Library(ctx, f.admin, suppliers.NexusSandbox, supply.Filters{ImportID: run.ID}); !errors.Is(err, supply.ErrConflict) {
		t.Fatal("unfinished rows exposed", err)
	}
	if err = store.ImportHandler()(ctx, supplierImportJob(t, run.ID)); err != nil {
		t.Fatal(err)
	}
	if err = store.ImportHandler()(ctx, supplierImportJob(t, run.ID)); err != nil || reader.calls.Load() != 1 {
		t.Fatal("complete import refetched", err)
	}
	page, err := store.Library(ctx, f.admin, suppliers.NexusSandbox, supply.Filters{Search: "test:coins:p1"})
	if err != nil || len(page.Items) != 1 || page.Import.ProductCount != 2 || page.Items[0].Offers[0].Pricing.PreviewAmountMinor != "116" {
		t.Fatal("catalog/precision lost", err, page)
	}
	input := supply.PriceInput{ImportID: run.ID, OverrideMinor: "200", GameID: f.game.ID, Region: "Test region", DeliveryMethod: "id"}
	price, err := store.SetPrice(ctx, f.admin, suppliers.NexusSandbox, "test:coins:p1", "default", input)
	if err != nil || price.PreviewAmountMinor != "200" {
		t.Fatal("override save failed", err)
	}
	if _, err = store.SetPrice(ctx, f.admin, suppliers.NexusSandbox, "test:coins:p1", "default", input); !errors.Is(err, supply.ErrConflict) {
		t.Fatal("stale price accepted", err)
	}
	reader.value.Products[0].Offers[0].Cost = "2.005"
	newRun, err := store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	if err = store.ImportHandler()(ctx, supplierImportJob(t, newRun.ID)); err != nil {
		t.Fatal(err)
	}
	page, err = store.Library(ctx, f.admin, suppliers.NexusSandbox, supply.Filters{Search: "test:coins:p1"})
	if err != nil || page.Items[0].Offers[0].Pricing.CostUSD != "2.005" || page.Items[0].Offers[0].Pricing.PreviewAmountMinor != "200" {
		t.Fatal("resync discarded override", err)
	}
	input.Version = price.Version
	if _, err = store.SetPrice(ctx, f.admin, suppliers.NexusSandbox, "test:coins:p1", "default", input); !errors.Is(err, supply.ErrConflict) {
		t.Fatal("stale catalog edited current offer", err)
	}
	input.ImportID, input.OverrideMinor = newRun.ID, ""
	if _, err = store.SetPrice(ctx, f.admin, suppliers.NexusSandbox, "test:coins:p1", "default", input); err != nil {
		t.Fatal(err)
	}
	if _, err = store.SetMarkup(ctx, f.admin, suppliers.NexusSandbox, page.Connection.Version, 2000); err != nil {
		t.Fatal(err)
	}
	page, err = store.Library(ctx, f.admin, suppliers.NexusSandbox, supply.Filters{Search: "test:coins:p1"})
	if err != nil || page.Items[0].Offers[0].Pricing.PreviewAmountMinor != "241" {
		t.Fatal("default markup not inherited", err)
	}
	if count, e := f.auth.client.ShopProduct.Query().Count(ctx); e != nil || count != 0 {
		t.Fatal("import published or created shop offers", e)
	}
	if _, err = store.Library(ctx, f.buyer, suppliers.NexusSandbox, supply.Filters{}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer saw supplier costs", err)
	}
}

func TestSupplierImportFailureCancellationAndStaleWorker(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store, reader := supplierFixture(t, f)
	first, err := store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	if err = store.ImportHandler()(ctx, supplierImportJob(t, first.ID)); err != nil {
		t.Fatal(err)
	}
	reader.err = errors.New("private upstream payload must never be retained")
	run, err := store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	if err = store.ImportHandler()(ctx, supplierImportJob(t, run.ID)); err != nil {
		t.Fatal(err)
	}
	state, err := store.Import(ctx, f.admin, run.ID)
	if err != nil || state.State != "failed" || state.Issue != "supplier_unavailable" {
		t.Fatal("unsafe failure projection", err, state)
	}
	page, err := store.Library(ctx, f.admin, suppliers.NexusSandbox, supply.Filters{})
	if err != nil || page.Import.ID != first.ID {
		t.Fatal("failed sync replaced usable catalog", err)
	}
	reader.err = nil
	run, err = store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	reader.before = func() {
		if e := store.CancelImport(ctx, f.admin, run.ID); e != nil {
			t.Error(e)
		}
	}
	if err = store.ImportHandler()(ctx, supplierImportJob(t, run.ID)); !errors.Is(err, supply.ErrConflict) {
		t.Fatal("cancelled worker published catalog", err)
	}
	if count, e := f.auth.client.SupplierItem.Query().Where(supplieritem.ImportIDEQ(run.ID)).Count(ctx); e != nil || count != 0 {
		t.Fatal("cancelled worker persisted rows", e)
	}
	reader.before = nil
	stale, err := store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	before := reader.calls.Load()
	if _, err = f.auth.client.User.UpdateOneID(f.admin.User.ID).AddAuthVersion(1).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if err = store.ImportHandler()(ctx, supplierImportJob(t, stale.ID)); !errors.Is(err, identity.ErrForbidden) || reader.calls.Load() != before {
		t.Fatal("revoked author performed queued work", err)
	}
}

func TestSupplierListingFilterAcrossPagesAndImports(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store, reader := supplierFixture(t, f)
	reader.value.Products = nil
	for i := range 140 {
		id := fmt.Sprintf("product-%03d", i)
		reader.value.Products = append(reader.value.Products, suppliers.Product{ID: id, Name: id, GameID: "test", CategoryID: "test:coins", Offers: []suppliers.Offer{{ID: "default", Name: "ID", Cost: "1", Available: true, SuggestedDelivery: "id", Quantity: suppliers.Quantity{Kind: "one", Min: "1", Max: "1", Step: "1"}}}})
	}
	importCatalog := func() string {
		run, err := store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, uuid.NewString())
		if err != nil {
			t.Fatal(err)
		}
		if err = store.ImportHandler()(ctx, supplierImportJob(t, run.ID)); err != nil {
			t.Fatal(err)
		}
		return run.ID
	}
	first := importCatalog()
	rows, err := f.auth.client.SupplierItem.Query().Where(supplieritem.ImportIDEQ(first)).Order(supplieritem.ByID()).All(ctx)
	if err != nil {
		t.Fatal(err)
	}
	// The first whole scan batch is linked, then 30 unprepared products remain.
	for _, row := range rows[:110] {
		if _, err = f.auth.client.SupplierPrice.Create().SetConnectionID(string(suppliers.NexusSandbox)).SetProductID(row.ProductID).SetOfferID("default").SetShopProductID(uuid.NewString()).SetUpdatedBy(f.admin.User.ID).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	filter := supply.Filters{ImportID: first, Listing: "not_added", GameID: "test", CategoryID: "test:coins", Search: "product"}
	page, err := store.Library(ctx, f.admin, suppliers.NexusSandbox, filter)
	if err != nil || len(page.Items) != 25 || page.Next != rows[134].ID {
		t.Fatal("filtered first page skipped late offers", err, page.Next, len(page.Items))
	}
	filter.After = page.Next
	page, err = store.Library(ctx, f.admin, suppliers.NexusSandbox, filter)
	if err != nil || len(page.Items) != 5 || page.Next != "" || page.Items[0].ID != rows[135].ProductID {
		t.Fatal("filtered continuation omitted or repeated an offer", err)
	}
	// Binding is independent of import ID and includes archived/published drafts.
	second := importCatalog()
	page, err = store.Library(ctx, f.admin, suppliers.NexusSandbox, supply.Filters{ImportID: second, Search: rows[0].ProductID, Listing: "added"})
	if err != nil || len(page.Items) != 1 || page.Items[0].Offers[0].Pricing.ShopProductID == "" {
		t.Fatal("reimport lost a prepared listing", err)
	}
	if _, err = store.Library(ctx, f.admin, suppliers.NexusSandbox, supply.Filters{Listing: "published"}); !errors.Is(err, supply.ErrInvalid) {
		t.Fatal("invalid status accepted", err)
	}
	if _, err = store.Library(ctx, f.buyer, suppliers.NexusSandbox, supply.Filters{Listing: "not_added"}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer accessed private listing filter", err)
	}
	// Removing a binding makes it visible again without changing the import.
	if _, err = f.auth.client.SupplierPrice.Update().Where(supplierprice.ProductIDEQ(rows[0].ProductID)).ClearShopProductID().Save(ctx); err != nil {
		t.Fatal(err)
	}
	page, err = store.Library(ctx, f.admin, suppliers.NexusSandbox, supply.Filters{ImportID: second, Search: rows[0].ProductID, Listing: "not_added"})
	if err != nil || len(page.Items) != 1 {
		t.Fatal("filter ignored current draft binding", err)
	}
}
