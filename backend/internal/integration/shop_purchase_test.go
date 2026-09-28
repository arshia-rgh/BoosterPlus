//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reviews"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
)

func shopPurchaseFixture(t *testing.T) (*paymentFixture, *shop.Store, shop.Draft, shop.ReserveInput) {
	t.Helper()
	f := paymentDB(t)
	ctx := t.Context()
	config := f.base.game.Configuration
	config.ReviewPolicy = &catalog.ReviewPolicy{Content: "Synthetic review policy permits honest feedback without private data.", Fields: []catalog.Field{}, Rules: []catalog.Rule{}}
	config.Discovery = &catalog.Discovery{Capabilities: catalog.Capabilities(config, false)}
	for i := range config.Discovery.Capabilities {
		if config.Discovery.Capabilities[i].Service == "shop" {
			config.Discovery.Capabilities[i].State = "active"
		}
	}
	saved, err := f.base.catalog.Mutate(ctx, f.base.admin, f.base.game.ID, "save", catalog.Change{Revision: f.base.game.Revision, Configuration: config})
	if err != nil {
		t.Fatal(err)
	}
	f.base.game, err = f.base.catalog.Mutate(ctx, f.base.admin, saved.ID, "publish", catalog.Change{Revision: saved.Revision})
	if err != nil {
		t.Fatal(err)
	}
	store := shopStore(f.base)
	definition := shopDefinition()
	definition.Policy.ReviewEnabled = true
	definition.Policy.ReviewTerms = "Synthetic completed-purchase review invitation terms."
	product, err := store.Create(ctx, f.base.admin, f.base.game.ID, definition)
	if err != nil {
		t.Fatal(err)
	}
	product, err = store.Change(ctx, f.base.admin, product.ID, product.Version, "publish")
	if err != nil {
		t.Fatal(err)
	}
	product, err = store.SetStock(ctx, f.base.admin, product.ID, shop.StockChange{Version: product.Version, StockVersion: product.Stocks[0].Version, VariantKey: "fixture", Total: 3, Reason: "Three synthetic units for isolated testing."})
	if err != nil {
		t.Fatal(err)
	}
	input := shop.ReserveInput{RequestKey: uuid.NewString(), ReleaseID: product.CurrentRelease, Variant: "fixture", Quantity: 1, ExpectedAmount: "1234", Currency: "USD", Recipient: map[string]string{"player_id": "synthetic-destination"}, AcceptTerms: true, TermsVersion: f.base.auth.cfg.TermsVersion}
	return f, store, product, input
}
func TestShopPurchaseVerifiedEndToEndAndPrivateSnapshot(t *testing.T) {
	f, store, product, input := shopPurchaseFixture(t)
	ctx := t.Context()
	page, err := store.Browse(ctx, shop.BrowseInput{Slug: f.base.game.Slug, Search: "Synthetic", Region: "Test region", Category: "Fixture"})
	if err != nil || len(page.Items) != 1 {
		t.Fatal("browse", err)
	}
	published, err := store.Published(ctx, f.base.game.Slug, product.ID)
	if err != nil || published.Available["fixture"] != 3 {
		t.Fatal("published", err)
	}
	purchase, err := store.Reserve(ctx, f.base.buyer, f.base.game.Slug, product.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	repeated, err := store.Reserve(ctx, f.base.buyer, f.base.game.Slug, product.ID, input)
	if err != nil || repeated.OrderID != purchase.OrderID {
		t.Fatal("duplicate reservation", err)
	}
	row, err := f.base.auth.client.Order.Get(ctx, purchase.OrderID)
	if err != nil || len(row.Answers) != 0 || row.ShopSnapshot["recipient"] != nil {
		t.Fatal("private recipient entered order snapshot", err)
	}
	detail, err := f.base.store.Get(ctx, f.base.buyer, purchase.OrderID, false)
	if err != nil || detail.Contract.Data.AmountMinor != "1234" {
		t.Fatal("accepted price", err)
	}
	if _, err = store.ChangeDelivery(ctx, f.base.admin, purchase.OrderID, "claim", shop.DeliveryChange{OrderVersion: purchase.OrderVersion, Note: "Unpaid shop delivery must remain blocked."}); err == nil {
		t.Fatal("unpaid fulfillment")
	}
	attempt := f.start(t, detail)
	f.issue(t, attempt)
	if record := f.reconcile(t, f.evidence(t, attempt, "970", "finished", "12.34000001")); record.State != "settled" {
		t.Fatal(record.Issue)
	}
	// A malformed historical boost record must not create a boost percentage for a shop order.
	if _, err = f.base.auth.client.Fulfillment.Create().SetOrderID(purchase.OrderID).SetAssignedID(f.base.admin.User.ID).SetMode("account").SetProgress(75).SetCurrentNote("Malformed isolated legacy fixture").SetAnswers(map[string]any{}).Save(ctx); err != nil {
		t.Fatal(err)
	}
	overview, err := f.base.store.AccountOverview(ctx, f.base.buyer)
	if err != nil || len(overview.Active) != 1 || len(overview.Progress) != 0 {
		t.Fatal("shop overview invented boost progress", err)
	}
	deliveryChange(t, f, store, purchase.OrderID, "claim", "")
	if _, err = supportStore(f.base).Create(ctx, f.base.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "order", OrderID: purchase.OrderID, Subject: "Synthetic shop support"}); err != nil {
		t.Fatal(err)
	}
	message, _ := shopDeliveryProof(t, f, purchase.OrderID)
	deliveryChange(t, f, store, purchase.OrderID, "submit", message.ID)
	queue, err := f.base.store.List(ctx, f.base.admin, true, "", "", "", orders.Filters{Kind: "shop", Delivery: "submitted", Assigned: f.base.admin.User.ID})
	if err != nil || len(queue.Orders) != 1 || queue.Orders[0].Staff.AssignedID != f.base.admin.User.ID {
		t.Fatal("review queue", err)
	}
	completed := deliveryChange(t, f, store, purchase.OrderID, "approve", "")
	if completed.State != "completed" {
		t.Fatal("completion")
	}
	feedback := reviews.New(f.base.auth.client, f.base.auth.service, nil)
	eligible, err := feedback.ForOrder(ctx, f.base.buyer, purchase.OrderID)
	if err != nil || !eligible.Eligible {
		t.Fatal("reviewed shop purchase should be eligible", err)
	}
	// Current draft changes cannot rewrite the already accepted review terms.
	changed := product.Definition
	changed.Policy.ReviewEnabled = false
	if _, err = store.Save(ctx, f.base.admin, product.ID, product.Version, changed); err != nil {
		t.Fatal(err)
	}
	eligible, err = feedback.ForOrder(ctx, f.base.buyer, purchase.OrderID)
	if err != nil || !eligible.Eligible {
		t.Fatal("draft rewrote accepted review terms", err)
	}
	if _, err = f.base.auth.client.PaymentReceipt.Update().SetState("review_required").Save(ctx); err != nil {
		t.Fatal(err)
	}
	eligible, err = feedback.ForOrder(ctx, f.base.buyer, purchase.OrderID)
	if err != nil || eligible.Eligible {
		t.Fatal("unconfirmed payment granted review", err)
	}
}
func TestShopPurchaseCapacityRaceAndRetryMismatch(t *testing.T) {
	f, store, product, input := shopPurchaseFixture(t)
	ctx := t.Context()
	var group sync.WaitGroup
	var success atomic.Int32
	for range 6 {
		group.Go(func() {
			request := input
			request.RequestKey = uuid.NewString()
			_, err := store.Reserve(ctx, f.base.buyer, f.base.game.Slug, product.ID, request)
			if err == nil {
				success.Add(1)
			} else if !errors.Is(err, shop.ErrConflict) && !errors.Is(err, identity.ErrLimited) {
				t.Errorf("unexpected reservation race error: %v", err)
			}
		})
	}
	group.Wait()
	if success.Load() != 3 {
		t.Fatal("capacity oversold or lost", success.Load())
	}
	stock, err := f.base.auth.client.ShopStock.Query().Only(ctx)
	if err != nil || stock.Reserved != 3 || stock.Committed != 0 {
		t.Fatal("inventory race", err)
	}
	rows, err := f.base.auth.client.Order.Query().All(ctx)
	if err != nil {
		t.Fatal(err)
	}
	input.RequestKey = rows[0].RequestKey
	input.Recipient = map[string]string{"player_id": "another-destination"}
	if _, err = store.Reserve(ctx, f.base.buyer, f.base.game.Slug, product.ID, input); !errors.Is(err, shop.ErrConflict) {
		t.Fatal("same key changed destination", err)
	}
}
func TestShopPurchaseGuardsAndPublicationIsolation(t *testing.T) {
	f, store, product, input := shopPurchaseFixture(t)
	ctx := t.Context()
	for _, mode := range []string{"price", "quantity", "variant", "currency", "recipient", "credentials", "release", "terms", "anonymous", "staff", "foreign_game"} {
		t.Run(mode, func(t *testing.T) {
			request := input
			request.RequestKey = uuid.NewString()
			p := f.base.buyer
			slug := f.base.game.Slug
			switch mode {
			case "price":
				request.ExpectedAmount = "1"
			case "quantity":
				request.Quantity = 3
			case "variant":
				request.Variant = "missing"
			case "currency":
				request.Currency = "EUR"
			case "recipient":
				request.Recipient = map[string]string{}
			case "credentials":
				request.Recipient = map[string]string{"player_id": "fixture", "password": "prohibited-synthetic-field"}
			case "release":
				request.ReleaseID = uuid.NewString()
			case "terms":
				request.TermsVersion = "old"
			case "anonymous":
				p = nil
			case "staff":
				p = f.base.admin
			case "foreign_game":
				slug = "other-game"
			}
			if out, err := store.Reserve(t.Context(), p, slug, product.ID, request); err == nil || out.OrderID != "" {
				t.Fatal("guard failed", mode)
			}
		})
	}
	definition := product.Definition
	definition.Title = "Unpublished draft title"
	definition.Category = "Private draft category"
	saved, err := store.Save(ctx, f.base.admin, product.ID, product.Version, definition)
	if err != nil {
		t.Fatal(err)
	}
	for _, search := range []string{"Unpublished", "%", "_"} {
		page, e := store.Browse(ctx, shop.BrowseInput{Slug: f.base.game.Slug, Search: search})
		if e != nil || len(page.Items) != 0 {
			t.Fatal("draft or wildcard leaked", search, e)
		}
	}
	published, err := store.Published(ctx, f.base.game.Slug, product.ID)
	if err != nil || published.Definition.Title != shopDefinition().Title {
		t.Fatal("draft became public", err)
	}
	paused, err := store.Change(ctx, f.base.admin, product.ID, saved.Version, "pause")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.Published(ctx, f.base.game.Slug, paused.ID); !ent.IsNotFound(err) {
		t.Fatal("paused product visible", err)
	}
	count, err := f.base.auth.client.Order.Query().Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("guard created order", err)
	}
}
func TestShopPurchaseAuditFailureRollsBackAllRecords(t *testing.T) {
	f, store, product, input := shopPurchaseFixture(t)
	ctx := t.Context()
	// Destructive fault injection only in a disposable integration database.
	if _, err := f.base.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if out, err := store.Reserve(ctx, f.base.buyer, f.base.game.Slug, product.ID, input); err == nil || out.OrderID != "" {
		t.Fatal("unaudited reservation")
	}
	count, err := f.base.auth.client.Order.Query().Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("partial order", err)
	}
	count, err = f.base.auth.client.ShopRecipient.Query().Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("partial recipient", err)
	}
	stock, err := f.base.auth.client.ShopStock.Query().Only(ctx)
	if err != nil || stock.Reserved != 0 {
		t.Fatal("partial stock", err)
	}
}

func TestShopPublishedFiltersPrecedePaginationAndUseReleasedFields(t *testing.T) {
	f, store, product, _ := shopPurchaseFixture(t)
	ctx := t.Context()
	// Synthetic bulk rows make a deterministic 51+ page without public authoring rate limits.
	for range 51 {
		definition := shopDefinition()
		definition.Title = "Pagination target"
		definition.Category = "Published category"
		row, err := f.base.auth.client.ShopProduct.Create().SetGameID(f.base.game.ID).SetSlug(uuid.NewString()).SetGameName(f.base.game.Configuration.Name).SetTitle("Private draft").SetDraft(shopPurchaseDocument(t, definition)).SetState("published").Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		release, err := f.base.auth.client.ShopProductRelease.Create().SetProductID(row.ID).SetVersion(1).SetData(shopPurchaseDocument(t, definition)).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = f.base.auth.client.ShopProduct.UpdateOne(row).SetCurrentRelease(release.ID).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	page, err := store.Browse(ctx, shop.BrowseInput{Slug: f.base.game.Slug, Search: "Pagination", Category: "Published category"})
	if err != nil || len(page.Items) != 50 || page.Next == "" {
		t.Fatal("first page", len(page.Items), err)
	}
	seen := map[string]bool{}
	for _, item := range page.Items {
		if item.ID == product.ID || item.Definition.Title != "Pagination target" {
			t.Fatal("filter or draft leak")
		}
		seen[item.ID] = true
	}
	next, err := store.Browse(ctx, shop.BrowseInput{Slug: f.base.game.Slug, Search: "Pagination", Category: "Published category", After: page.Next})
	if err != nil || len(next.Items) != 1 || next.Next != "" || seen[next.Items[0].ID] {
		t.Fatal("next page duplicate or missing", err)
	}
}

func shopPurchaseDocument(t *testing.T, value any) map[string]any {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	var out map[string]any
	if err = json.Unmarshal(raw, &out); err != nil {
		t.Fatal(err)
	}
	return out
}
