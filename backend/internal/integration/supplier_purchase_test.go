//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/supply"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

// This provider is compiled only for disposable database qualification. It never
// reads credentials or contacts any supplier/payment service.
type purchaseProvider struct {
	connection    suppliers.Connection
	merchant      string
	quote         suppliers.Quote
	result        suppliers.Order
	rows          []suppliers.Order
	more          bool
	createErr     error
	createEntered chan struct{}
	createWait    chan struct{}
	calls         atomic.Int32
	beforeQuote   func()
	signal        suppliers.Signal
}

func (p *purchaseProvider) Connection() suppliers.Connection { return p.connection }
func (p *purchaseProvider) MerchantID() string               { return p.merchant }
func (p *purchaseProvider) QuoteOffer(context.Context, suppliers.Product, string, suppliers.Decimal) (suppliers.Quote, error) {
	if p.beforeQuote != nil {
		p.beforeQuote()
	}
	return p.quote, nil
}
func (p *purchaseProvider) CreateOrder(ctx context.Context, input suppliers.PurchaseRequest) (suppliers.Order, error) {
	p.calls.Add(1)
	if p.createEntered != nil {
		close(p.createEntered)
	}
	if p.createWait != nil {
		select {
		case <-p.createWait:
		case <-ctx.Done():
			return suppliers.Order{}, ctx.Err()
		}
	}
	if input.Values["password"] != "synthetic-private-input" {
		return suppliers.Order{}, suppliers.ErrInvalid
	}
	return p.result, p.createErr
}

func TestSupplierPurchaseCrashFenceAndPaginatedDuplicates(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	worker, provider, purchase, id := purchaseFixture(t, f)
	payPurchase(t, f, id)
	// Simulate the durable claim surviving a process crash before its POST. A
	// missing provider result must never let the replacement worker send again.
	if _, err := f.base.auth.client.SupplierPurchase.UpdateOne(purchase).SetPostClaimed(true).SetState("sending").Save(ctx); err != nil {
		t.Fatal(err)
	}
	if err := worker.Dispatch(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	if provider.calls.Load() != 0 {
		t.Fatal("crash recovery resent POST")
	}
	provider.rows = []suppliers.Order{provider.result}
	provider.more = true
	if err := worker.Reconcile(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	row, err := f.base.auth.client.SupplierPurchase.Get(ctx, purchase.ID)
	if err != nil || row.ScanOffset != 100 || row.ProviderID != nil || row.CandidateProviderID != "101" {
		t.Fatal("incomplete list treated as unique match", err)
	}
	duplicate := provider.result
	duplicate.ID = "102"
	provider.rows = []suppliers.Order{duplicate}
	provider.more = false
	if err = worker.Reconcile(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	row, err = f.base.auth.client.SupplierPurchase.Get(ctx, purchase.ID)
	if err != nil || row.Issue != "duplicate_provider_orders" || row.ProviderID != nil {
		t.Fatal("cross-page duplicates hidden", err)
	}
	provider.rows = nil
	if err = worker.Dispatch(ctx, purchase.ID); !errors.Is(err, supply.ErrConflict) {
		t.Fatal("duplicate evidence escaped quarantine", err)
	}
	if provider.calls.Load() != 0 {
		t.Fatal("duplicate provider orders triggered new purchase")
	}
}

func TestSupplierPurchaseLateResponseCannotEscapeExpiredLease(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	worker, provider, purchase, id := purchaseFixture(t, f)
	payPurchase(t, f, id)
	provider.createEntered = make(chan struct{})
	provider.createWait = make(chan struct{})
	done := make(chan error, 1)
	go func() { done <- worker.Dispatch(ctx, purchase.ID) }()
	select {
	case <-provider.createEntered:
	case <-time.After(10 * time.Second):
		t.Fatal("dispatch did not reach provider")
	}
	f.base.auth.clock.Add(int64(3 * time.Minute / time.Second))
	if err := worker.Reconcile(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	close(provider.createWait)
	if err := <-done; !errors.Is(err, supply.ErrConflict) {
		t.Fatal("late response bypassed lease", err)
	}
	provider.rows = []suppliers.Order{provider.result}
	if err := worker.Reconcile(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	if provider.calls.Load() != 1 {
		t.Fatal("lease recovery repeated purchase")
	}
	row, err := f.base.auth.client.SupplierPurchase.Get(ctx, purchase.ID)
	if err != nil || row.State != "pending" || row.ProviderID == nil {
		t.Fatal("late purchase not reconciled", err)
	}
}
func (p *purchaseProvider) GetOrder(context.Context, string) (suppliers.Order, error) {
	return p.result, nil
}
func (p *purchaseProvider) FindOrders(context.Context, string, int) ([]suppliers.Order, bool, error) {
	return p.rows, p.more, nil
}
func (p *purchaseProvider) VerifyWebhook(_ []byte, signatures []string) (suppliers.Signal, error) {
	if len(signatures) != 1 || signatures[0] != "synthetic-signature" {
		return suppliers.Signal{}, suppliers.ErrSignature
	}
	return p.signal, nil
}

func purchaseFixture(t *testing.T, f *paymentFixture) (*supply.Purchaser, *purchaseProvider, *ent.SupplierPurchase, string) {
	t.Helper()
	return purchaseFixtureConnection(t, f, suppliers.VendoriaTest)
}

func purchaseFixtureConnection(t *testing.T, f *paymentFixture, connection suppliers.Connection) (*supply.Purchaser, *purchaseProvider, *ent.SupplierPurchase, string) {
	t.Helper()
	detail, _, _ := shopPaymentOrder(t, f)
	ctx := t.Context()
	row, err := f.base.auth.client.Order.Get(ctx, detail.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	contract, err := f.base.auth.client.OrderContract.Get(ctx, row.CurrentContract)
	if err != nil {
		t.Fatal(err)
	}
	keys, err := vault.NewKeyring("fixture", map[string][]byte{"fixture": []byte(strings.Repeat("k", 32))})
	if err != nil {
		t.Fatal(err)
	}
	product := suppliers.Product{ID: "60", GameID: "30", CategoryID: "40", Name: "Synthetic product", Offers: []suppliers.Offer{{ID: "50", Available: true, Cost: "1.005", Quantity: suppliers.Quantity{Kind: "one", Min: "1", Max: "1", Step: "1"}, Fields: []suppliers.Field{{ID: "password", Label: "Access", Kind: "text", Secret: true, Required: true}}}}}
	provider := &purchaseProvider{connection: connection, merchant: "101", quote: suppliers.Quote{Connection: connection, MerchantID: "101", Product: product, Offer: product.Offers[0], Quantity: "1", TotalCost: "1.005"}}
	if _, err = f.base.auth.client.SupplierConnection.Create().SetID(string(connection)).SetMerchantID(provider.MerchantID()).SetPurchasesEnabled(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	worker, err := supply.NewPurchaser(f.base.auth.client, keys, []supply.PurchaseProvider{provider}, true, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	if err != nil {
		t.Fatal(err)
	}
	tx, err := f.base.auth.client.Tx(ctx)
	if err != nil {
		t.Fatal(err)
	}
	purchase, err := worker.PrepareInTransaction(ctx, tx, row, contract, provider.quote, "1234", map[string]string{"password": "synthetic-private-input"})
	if err != nil {
		t.Fatal(errors.Join(err, tx.Rollback()))
	}
	if err = tx.Commit(); err != nil {
		t.Fatal(err)
	}
	provider.result = suppliers.Order{ID: "101", Reference: purchase.ID, ProductID: "60", Quantity: "1", Cost: "1.005", Status: "pending"}
	provider.signal = suppliers.Signal{Connection: connection, Type: "statusChange", Recognized: true, Reference: purchase.ID, OrderID: "101", Digest: strings.Repeat("a", 64)}
	return worker, provider, purchase, detail.Order.ID
}

func TestSupplierPurchaseUnconfirmedPaymentAndPartialEvidence(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	worker, provider, purchase, id := purchaseFixtureConnection(t, f, suppliers.NexusSandbox)
	// A state-only "paid" flag without a confirmed allocated receipt is not funds.
	if _, err := f.base.auth.client.Order.UpdateOneID(id).SetState(order.StateQueued).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := f.base.auth.client.OrderContract.UpdateOneID(purchase.ContractID).SetPaymentState(ordercontract.PaymentStateSettled).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if err := worker.Dispatch(ctx, purchase.ID); err == nil || provider.calls.Load() != 0 {
		t.Fatal("state-only payment accepted", err)
	}
	if _, err := f.base.auth.client.Order.UpdateOneID(id).SetState(order.StateAwaitingPayment).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := f.base.auth.client.OrderContract.UpdateOneID(purchase.ContractID).SetPaymentState(ordercontract.PaymentStateUnissued).Save(ctx); err != nil {
		t.Fatal(err)
	}
	payPurchase(t, f, id)
	requested, delivered := suppliers.Decimal("1"), suppliers.Decimal("0.5")
	provider.result.Status = "partially_completed"
	provider.result.Requested = &requested
	provider.result.Delivered = &delivered
	provider.result.Cost = "0.5"
	if err := worker.Dispatch(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	row, err := f.base.auth.client.SupplierPurchase.Get(ctx, purchase.ID)
	if err != nil || row.State != "partial" || row.Delivered != "0.5" || provider.calls.Load() != 1 {
		t.Fatal("partial fulfillment represented as success", err)
	}
	if err = worker.Dispatch(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	if provider.calls.Load() != 1 {
		t.Fatal("partial order silently replaced")
	}
}
func payPurchase(t *testing.T, f *paymentFixture, id string) {
	t.Helper()
	detail, err := f.base.store.Get(t.Context(), f.base.buyer, id, false)
	if err != nil {
		t.Fatal(err)
	}
	attempt := f.start(t, detail)
	f.issue(t, attempt)
	record := f.reconcile(t, f.evidence(t, attempt, "989", "finished", "12.34000001"))
	if record.State != "settled" {
		t.Fatal("synthetic payment not allocated", record.Issue)
	}
}

func TestSupplierPurchasePaidFenceUncertainRecoveryAndPrivateKeys(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	worker, provider, purchase, id := purchaseFixture(t, f)
	if err := worker.Dispatch(ctx, purchase.ID); err == nil || provider.calls.Load() != 0 {
		t.Fatal("unpaid supplier dispatch", err)
	}
	if err := worker.RecordStatusSignal(ctx, suppliers.VendoriaTest, []byte("fixture"), []string{"synthetic-signature"}); err == nil {
		t.Fatal("callback authorized unpaid send")
	}
	payPurchase(t, f, id)
	provider.createErr = suppliers.ErrAmbiguous
	var work sync.WaitGroup
	for range 6 {
		work.Go(func() {
			if err := worker.Dispatch(ctx, purchase.ID); err != nil && !errors.Is(err, supply.ErrConflict) {
				t.Error(err)
			}
		})
	}
	work.Wait()
	if provider.calls.Load() != 1 {
		t.Fatal("duplicate purchase", provider.calls.Load())
	}
	for range 3 {
		if err := worker.Dispatch(ctx, purchase.ID); err != nil {
			t.Fatal(err)
		}
	}
	row, err := f.base.auth.client.SupplierPurchase.Get(ctx, purchase.ID)
	if err != nil || row.State != "unresolved" || !row.PostClaimed || provider.calls.Load() != 1 {
		t.Fatal("absence permitted retry", err)
	}
	provider.rows = []suppliers.Order{provider.result}
	if err = worker.Reconcile(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err = worker.RecordStatusSignal(ctx, suppliers.VendoriaTest, []byte("fixture"), []string{"synthetic-signature"}); err != nil {
			t.Fatal(err)
		}
	}
	count, err := f.base.auth.client.SupplierSignal.Query().Count(ctx)
	if err != nil || count != 1 {
		t.Fatal("signal replay", err)
	}
	provider.result.Status = "completed"
	provider.result.Keys = []suppliers.DeliveredKey{{Code: "synthetic-confidential-delivery"}, {Code: strings.Repeat("a", 8192)}, {Code: strings.Repeat("b", 8192)}}
	if err = worker.Reconcile(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	row, err = f.base.auth.client.SupplierPurchase.Get(ctx, purchase.ID)
	if err != nil || row.State != "completed" || row.DeliverySecretID == "" || provider.calls.Load() != 1 {
		t.Fatal("delivery evidence lost", err)
	}
	raw, err := json.Marshal(row)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), "synthetic-private-input") || strings.Contains(string(raw), "synthetic-confidential-delivery") {
		t.Fatal("private inputs/keys leaked")
	}
	secret, err := f.base.auth.client.SecretBundle.Get(ctx, row.DeliverySecretID)
	if err != nil || len(secret.EncryptedPayload) == 0 || strings.Contains(string(secret.EncryptedPayload), "synthetic-confidential-delivery") {
		t.Fatal("unencrypted delivery", err)
	}
	// A terminal cancellation never frees the durable POST claim.
	provider.result.Status = "cancelled"
	if err = worker.Dispatch(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	if provider.calls.Load() != 1 {
		t.Fatal("terminal change retried purchase")
	}
}

func TestSupplierPurchasePriceAndMidQuotePaymentHold(t *testing.T) {
	for _, mode := range []string{"price", "hold", "live", "disabled"} {
		t.Run(mode, func(t *testing.T) {
			f := paymentDB(t)
			ctx := t.Context()
			worker, provider, purchase, id := purchaseFixture(t, f)
			payPurchase(t, f, id)
			switch mode {
			case "price":
				provider.quote.TotalCost = "1.006"
			case "hold":
				provider.beforeQuote = func() {
					if _, e := f.base.auth.client.Order.UpdateOneID(id).SetState(order.StateOnHold).Save(ctx); e != nil {
						t.Error(e)
					}
				}
			case "live":
				provider.connection = suppliers.VendoriaProduction
				keys, e := vault.NewKeyring("fixture", map[string][]byte{"fixture": []byte(strings.Repeat("k", 32))})
				if e != nil {
					t.Fatal(e)
				}
				if _, e = supply.NewPurchaser(f.base.auth.client, keys, []supply.PurchaseProvider{provider}, true, nil); e == nil {
					t.Fatal("enabled live worker")
				}
				return
			case "disabled":
				keys, e := vault.NewKeyring("fixture", map[string][]byte{"fixture": []byte(strings.Repeat("k", 32))})
				if e != nil {
					t.Fatal(e)
				}
				worker, e = supply.NewPurchaser(f.base.auth.client, keys, []supply.PurchaseProvider{provider}, false, nil)
				if e != nil {
					t.Fatal(e)
				}
			}
			err := worker.Dispatch(ctx, purchase.ID)
			if mode != "price" && err == nil {
				t.Fatal("dispatch gate missing")
			}
			row, e := f.base.auth.client.SupplierPurchase.Get(ctx, purchase.ID)
			if e != nil || row.PostClaimed || provider.calls.Load() != 0 {
				t.Fatal("unsafe supplier send", e)
			}
		})
	}
}

func TestSupplierPurchaseMigrationReadinessAndForwardOnly(t *testing.T) {
	db := testDB(t)
	migration := runner(t, db)
	if err := migration.Apply(t.Context(), 44); err != nil {
		t.Fatal(err)
	}
	if database.Ready(t.Context(), db) == nil {
		t.Fatal("old schema accepted")
	}
	if err := migration.Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err != nil {
		t.Fatal(err)
	}
	if err := migration.Down(t.Context(), 1); err == nil || !strings.Contains(err.Error(), "forward-only") {
		t.Fatal("purchase journal downgrade allowed", err)
	}
	if _, err := db.ExecContext(t.Context(), "ALTER TABLE supplier_purchases DROP INDEX supplier_purchase_order"); err != nil {
		t.Fatal(err)
	}
	if database.Ready(t.Context(), db) == nil {
		t.Fatal("missing purchase fence accepted")
	}
}
