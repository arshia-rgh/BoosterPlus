//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopstock"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
)

func shopDefinition() shop.Definition {
	return shop.Definition{Title: "Synthetic fixture item", Description: "Isolated integration fixture; never a commercial offer.", Category: "Fixture", Asset: "/catalog-assets/test.webp", AssetAlt: "Synthetic fixture item", AssetSource: "Synthetic test artwork only.", Reviewed: true,
		Variants:  []shop.Variant{{Key: "fixture", Label: "Test variant", Region: "Test region", Platform: "Test platform", Server: "Test server", Currency: "USD", UnitAmountMinor: "1234", MinQuantity: 1, MaxQuantity: 2, Enabled: true}},
		Recipient: []shop.RecipientField{{Key: "player_id", Label: "Player identifier", Help: "Fixture delivery identifier only.", Required: true, MaxLength: 80}},
		Policy:    shop.Policy{DeliveryMinHours: 1, DeliveryMaxHours: 24, ReservationMinutes: 30, EvidenceRequired: true, DeliveryTerms: "Explicit fixture delivery terms.", CancellationTerms: "Explicit fixture cancellation terms.", RefundTerms: "Explicit fixture refund terms.", Fees: "Explicit fixture included fees."}}
}
func shopStore(f *orderFixture) *shop.Store {
	return shop.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
}
func TestShopCatalogPublicationStockAndAuthority(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := shopStore(f)
	value := shopDefinition()
	for _, principal := range []*identity.Principal{nil, f.buyer, {User: f.admin.User, Session: f.buyer.Session}} {
		if _, err := store.Create(ctx, principal, f.game.ID, value); err == nil {
			t.Fatal("unauthorized authoring")
		}
	}
	row, err := store.Create(ctx, f.admin, f.game.ID, value)
	if err != nil {
		t.Fatal(err)
	}
	if row.State != "draft" || row.CurrentRelease != "" || len(row.Stocks) != 0 {
		t.Fatal("draft became purchasable")
	}
	original := row.Version
	row, err = store.Change(ctx, f.admin, row.ID, row.Version, "publish")
	if err != nil {
		t.Fatal(err)
	}
	if row.State != "published" || len(row.Stocks) != 1 || row.Stocks[0].Available != 0 {
		t.Fatal("publication invented stock")
	}
	if _, err = store.Save(ctx, f.admin, row.ID, original, value); !errors.Is(err, shop.ErrConflict) {
		t.Fatal("stale save", err)
	}
	releaseID := row.CurrentRelease
	value.Title = "Changed working title"
	row, err = store.Save(ctx, f.admin, row.ID, row.Version, value)
	if err != nil {
		t.Fatal(err)
	}
	if row.CurrentRelease != releaseID {
		t.Fatal("draft replaced published release")
	}
	history, err := store.Releases(ctx, f.admin, row.ID, 0)
	if err != nil || len(history.Items) != 1 || history.Items[0].Definition.Title == value.Title {
		t.Fatal("immutable history changed", err)
	}
	stock := row.Stocks[0]
	change := shop.StockChange{Version: row.Version, StockVersion: stock.Version, VariantKey: stock.VariantKey, Total: 3, Reason: "Reviewed explicit fixture capacity."}
	row, err = store.SetStock(ctx, f.admin, row.ID, change)
	if err != nil || row.Stocks[0].Available != 3 {
		t.Fatal("stock update", err)
	}
	if _, err = store.SetStock(ctx, f.admin, row.ID, change); !errors.Is(err, shop.ErrConflict) {
		t.Fatal("stale stock accepted", err)
	}
	if _, err = f.auth.client.ShopStock.Update().Where(shopstock.ProductIDEQ(row.ID)).SetReserved(1).SetCommitted(1).AddVersion(1).Save(ctx); err != nil {
		t.Fatal(err)
	}
	row, err = store.Draft(ctx, f.admin, row.ID)
	if err != nil {
		t.Fatal(err)
	}
	change.Version = row.Version
	change.StockVersion = row.Stocks[0].Version
	change.Total = 1
	if _, err = store.SetStock(ctx, f.admin, row.ID, change); !errors.Is(err, shop.ErrConflict) {
		t.Fatal("capacity below commitments", err)
	}
	row, err = store.Change(ctx, f.admin, row.ID, row.Version, "archive")
	if err != nil {
		t.Fatal(err)
	}
	row, err = store.Change(ctx, f.admin, row.ID, row.Version, "restore")
	if err != nil || row.State != "paused" {
		t.Fatal("restore activated sales", err)
	}
	if _, err = store.Releases(ctx, f.buyer, row.ID, 0); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer read staff publication history", err)
	}
	f.auth.clock.Add(601)
	if _, err = store.Change(ctx, f.admin, row.ID, row.Version, "resume"); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("old factors activated sales", err)
	}
	if _, err = f.auth.client.User.UpdateOneID(f.admin.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Draft(ctx, f.admin, row.ID); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("suspended staff read draft", err)
	}
}
func TestShopCatalogConcurrentEditsAndAuditRollback(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := shopStore(f)
	value := shopDefinition()
	value.Policy.RefundTerms = ""
	row, err := store.Create(ctx, f.admin, f.game.ID, value)
	if err != nil {
		t.Fatal(err)
	}
	var invalid *shop.Invalid
	if _, err = store.Change(ctx, f.admin, row.ID, row.Version, "publish"); !errors.As(err, &invalid) {
		t.Fatal("missing terms published", err)
	}
	preview, err := store.Preview(ctx, f.admin, row.ID)
	if err != nil || len(preview.Issues) == 0 {
		t.Fatal("preview hid blockers", err)
	}
	value = shopDefinition()
	var successes atomic.Int64
	var group sync.WaitGroup
	for range 4 {
		group.Go(func() {
			_, e := store.Save(ctx, f.admin, row.ID, row.Version, value)
			if e == nil {
				successes.Add(1)
			} else if !errors.Is(e, shop.ErrConflict) {
				t.Error(e)
			}
		})
	}
	group.Wait()
	if successes.Load() != 1 {
		t.Fatal("concurrent edits silently replaced each other", successes.Load())
	}
	row, err = store.Draft(ctx, f.admin, row.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Change(ctx, f.admin, row.ID, row.Version, "publish"); err == nil {
		t.Fatal("unaudited publication succeeded")
	}
	after, err := store.Draft(ctx, f.admin, row.ID)
	if err != nil || after.Version != row.Version || after.CurrentRelease != "" || len(after.Stocks) != 0 {
		t.Fatal("publication partially committed", err)
	}
	history, err := store.Releases(ctx, f.admin, row.ID, 0)
	if err != nil || len(history.Items) != 0 {
		t.Fatal("orphaned publication", err)
	}
}
func TestShopCatalogContractPaginationAndLiteralSearch(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := shopStore(f)
	raw, err := json.Marshal(shopDefinition())
	if err != nil {
		t.Fatal(err)
	}
	var data map[string]any
	if err = json.Unmarshal(raw, &data); err != nil {
		t.Fatal(err)
	}
	for i := range 53 {
		title := "Ordinary item"
		if i == 52 {
			title = "Literal%needle"
		}
		if _, err = f.auth.client.ShopProduct.Create().SetGameID(f.game.ID).SetGameName(f.game.Configuration.Name).SetSlug("test-" + strings.Repeat("x", i+1)).SetTitle(title).SetDraft(data).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	first, err := store.List(ctx, f.admin, shop.Filters{})
	if err != nil || len(first.Items) != 50 || first.Next == "" {
		t.Fatal("first page", err)
	}
	second, err := store.List(ctx, f.admin, shop.Filters{After: first.Next})
	if err != nil || len(second.Items) != 3 || second.Next != "" {
		t.Fatal("second page", err)
	}
	literal, err := store.List(ctx, f.admin, shop.Filters{Search: "%"})
	if err != nil || len(literal.Items) != 1 {
		t.Fatal("literal search", err)
	}
	current, err := store.Draft(ctx, f.admin, first.Items[0].ID)
	if err != nil {
		t.Fatal(err)
	}
	preview, err := store.Preview(ctx, f.admin, current.ID)
	if err != nil {
		t.Fatal(err)
	}
	history, err := store.Releases(ctx, f.admin, current.ID, 0)
	if err != nil {
		t.Fatal(err)
	}
	var contract any
	if err = json.Unmarshal(api.Contract, &contract); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err = compiler.AddResource("contract.json", contract); err != nil {
		t.Fatal(err)
	}
	for name, value := range map[string]any{"ShopProducts": first, "ShopProductDraft": current, "ShopPreview": preview, "ShopReleaseHistory": history} {
		encoded, e := json.Marshal(value)
		if e != nil {
			t.Fatal(e)
		}
		var decoded any
		if e = json.Unmarshal(encoded, &decoded); e != nil {
			t.Fatal(e)
		}
		schema, e := compiler.Compile("contract.json#/components/schemas/" + name)
		if e != nil {
			t.Fatal(e)
		}
		if e = schema.Validate(decoded); e != nil {
			t.Fatal(name, e)
		}
	}
}
