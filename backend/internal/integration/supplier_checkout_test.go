//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/supply"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

type checkoutProvider struct{ purchaseProvider }

func (p *checkoutProvider) CreateOrder(_ context.Context, input suppliers.PurchaseRequest) (suppliers.Order, error) {
	p.calls.Add(1)
	if len(input.Values) > 0 && input.Values["player_id"] != "synthetic-private-player" {
		return suppliers.Order{}, suppliers.ErrInvalid
	}
	p.result.Reference = input.Reference
	return p.result, p.createErr
}
func (p *checkoutProvider) PendingAction(context.Context, string, string) (suppliers.PendingAction, error) {
	return suppliers.PendingAction{Kind: "none"}, nil
}

type checkoutFixture struct {
	payment     *paymentFixture
	shop        *shop.Store
	library     *supply.Store
	worker      *supply.Purchaser
	provider    *checkoutProvider
	product     shop.Draft
	preparation shop.SupplierPreparation
}

func nexusCheckoutFixture(t *testing.T, codes bool) checkoutFixture {
	t.Helper()
	return nexusCheckoutFixtureWithSetup(t, codes, nil)
}
func nexusCheckoutFixtureWithSetup(t *testing.T, codes bool, setup func(*paymentFixture)) checkoutFixture {
	t.Helper()
	f, store, _, _ := shopPurchaseFixture(t)
	if setup != nil {
		setup(f)
	}
	ctx := t.Context()
	library, reader := supplierFixture(t, f.base)
	product := &reader.value.Products[0]
	method := "id"
	product.Kind = "topup"
	product.Description = "Synthetic Nexus product for isolated checkout."
	product.Offers[0].Fields = []suppliers.Field{{ID: "player_id", Label: "Player ID", Kind: "text", Required: true, Options: []suppliers.Option{}}}
	if codes {
		product.Kind = "cdkey"
		method = "code"
		product.Offers[0].Fields = []suppliers.Field{}
	}
	run, err := library.RequestImport(ctx, f.base.admin, suppliers.NexusSandbox, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	if err = library.ImportHandler()(ctx, supplierImportJob(t, run.ID)); err != nil {
		t.Fatal(err)
	}
	pricing, err := library.SetPrice(ctx, f.base.admin, suppliers.NexusSandbox, product.ID, "default", supply.PriceInput{ImportID: run.ID, GameID: f.base.game.ID, Region: "Test region", DeliveryMethod: method, OverrideMinor: "1234"})
	if err != nil {
		t.Fatal(err)
	}
	keys, err := vault.NewKeyring("fixture", map[string][]byte{"fixture": []byte(strings.Repeat("k", 32))})
	if err != nil {
		t.Fatal(err)
	}
	provider := &checkoutProvider{purchaseProvider: purchaseProvider{connection: suppliers.NexusSandbox, merchant: "101", quote: suppliers.Quote{Connection: suppliers.NexusSandbox, MerchantID: "101", Product: *product, Offer: product.Offers[0], Quantity: "1", TotalCost: "1.005"}, result: suppliers.Order{ID: "901", ProductID: product.ID, Quantity: "1", Cost: "1.005", Status: "pending"}}}
	worker, err := supply.NewPurchaser(f.base.auth.client, keys, []supply.PurchaseProvider{provider}, true, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	if err != nil {
		t.Fatal(err)
	}
	store.WithSupplier(worker)
	conn, err := f.base.auth.client.SupplierConnection.Get(ctx, string(suppliers.NexusSandbox))
	if err != nil {
		t.Fatal(err)
	}
	input := shop.SupplierPreparation{Connection: suppliers.NexusSandbox, ImportID: run.ID, ProductID: product.ID, OfferID: "default", PriceVersion: pricing.Version, ConnectionVersion: conn.Version}
	draft, err := store.PrepareSupplier(ctx, f.base.admin, input)
	if err != nil {
		t.Fatal("prepare", err)
	}
	if draft.CurrentRelease != "" || len(draft.Stocks) != 0 {
		t.Fatal("private preparation activated stock")
	}
	if _, err = store.Change(ctx, f.base.admin, draft.ID, draft.Version, "publish"); err == nil {
		t.Fatal("unreviewed draft published")
	}
	value := draft.Definition
	manual := shopDefinition()
	// Retain the prepared instant-delivery category when applying commercial
	// fixture terms; substituting manual hours correctly clears review on save.
	manual.Policy.DeliveryMinHours = value.Policy.DeliveryMinHours
	manual.Policy.DeliveryMaxHours = value.Policy.DeliveryMaxHours
	value.Asset, value.AssetAlt, value.AssetSource, value.Policy, value.Reviewed = manual.Asset, manual.AssetAlt, manual.AssetSource, manual.Policy, true
	value.Policy.EvidenceRequired = false
	draft, err = store.Save(ctx, f.base.admin, draft.ID, draft.Version, value)
	if err != nil {
		t.Fatal("save", err)
	}
	draft, err = store.Change(ctx, f.base.admin, draft.ID, draft.Version, "publish")
	if err != nil {
		t.Fatal("publish", err)
	}
	if len(draft.Stocks) != 0 {
		t.Fatal("supplier publication invented manual capacity")
	}
	if _, err = f.base.auth.client.SupplierConnection.UpdateOne(conn).SetPurchasesEnabled(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	return checkoutFixture{f, store, library, worker, provider, draft, input}
}
func (f checkoutFixture) quote(t *testing.T) shop.SupplierQuoteView {
	t.Helper()
	q, e := f.shop.QuoteSupplier(t.Context(), f.payment.base.buyer, f.payment.base.game.Slug, f.product.ID, f.product.CurrentRelease, "1")
	if e != nil {
		t.Fatal("quote", e)
	}
	return q
}
func (f checkoutFixture) acceptance(q shop.SupplierQuoteView) shop.SupplierAcceptance {
	values := map[string]string{}
	if len(f.provider.quote.Offer.Fields) > 0 {
		values["player_id"] = "synthetic-private-player"
	}
	return shop.SupplierAcceptance{RequestKey: uuid.NewString(), QuoteID: q.ID, ExpectedAmount: q.AmountMinor, TermsVersion: f.payment.base.auth.cfg.TermsVersion, AcceptTerms: true, Recipient: values}
}
func TestNexusCheckoutPublicationQuoteAndPaidDelivery(t *testing.T) {
	f := nexusCheckoutFixture(t, false)
	ctx := t.Context()
	base := f.payment.base
	for method, want := range map[string]int{"id": 1, "manual": 1, "code": 0, "": 2} {
		page, e := f.shop.Browse(ctx, shop.BrowseInput{Slug: base.game.Slug, Method: method, Region: "Test region"})
		if e != nil || len(page.Items) != want {
			t.Fatal("method/region filter", method, e, len(page.Items))
		}
	}
	facets, e := f.shop.PublicFilters(ctx, base.game.Slug)
	if e != nil || len(facets.Regions) != 1 || facets.Regions[0] != "Test region" || len(facets.Categories) != 2 {
		t.Fatal("released facets", e, facets)
	}
	available, e := f.shop.List(ctx, base.admin, shop.Filters{Availability: "available"})
	if e != nil || len(available.Items) != 2 {
		t.Fatal("available supplier/manual", e, len(available.Items))
	}
	q := f.quote(t)
	if q.AmountMinor != "1234" {
		t.Fatal("exact override changed", q.AmountMinor)
	}
	input := f.acceptance(q)
	detail, e := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, input)
	if e != nil {
		t.Fatal("reserve", e)
	}
	if detail.Purchase.Product.AssetSource != "" {
		t.Fatal("customer checkout exposed staff artwork provenance")
	}
	staffView, e := f.shop.Delivery(ctx, base.admin, detail.OrderID, true)
	if e != nil || staffView.Purchase.Product.AssetSource == "" {
		t.Fatal("immutable purchase lost staff provenance or stopped validating", e)
	}
	again, e := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, input)
	if e != nil || again.OrderID != detail.OrderID {
		t.Fatal("idempotent retry", e)
	}
	purchase, e := base.auth.client.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(detail.OrderID)).Only(ctx)
	if e != nil {
		t.Fatal(e)
	}
	if e = f.worker.Dispatch(ctx, purchase.ID); e == nil || f.provider.calls.Load() != 0 {
		t.Fatal("unpaid dispatch", e)
	}
	row, e := base.auth.client.Order.Get(ctx, detail.OrderID)
	if e != nil {
		t.Fatal(e)
	}
	raw, marshalErr := json.Marshal(row)
	if marshalErr != nil {
		t.Fatal(marshalErr)
	}
	if strings.Contains(string(raw), "synthetic-private-player") || strings.Contains(string(raw), "TotalCost") {
		t.Fatal("private values leaked")
	}
	if _, e = f.shop.ChangeDelivery(ctx, base.admin, detail.OrderID, "claim", shop.DeliveryChange{OrderVersion: row.Version}); e == nil {
		t.Fatal("manual claim allowed")
	}
	payPurchase(t, f.payment, detail.OrderID)
	var count int
	if e = base.auth.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM jobs WHERE kind='supplier.dispatch'").Scan(&count); e != nil || count != 1 {
		t.Fatal("payment dispatch job", e, count)
	}
	if e = f.worker.Dispatch(ctx, purchase.ID); e != nil || f.provider.calls.Load() != 1 {
		t.Fatal("paid dispatch", e)
	}
	result, e := f.shop.Delivery(ctx, base.buyer, detail.OrderID, false)
	if e != nil || result.State != "pending" || result.OrderState != "in_progress" {
		t.Fatal("pending projection", e, result.State, result.OrderState)
	}
	queue, queueErr := base.store.List(ctx, base.admin, true, "", "", "", orders.Filters{Kind: "shop", Delivery: "processing"})
	if queueErr != nil || len(queue.Orders) != 1 || queue.Orders[0].Staff == nil || !queue.Orders[0].Staff.SupplierDelivery || queue.Orders[0].Staff.DeliveryState != "pending" {
		t.Fatal("supplier queue", queueErr)
	}
	f.provider.result.Status = "completed"
	if e = f.worker.Reconcile(ctx, purchase.ID); e != nil {
		t.Fatal(e)
	}
	result, e = f.shop.Delivery(ctx, base.buyer, detail.OrderID, false)
	if e != nil || result.State != "completed" || result.OrderState != "completed" {
		t.Fatal("completion", e, result.State, result.OrderState)
	}
	if e = f.worker.Reconcile(ctx, purchase.ID); e != nil {
		t.Fatal("repeated completed observation", e)
	}
	if f.provider.calls.Load() != 1 {
		t.Fatal("delivery polling re-purchased")
	}
}
func TestNexusCheckoutGuardsConcurrencyAndQuoteExpiry(t *testing.T) {
	f := nexusCheckoutFixture(t, false)
	ctx := t.Context()
	base := f.payment.base
	q := f.quote(t)
	input := f.acceptance(q)
	for _, mode := range []string{"staff", "anonymous", "amount", "terms", "recipient", "unknown", "quote"} {
		request := input
		p := base.buyer
		switch mode {
		case "staff":
			p = base.admin
		case "anonymous":
			p = nil
		case "amount":
			request.ExpectedAmount = "1"
		case "terms":
			request.TermsVersion = "old"
		case "recipient":
			request.Recipient = map[string]string{}
		case "unknown":
			request.Recipient = map[string]string{"player_id": "synthetic-private-player", "password": "prohibited"}
		case "quote":
			request.QuoteID = uuid.NewString()
		}
		if _, e := f.shop.ReserveSupplier(ctx, p, base.game.Slug, f.product.ID, request); e == nil {
			t.Fatal("accepted", mode)
		}
	}
	var group sync.WaitGroup
	var success atomic.Int32
	for range 4 {
		group.Go(func() {
			request := input
			request.RequestKey = uuid.NewString()
			if _, e := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, request); e == nil {
				success.Add(1)
			} else if !errors.Is(e, shop.ErrConflict) {
				t.Error(e)
			}
		})
	}
	group.Wait()
	if success.Load() != 1 {
		t.Fatal("quote consumed more than once", success.Load())
	}
	q = f.quote(t)
	input = f.acceptance(q)
	base.auth.clock.Add(121)
	if _, e := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, input); !errors.Is(e, shop.ErrConflict) {
		t.Fatal("expired quote", e)
	}
	f.provider.merchant = "202"
	if _, e := f.shop.Published(ctx, base.game.Slug, f.product.ID); e == nil {
		t.Fatal("foreign merchant visible")
	}
	f.provider.merchant = "101"
	if _, e := base.auth.client.SupplierConnection.UpdateOneID(string(suppliers.NexusSandbox)).SetPurchasesEnabled(false).Save(ctx); e != nil {
		t.Fatal(e)
	}
	public, e := f.shop.Published(ctx, base.game.Slug, f.product.ID)
	if e != nil || public.SupplierAvailable {
		t.Fatal("pause not projected", e)
	}
	if _, e = f.shop.QuoteSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, f.product.CurrentRelease, "1"); e == nil {
		t.Fatal("paused quote")
	}
}
func TestNexusCheckoutCodesPrivateAndClosedOrder(t *testing.T) {
	f := nexusCheckoutFixture(t, true)
	ctx := t.Context()
	base := f.payment.base
	q := f.quote(t)
	d, e := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, f.acceptance(q))
	if e != nil {
		t.Fatal(e)
	}
	purchase, e := base.auth.client.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(d.OrderID)).Only(ctx)
	if e != nil {
		t.Fatal(e)
	}
	reveal := func(p *identity.Principal) (keys []suppliers.DeliveredKey, err error) {
		err = base.auth.service.AuthorizedTransaction(ctx, p, "account", true, func(tx *ent.Tx, current *identity.Principal) error {
			keys, err = f.worker.RevealCodesInTransaction(ctx, tx, current, d.OrderID)
			return err
		})
		return keys, err
	}
	if _, e = reveal(base.buyer); e == nil {
		t.Fatal("unpaid codes")
	}
	payPurchase(t, f.payment, d.OrderID)
	f.provider.result.Status = "completed"
	f.provider.result.Keys = []suppliers.DeliveredKey{{Code: "synthetic-delivery-secret"}}
	if e = f.worker.Dispatch(ctx, purchase.ID); e != nil {
		t.Fatal(e)
	}
	keys, e := reveal(base.buyer)
	if e != nil || len(keys) != 1 || keys[0].Code != "synthetic-delivery-secret" {
		t.Fatal("owner codes", e)
	}
	if _, e = reveal(base.admin); e == nil {
		t.Fatal("staff impersonated customer")
	}
	delivery, e := f.shop.Delivery(ctx, base.buyer, d.OrderID, false)
	raw, marshalErr := json.Marshal(delivery)
	if marshalErr != nil {
		t.Fatal(marshalErr)
	}
	if e != nil || strings.Contains(string(raw), "synthetic-delivery-secret") {
		t.Fatal("ordinary delivery leaked codes", e)
	}
	if _, e = base.auth.client.Order.UpdateOneID(d.OrderID).SetState(order.StateCancelled).Save(ctx); e != nil {
		t.Fatal(e)
	}
	if _, e = reveal(base.buyer); e == nil {
		t.Fatal("closed order revealed codes")
	}
}
func TestSupplierCheckoutMigratedStartupAndForwardOnly(t *testing.T) {
	db := testDB(t)
	m := runner(t, db)
	if e := m.Apply(t.Context(), 46); e != nil {
		t.Fatal(e)
	}
	if database.Ready(t.Context(), db) == nil {
		t.Fatal("old schema ready")
	}
	if e := m.Apply(t.Context(), 0); e != nil {
		t.Fatal(e)
	}
	if e := database.Ready(t.Context(), db); e != nil {
		t.Fatal(e)
	}
	if e := m.Down(t.Context(), 1); e == nil || !strings.Contains(e.Error(), "forward-only") {
		t.Fatal("unsafe downgrade", e)
	}
}

func TestNexusCheckoutFreshMarkupOverrideAndDraftRefresh(t *testing.T) {
	f := nexusCheckoutFixture(t, false)
	ctx := t.Context()
	base := f.payment.base
	row, err := base.auth.client.SupplierPrice.Query().Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	markup := 2000
	price, err := f.library.SetPrice(ctx, base.admin, suppliers.NexusSandbox, f.preparation.ProductID, "default", supply.PriceInput{Version: row.Version, ImportID: f.preparation.ImportID, GameID: base.game.ID, Region: "Test region", DeliveryMethod: "id", MarkupBPS: &markup})
	if err != nil {
		t.Fatal(err)
	}
	// Saved private edits do not silently change the released checkout.
	if q := f.quote(t); q.AmountMinor != "1234" {
		t.Fatal("private settings changed live price")
	}
	input := f.preparation
	input.PriceVersion = price.Version
	input.ShopVersion = f.product.Version
	refreshed, err := f.shop.PrepareSupplier(ctx, base.admin, input)
	if err != nil {
		t.Fatal("refresh", err)
	}
	if refreshed.Definition.Asset != f.product.Definition.Asset || refreshed.Definition.Policy.RefundTerms != f.product.Definition.Policy.RefundTerms || refreshed.Definition.Reviewed {
		t.Fatal("authored terms lost or new binding silently reviewed")
	}
	if _, err = f.shop.PrepareSupplier(ctx, base.admin, input); !errors.Is(err, shop.ErrConflict) {
		t.Fatal("stale refresh accepted", err)
	}
	refreshed.Definition.Reviewed = true
	refreshed, err = f.shop.Save(ctx, base.admin, refreshed.ID, refreshed.Version, refreshed.Definition)
	if err != nil {
		t.Fatal(err)
	}
	published, err := f.shop.Change(ctx, base.admin, refreshed.ID, refreshed.Version, "publish")
	if err != nil {
		t.Fatal(err)
	}
	f.product = published
	f.provider.quote.TotalCost = "2.005"
	if q := f.quote(t); q.AmountMinor != "241" {
		t.Fatal("fresh price/markup rounding", q.AmountMinor)
	}
	// The production process cannot enable Sandbox purchasing through this route.
	configs := []suppliers.Config{{Connection: suppliers.NexusSandbox, Token: "101:synthetic-test-token"}}
	controls, err := supply.FromConfig(base.auth.client, base.auth.service, configs)
	if err != nil {
		t.Fatal(err)
	}
	conn, err := base.auth.client.SupplierConnection.Get(ctx, string(suppliers.NexusSandbox))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = controls.SetPurchases(ctx, base.admin, suppliers.NexusSandbox, conn.Version, true); !errors.Is(err, suppliers.ErrReadOnly) {
		t.Fatal("missing process switch enabled buying", err)
	}
}

func TestNexusCheckoutPausedWakePartialAndActionGuards(t *testing.T) {
	f := nexusCheckoutFixture(t, false)
	base, ctx := f.payment.base, t.Context()
	d, err := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, f.acceptance(f.quote(t)))
	if err != nil {
		t.Fatal(err)
	}
	purchase, err := base.auth.client.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(d.OrderID)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.worker.PendingAction(ctx, base.auth.service, base.buyer, d.OrderID); err == nil {
		t.Fatal("unpaid action")
	}
	if err = f.worker.WakePaid(ctx); err != nil {
		t.Fatal(err)
	}
	var jobsBefore int
	if err = base.auth.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM jobs WHERE kind='supplier.dispatch'").Scan(&jobsBefore); err != nil || jobsBefore != 0 {
		t.Fatal("unpaid wake", err, jobsBefore)
	}
	payPurchase(t, f.payment, d.OrderID)
	if _, err = base.auth.client.SupplierConnection.UpdateOneID(string(suppliers.NexusSandbox)).SetPurchasesEnabled(false).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if err = f.worker.Dispatch(ctx, purchase.ID); err == nil || f.provider.calls.Load() != 0 {
		t.Fatal("paused dispatch", err)
	}
	available, err := f.shop.List(ctx, base.admin, shop.Filters{Availability: "available"})
	if err != nil || len(available.Items) != 1 || available.Items[0].Supplier {
		t.Fatal("paused staff availability", err)
	}
	if _, err = base.auth.client.SupplierConnection.UpdateOneID(string(suppliers.NexusSandbox)).SetPurchasesEnabled(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	base.auth.clock.Add(61)
	if err = f.worker.WakePaid(ctx); err != nil {
		t.Fatal(err)
	}
	if err = f.worker.Dispatch(ctx, purchase.ID); err != nil || f.provider.calls.Load() != 1 {
		t.Fatal("resumed dispatch", err)
	}
	if action, e := f.worker.PendingAction(ctx, base.auth.service, base.buyer, d.OrderID); e != nil || action.Kind != "none" {
		t.Fatal("own pending action", e)
	}
	if _, err = f.worker.PendingAction(ctx, base.auth.service, base.admin, d.OrderID); err == nil {
		t.Fatal("staff action disclosure")
	}
	base.auth.clock.Add(601)
	if _, err = f.worker.PendingAction(ctx, base.auth.service, base.buyer, d.OrderID); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("stale protected action", err)
	}
	delivered := suppliers.Decimal("0.5")
	f.provider.result.Status = "partially_completed"
	f.provider.result.Delivered = &delivered
	if err = f.worker.Reconcile(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	row, err := base.auth.client.Order.Get(ctx, d.OrderID)
	if err != nil || row.State != order.StateOnHold {
		t.Fatal("partial incorrectly complete", err)
	}
	view, err := f.shop.Delivery(ctx, base.buyer, d.OrderID, false)
	if err != nil || view.State != "partial" || !view.Supplier.NeedsReview || view.Supplier.Delivered != "0.5" {
		t.Fatal("partial guidance", err)
	}
	if err = f.worker.Dispatch(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	if f.provider.calls.Load() != 1 {
		t.Fatal("partial repurchased")
	}
}

func TestNexusCheckoutVisibilityPrecedesPagination(t *testing.T) {
	f := nexusCheckoutFixture(t, false)
	base, ctx := f.payment.base, t.Context()
	released, err := base.auth.client.ShopProductRelease.Get(ctx, f.product.CurrentRelease)
	if err != nil {
		t.Fatal(err)
	}
	binding, err := base.auth.client.SupplierBinding.Get(ctx, f.product.CurrentRelease)
	if err != nil {
		t.Fatal(err)
	}
	hidden := *binding.Data
	hidden.MerchantID = "202"
	for i := 1; i <= 51; i++ {
		id := fmt.Sprintf("00000000-0000-4000-8000-%012d", i)
		releaseID := fmt.Sprintf("00000000-0001-4000-8000-%012d", i)
		if _, err = base.auth.client.ShopProduct.Create().SetID(id).SetGameID(base.game.ID).SetGameName("Synthetic").SetSlug(fmt.Sprintf("hidden-%d", i)).SetDraft(released.Data).SetTitle("Hidden merchant").SetState("published").SetCurrentRelease(releaseID).Save(ctx); err != nil {
			t.Fatal(err)
		}
		if _, err = base.auth.client.ShopProductRelease.Create().SetID(releaseID).SetProductID(id).SetVersion(1).SetData(released.Data).Save(ctx); err != nil {
			t.Fatal(err)
		}
		if _, err = base.auth.client.SupplierBinding.Create().SetID(releaseID).SetReleaseID(releaseID).SetShopProductID(id).SetData(&hidden).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	page, err := f.shop.Browse(ctx, shop.BrowseInput{Slug: base.game.Slug})
	if err != nil || len(page.Items) != 2 || page.Next != "" {
		t.Fatal("hidden rows displaced current offers", err, len(page.Items), page.Next)
	}
	f.shop.WithSupplier(nil)
	page, err = f.shop.Browse(ctx, shop.BrowseInput{Slug: base.game.Slug})
	if err != nil || len(page.Items) != 1 || page.Items[0].Definition.Supplier != nil || page.Next != "" {
		t.Fatal("disabled integration hid own products", err, len(page.Items))
	}
}

func TestNexusPurchasingControlsRequireOwnerFreshnessAndTestOptIn(t *testing.T) {
	f := nexusCheckoutFixture(t, false)
	base, ctx := f.payment.base, t.Context()
	controls, err := supply.FromConfig(base.auth.client, base.auth.service, []suppliers.Config{{Connection: suppliers.NexusSandbox, Token: "101:synthetic-token", TestOrdersEnabled: true}})
	if err != nil {
		t.Fatal(err)
	}
	conn, err := base.auth.client.SupplierConnection.Get(ctx, string(suppliers.NexusSandbox))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = controls.SetPurchases(ctx, base.buyer, suppliers.NexusSandbox, conn.Version, false); err == nil {
		t.Fatal("customer controls supplier")
	}
	if _, err = controls.SetPurchases(ctx, base.admin, suppliers.NexusSandbox, conn.Version, false); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("administrator changed owner purchasing control", err)
	}
	if _, err = base.auth.client.User.UpdateOneID(base.admin.User.ID).SetRole(identity.RoleOwner).Save(ctx); err != nil {
		t.Fatal(err)
	}
	base.admin = base.auth.principalFromSession(t, base.admin)
	paused, err := controls.SetPurchases(ctx, base.admin, suppliers.NexusSandbox, conn.Version, false)
	if err != nil || paused.PurchasesEnabled {
		t.Fatal("owner pause", err)
	}
	if _, err = controls.SetPurchases(ctx, base.admin, suppliers.NexusSandbox, conn.Version, true); err == nil {
		t.Fatal("stale control accepted")
	}
	enabled, err := controls.SetPurchases(ctx, base.admin, suppliers.NexusSandbox, paused.Version, true)
	if err != nil || !enabled.PurchasesEnabled {
		t.Fatal("explicit test enable", err)
	}
	if _, err = controls.SetPurchases(ctx, base.admin, suppliers.NexusProduction, 1, true); !errors.Is(err, suppliers.ErrReadOnly) {
		t.Fatal("live enable allowed", err)
	}
	base.auth.clock.Add(601)
	if _, err = controls.SetPurchases(ctx, base.admin, suppliers.NexusSandbox, enabled.Version, false); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("stale admin control", err)
	}
}
