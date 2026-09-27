//go:build integration

package integration

import (
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopstock"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shopevents"
)

func TestShopStockCommitmentsDuplicateAllocationAndLateFunds(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := shopStore(f)
	now := time.Unix(f.auth.clock.Load(), 0)
	product, err := store.Create(ctx, f.admin, f.game.ID, shopDefinition())
	if err != nil {
		t.Fatal(err)
	}
	product, err = store.Change(ctx, f.admin, product.ID, product.Version, "publish")
	if err != nil {
		t.Fatal(err)
	}
	product, err = store.SetStock(ctx, f.admin, product.ID, shop.StockChange{Version: product.Version, StockVersion: product.Stocks[0].Version, VariantKey: "fixture", Total: 5, Reason: "Five synthetic capacity units verified."})
	if err != nil {
		t.Fatal(err)
	}
	purchases := []*ent.Order{}
	for range 2 {
		row, e := f.auth.client.Order.Create().SetUserID(f.buyer.User.ID).SetGameID(f.game.ID).SetGameName("Synthetic shop game").SetSlug(f.game.Slug).SetService("shop").SetKind(order.KindShop).SetShopProductID(product.ID).SetVariantKey("fixture").SetRequestKey(uuid.NewString()).SetRequestHash(strings.Repeat("a", 64)).SetState(order.StateAwaitingPayment).SetAnswers(map[string]any{}).SetSnapshot(map[string]any{}).SetEstimate(map[string]any{}).SetTermsVersion("test-v1").Save(ctx)
		if e != nil {
			t.Fatal(e)
		}
		if _, e = f.auth.client.ShopReservation.Create().SetOrderID(row.ID).SetUserID(row.UserID).SetProductID(product.ID).SetReleaseID(product.CurrentRelease).SetVariantKey("fixture").SetQuantity(2).SetExpiresAt(now.Add(30 * time.Minute)).Save(ctx); e != nil {
			t.Fatal(e)
		}
		purchases = append(purchases, row)
	}
	current, err := f.auth.client.ShopStock.Query().Where(shopstock.ProductIDEQ(product.ID)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.client.ShopStock.UpdateOne(current).SetReserved(4).Save(ctx); err != nil {
		t.Fatal(err)
	}
	transact := func(work func(*ent.Tx) error) error {
		return f.auth.service.StaffTransaction(ctx, f.admin, false, func(tx *ent.Tx, _ *identity.Principal) error { return work(tx) })
	}
	for range 2 {
		if err = transact(func(tx *ent.Tx) error { return shopevents.ReleaseUnpaid(ctx, tx, purchases[0], now) }); err != nil {
			t.Fatal(err)
		}
	}
	var workers sync.WaitGroup
	for range 4 {
		workers.Go(func() {
			if e := transact(func(tx *ent.Tx) error { return shopevents.Allocate(ctx, tx, purchases[1], now) }); e != nil {
				t.Error(e)
			}
		})
	}
	workers.Wait()
	if err = transact(func(tx *ent.Tx) error { return shopevents.Allocate(ctx, tx, purchases[0], now) }); !errors.Is(err, shopevents.ErrConflict) {
		t.Fatal("late released reservation allocated", err)
	}
	current, err = f.auth.client.ShopStock.Get(ctx, current.ID)
	if err != nil {
		t.Fatal(err)
	}
	if current.Total != 5 || current.Reserved != 0 || current.Committed != 2 {
		t.Fatal("duplicate settlement/release changed quantities", current.Total, current.Reserved, current.Committed)
	}
	if err = transact(func(tx *ent.Tx) error { return shopevents.CancelPaid(ctx, tx, purchases[1], now) }); err != nil {
		t.Fatal(err)
	}
	current, err = f.auth.client.ShopStock.Get(ctx, current.ID)
	if err != nil {
		t.Fatal(err)
	}
	if current.Committed != 2 {
		t.Fatal("refund silently restocked units")
	}
	// A publication can retire a SKU but must preserve paid commitments.
	product, err = store.Draft(ctx, f.admin, product.ID)
	if err != nil {
		t.Fatal(err)
	}
	value := product.Definition
	value.Variants[0].Region = "Different compatibility"
	product, err = store.Save(ctx, f.admin, product.ID, product.Version, value)
	if err != nil {
		t.Fatal(err)
	}
	preview, err := store.Preview(ctx, f.admin, product.ID)
	if err != nil || len(preview.Issues) == 0 {
		t.Fatal("compatibility change absent from preview", err)
	}
	_, err = store.Change(ctx, f.admin, product.ID, product.Version, "publish")
	var invalid *shop.Invalid
	if !errors.As(err, &invalid) {
		t.Fatal("published SKU compatibility changed", err)
	}
	current, err = f.auth.client.ShopStock.Get(ctx, current.ID)
	if err != nil || !current.Enabled || current.Committed != 2 {
		t.Fatal("failed publication changed stock", err)
	}
	value.Variants[0].Key = "replacement"
	product, err = store.Save(ctx, f.admin, product.ID, product.Version, value)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.Change(ctx, f.admin, product.ID, product.Version, "publish"); err != nil {
		t.Fatal(err)
	}
	current, err = f.auth.client.ShopStock.Get(ctx, current.ID)
	if err != nil {
		t.Fatal(err)
	}
	if current.Enabled || current.Committed != 2 {
		t.Fatal("retired variant lost commitments or remained offered")
	}
}

func TestShopStockCheckoutCannotReviveExpiredReservation(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	now := time.Unix(f.auth.clock.Load(), 0)
	row, err := f.auth.client.Order.Create().SetUserID(f.buyer.User.ID).SetGameID(f.game.ID).SetGameName("Synthetic shop game").SetSlug(f.game.Slug).SetService("shop").SetKind(order.KindShop).SetShopProductID(uuid.NewString()).SetVariantKey("fixture").SetRequestKey(uuid.NewString()).SetRequestHash(strings.Repeat("b", 64)).SetState(order.StateAwaitingPayment).SetAnswers(map[string]any{}).SetSnapshot(map[string]any{}).SetEstimate(map[string]any{}).SetTermsVersion("test-v1").Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	reservation, err := f.auth.client.ShopReservation.Create().SetOrderID(row.ID).SetUserID(row.UserID).SetProductID(row.ShopProductID).SetReleaseID(uuid.NewString()).SetVariantKey("fixture").SetQuantity(1).SetExpiresAt(now).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	apply := func() error {
		return f.auth.service.StaffTransaction(ctx, f.admin, false, func(tx *ent.Tx, _ *identity.Principal) error {
			return shopevents.Checkout(ctx, tx, row, now.Add(time.Hour), now)
		})
	}
	if err = apply(); !errors.Is(err, shopevents.ErrConflict) {
		t.Fatal("expired reservation extended", err)
	}
	if _, err = f.auth.client.ShopReservation.UpdateOne(reservation).SetExpiresAt(now.Add(time.Minute)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if err = apply(); err != nil {
		t.Fatal(err)
	}
	reservation, err = f.auth.client.ShopReservation.Get(ctx, reservation.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !reservation.ExpiresAt.Equal(now.Add(time.Hour)) {
		t.Fatal("invoice deadline not preserved")
	}
}

func TestShopOrdersExcludedFromBoosterWorkEvenWithLegacyAssignment(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	purchase := f.paid(t, "solo")
	work := f.assign(t, purchase)
	// Deliberately corrupt only this disposable fixture to prove kind checks do
	// not rely solely on a missing fulfillment row or an absent legacy assignment.
	if _, err := f.auth.db.ExecContext(ctx, "UPDATE orders SET kind = ? WHERE id = ?", string(order.KindShop), purchase.Order.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := f.work.Get(ctx, f.booster, purchase.Order.ID, "booster"); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("shop order reached booster view", err)
	}
	if _, err := f.work.Assign(ctx, f.admin, purchase.Order.ID, fulfillment.Assignment{Version: work.Version, OrderVersion: work.OrderVersion, AssignedID: f.second.User.ID, Reason: "Shop work must not be assigned to a booster"}); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("shop assigned through boost workflow", err)
	}
	list, err := f.work.ListFiltered(ctx, f.booster, "booster", fulfillment.ListFilters{})
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range list.Items {
		if item.OrderID == purchase.Order.ID {
			t.Fatal("shop leaked into booster queue")
		}
	}
	if _, err = f.store.Create(ctx, f.buyer, f.input("shop")); err == nil {
		t.Fatal("generic boost create accepted undeclared shop purchase")
	}
}
