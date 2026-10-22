//go:build integration

package integration

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/supply"
)

func TestSupplierMerchantFenceAndPausedReconciliation(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	worker, provider, purchase, id := purchaseFixture(t, f)
	if purchase.MerchantID != "101" {
		t.Fatal("attempt has no merchant binding")
	}
	payPurchase(t, f, id)
	provider.merchant = "202"
	if err := worker.Dispatch(ctx, purchase.ID); !errors.Is(err, supply.ErrUnavailable) || provider.calls.Load() != 0 {
		t.Fatal("changed shop issued purchase", err)
	}
	provider.merchant = "101"
	connection := string(provider.connection)
	if _, err := f.base.auth.client.SupplierConnection.UpdateOneID(connection).SetPurchasesEnabled(false).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if err := worker.Dispatch(ctx, purchase.ID); !errors.Is(err, suppliers.ErrReadOnly) || provider.calls.Load() != 0 {
		t.Fatal("paused shop issued purchase", err)
	}
	if _, err := f.base.auth.client.SupplierConnection.UpdateOneID(connection).SetPurchasesEnabled(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	provider.beforeQuote = func() {
		if _, err := f.base.auth.client.SupplierConnection.UpdateOneID(connection).SetPurchasesEnabled(false).Save(ctx); err != nil {
			t.Error(err)
		}
	}
	if err := worker.Dispatch(ctx, purchase.ID); !errors.Is(err, suppliers.ErrReadOnly) || provider.calls.Load() != 0 {
		t.Fatal("pause during quote ignored", err)
	}
	provider.beforeQuote = nil
	f.base.auth.clock.Add(int64(3 * time.Minute / time.Second))
	if _, err := f.base.auth.client.SupplierConnection.UpdateOneID(connection).SetPurchasesEnabled(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if err := worker.Dispatch(ctx, purchase.ID); err != nil || provider.calls.Load() != 1 {
		t.Fatal("qualified purchase failed", err)
	}
	if _, err := f.base.auth.client.SupplierConnection.UpdateOneID(connection).SetPurchasesEnabled(false).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if err := worker.Reconcile(ctx, purchase.ID); err != nil || provider.calls.Load() != 1 {
		t.Fatal("pause blocked existing obligation read", err)
	}
	provider.merchant = "202"
	if err := worker.Reconcile(ctx, purchase.ID); !errors.Is(err, supply.ErrUnavailable) {
		t.Fatal("changed merchant read old obligation", err)
	}
	if err := worker.RecordStatusSignal(ctx, provider.connection, []byte("fixture"), []string{"synthetic-signature"}); !errors.Is(err, supply.ErrUnavailable) {
		t.Fatal("wrong merchant accepted callback", err)
	}
	provider.merchant = "101"
	mux := http.NewServeMux()
	worker.RegisterCallbacks(mux)
	for range 2 {
		r := httptest.NewRequestWithContext(ctx, http.MethodPost, "/api/v1/webhooks/suppliers/vendoria-test", strings.NewReader(`{}`))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Sign", "synthetic-signature")
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != 204 || w.Body.Len() != 0 {
			t.Fatal("callback not accepted", w.Code)
		}
	}
	if count, err := f.base.auth.client.SupplierSignal.Query().Count(ctx); err != nil || count != 1 {
		t.Fatal("callback replay not fenced", err)
	}
	if provider.calls.Load() != 1 {
		t.Fatal("callback created another purchase")
	}
}

func TestSupplierImportMerchantSwitchCannotReplaceCatalog(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store, reader := supplierFixture(t, f)
	run, err := store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	reader.before = func() { reader.merchant = "202" }
	if err = store.ImportHandler()(ctx, supplierImportJob(t, run.ID)); !errors.Is(err, supply.ErrConflict) {
		t.Fatal("cross-merchant import finalized", err)
	}
	conn, err := f.auth.client.SupplierConnection.Get(ctx, string(suppliers.NexusSandbox))
	if err != nil || conn.MerchantID != "101" || conn.CurrentImport != "" {
		t.Fatal("catalog identity rewritten", err)
	}
	reader.merchant, reader.before = "101", nil
	if err = store.CancelImport(ctx, f.admin, run.ID); err != nil {
		t.Fatal(err)
	}
	run, err = store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	if err = store.ImportHandler()(ctx, supplierImportJob(t, run.ID)); err != nil {
		t.Fatal(err)
	}
	reader.merchant = "202"
	if _, err = store.RequestImport(ctx, f.admin, suppliers.NexusSandbox, uuid.NewString()); !errors.Is(err, supply.ErrConflict) {
		t.Fatal("new shop silently inherited catalog", err)
	}
	conn, err = f.auth.client.SupplierConnection.Get(ctx, string(suppliers.NexusSandbox))
	if err != nil || conn.CurrentImport != run.ID || conn.MerchantID != "101" {
		t.Fatal("previous catalog lost", err)
	}
}

func TestSupplierMerchantMigrationStartupAndForwardOnly(t *testing.T) {
	db := testDB(t)
	migration := runner(t, db)
	if err := migration.Apply(t.Context(), 45); err != nil {
		t.Fatal(err)
	}
	if database.Ready(t.Context(), db) == nil {
		t.Fatal("unbound schema accepted")
	}
	if err := migration.Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err != nil {
		t.Fatal("migrated startup failed", err)
	}
	// Later reversible migrations must not hide the schema46 forward-only fence.
	if err := migration.Down(t.Context(), database.SchemaVersion-45); err == nil || !strings.Contains(err.Error(), "forward-only") {
		t.Fatal("merchant evidence downgrade accepted", err)
	}
	if _, err := db.ExecContext(t.Context(), "ALTER TABLE supplier_purchases DROP COLUMN merchant_id"); err != nil {
		t.Fatal(err)
	}
	if database.Ready(t.Context(), db) == nil {
		t.Fatal("merchant column drift accepted")
	}
}
