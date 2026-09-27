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
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopstock"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
)

// shopPaymentOrder installs an accepted order only in a disposable integration
// database. Public purchase is not activated; this isolates payment/stock wiring.
func shopPaymentOrder(t *testing.T, f *paymentFixture) (orders.Detail, *ent.ShopReservation, *ent.ShopStock) {
	t.Helper()
	ctx := t.Context()
	now := time.Unix(f.base.auth.clock.Load(), 0)
	catalog := shopStore(f.base)
	product, err := catalog.Create(ctx, f.base.admin, f.base.game.ID, shopDefinition())
	if err != nil {
		t.Fatal(err)
	}
	product, err = catalog.Change(ctx, f.base.admin, product.ID, product.Version, "publish")
	if err != nil {
		t.Fatal(err)
	}
	product, err = catalog.SetStock(ctx, f.base.admin, product.ID, shop.StockChange{Version: product.Version, StockVersion: product.Stocks[0].Version, VariantKey: "fixture", Total: 3, Reason: "Three isolated synthetic units."})
	if err != nil {
		t.Fatal(err)
	}
	purchase, err := f.base.auth.client.Order.Create().SetUserID(f.base.buyer.User.ID).SetGameID(f.base.game.ID).SetGameName("Synthetic shop game").SetSlug(f.base.game.Slug).SetService("shop").SetKind(order.KindShop).SetShopProductID(product.ID).SetVariantKey("fixture").SetRequestKey(uuid.NewString()).SetRequestHash(strings.Repeat("c", 64)).SetState(order.StateAwaitingPayment).SetAnswers(map[string]any{}).SetSnapshot(map[string]any{}).SetEstimate(map[string]any{}).SetTermsVersion(f.base.auth.cfg.TermsVersion).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	contract, err := f.base.auth.client.OrderContract.Create().SetOrderID(purchase.ID).SetActiveOrderID(purchase.ID).SetUserID(purchase.UserID).SetGameID(purchase.GameID).SetPaymentState(ordercontract.PaymentStateUnissued).SetData(map[string]any{"revision": 1, "currency": "USD", "subtotal_minor": "1234", "amount_minor": "1234", "scope": "Synthetic shop payment fixture", "reason": "Explicit synthetic terms only", "delivery_min_hours": 1, "delivery_max_hours": 24, "expires_at": now.Add(30 * time.Minute), "terms_version": f.base.auth.cfg.TermsVersion}).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.base.auth.client.Order.UpdateOne(purchase).SetCurrentContract(contract.ID).Save(ctx); err != nil {
		t.Fatal(err)
	}
	reservation, err := f.base.auth.client.ShopReservation.Create().SetOrderID(purchase.ID).SetUserID(purchase.UserID).SetProductID(product.ID).SetReleaseID(product.CurrentRelease).SetVariantKey("fixture").SetQuantity(1).SetExpiresAt(now.Add(15 * time.Minute)).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	stock, err := f.base.auth.client.ShopStock.Query().Where(shopstock.ProductIDEQ(product.ID)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	stock, err = f.base.auth.client.ShopStock.UpdateOne(stock).SetReserved(1).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	detail, err := f.base.store.Get(ctx, f.base.buyer, purchase.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	return detail, reservation, stock
}

func TestShopPaymentsVerifiedAllocationDuplicatesAndCancellation(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	detail, reservation, stock := shopPaymentOrder(t, f)
	attempt := f.start(t, detail)
	current, err := f.base.auth.client.ShopReservation.Get(ctx, reservation.ID)
	if err != nil || !current.ExpiresAt.Equal(attempt.ExpiresAt) {
		t.Fatal("checkout deadline not pinned", err)
	}
	repeated := f.start(t, detail)
	if repeated.ID != attempt.ID {
		t.Fatal("duplicate checkout")
	}
	f.issue(t, attempt)
	evidence := f.evidence(t, attempt, "950", "finished", "12.34000001")
	recordID := f.record(t, evidence)
	var work sync.WaitGroup
	for range 4 {
		work.Go(func() {
			// A concurrent reader may lose the existing reconciliation lease.
			if e := f.store.Reconcile(ctx, recordID); e != nil && !errors.Is(e, payments.ErrConflict) {
				t.Error(e)
			}
		})
	}
	work.Wait()
	record := f.reconcile(t, evidence)
	if record.State != "settled" || record.Issue != "" {
		t.Fatal("verified shop payment not settled", record.State, record.Issue)
	}
	stock, err = f.base.auth.client.ShopStock.Get(ctx, stock.ID)
	if err != nil || stock.Reserved != 0 || stock.Committed != 1 {
		t.Fatal("duplicate allocation changed units", err)
	}
	count, err := f.base.auth.client.PaymentAllocation.Query().Count(ctx)
	if err != nil || count != 1 {
		t.Fatal("duplicate financial allocation", err)
	}
	serviceCase, err := f.store.OpenCase(ctx, f.base.buyer, detail.Order.ID, false, payments.CaseInput{RequestKey: uuid.NewString(), Kind: "cancellation", Note: "Please review this synthetic cancellation."})
	if err != nil {
		t.Fatal(err)
	}
	decision, err := f.store.ChangeCase(ctx, f.base.admin, serviceCase.ID, "decide", true, payments.CaseChange{Version: serviceCase.Version, Outcome: "cancel", Note: "Reviewed and propose ending delivery."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.ChangeCase(ctx, f.base.buyer, serviceCase.ID, "accept", false, payments.CaseChange{Version: decision.Version, Note: "I accept the proposed cancellation decision."}); err != nil {
		t.Fatal(err)
	}
	current, err = f.base.auth.client.ShopReservation.Get(ctx, reservation.ID)
	if err != nil || current.State != "cancelled" {
		t.Fatal("case did not retire obligation", err)
	}
	stock, err = f.base.auth.client.ShopStock.Get(ctx, stock.ID)
	if err != nil || stock.Committed != 1 || stock.Reserved != 0 {
		t.Fatal("cancellation silently restocked", err)
	}
	// Replayed provider evidence after case closure must not revive fulfillment.
	f.reconcile(t, evidence)
	purchase, err := f.base.auth.client.Order.Get(ctx, detail.Order.ID)
	if err != nil || purchase.State != order.StateCancelled {
		t.Fatal("provider replay revived cancelled work", err)
	}
}

func TestShopPaymentsExpiryRequiresAuthoritativeUnfundedEvidence(t *testing.T) {
	for _, mode := range []string{"unissued", "unclaimed", "ambiguous", "issued", "terminal", "funded"} {
		t.Run(mode, func(t *testing.T) {
			f := paymentDB(t)
			ctx := t.Context()
			detail, reservation, stock := shopPaymentOrder(t, f)
			var attempt payments.Attempt
			if mode != "unissued" {
				attempt = f.start(t, detail)
			}
			if mode != "unissued" && mode != "unclaimed" {
				f.provider.ambiguous = mode == "ambiguous"
				f.issue(t, attempt)
			}
			if mode == "funded" {
				f.reconcile(t, f.evidence(t, attempt, "951", "confirming", "1"))
			}
			f.base.auth.clock.Add(int64(time.Hour / time.Second))
			if err := f.store.Maintain(ctx); err != nil {
				t.Fatal(err)
			}
			if mode == "terminal" {
				f.reconcile(t, f.evidence(t, attempt, "952", "expired", "0"))
				if err := f.store.Maintain(ctx); err != nil {
					t.Fatal(err)
				}
			}
			current, err := f.base.auth.client.ShopReservation.Get(ctx, reservation.ID)
			if err != nil {
				t.Fatal(err)
			}
			want := "reserved"
			reserved := 1
			if mode == "unissued" || mode == "unclaimed" || mode == "terminal" {
				want = "released"
				reserved = 0
			}
			if current.State != want {
				t.Fatal("unsafe expiry decision", current.State, want)
			}
			stock, err = f.base.auth.client.ShopStock.Get(ctx, stock.ID)
			if err != nil || stock.Reserved != reserved || stock.Committed != 0 {
				t.Fatal("unsafe inventory release", err)
			}
			if mode == "terminal" {
				record := f.reconcile(t, f.evidence(t, attempt, "952", "finished", "12.34000001"))
				if record.Issue != "retired_contract" {
					t.Fatal("late funds allocated", record.Issue)
				}
				count, e := f.base.auth.client.PaymentReceipt.Query().Count(ctx)
				if e != nil || count != 1 {
					t.Fatal("late funds evidence lost", e)
				}
				count, e = f.base.auth.client.PaymentAllocation.Query().Count(ctx)
				if e != nil || count != 0 {
					t.Fatal("late funds fulfilled released capacity", e)
				}
			}
		})
	}
}

func TestShopPaymentsLostCapacityPreservesFinancialException(t *testing.T) {
	for _, mode := range []string{"released", "missing_stock", "missing_reservation"} {
		t.Run(mode, func(t *testing.T) {
			f := paymentDB(t)
			ctx := t.Context()
			detail, reservation, stock := shopPaymentOrder(t, f)
			attempt := f.start(t, detail)
			f.issue(t, attempt)
			// Deliberately inconsistent legacy inventory exists only in this fixture.
			switch mode {
			case "released":
				if _, err := f.base.auth.client.ShopReservation.UpdateOne(reservation).SetState("released").Save(ctx); err != nil {
					t.Fatal(err)
				}
				if _, err := f.base.auth.client.ShopStock.UpdateOne(stock).SetReserved(0).Save(ctx); err != nil {
					t.Fatal(err)
				}
			case "missing_stock":
				if err := f.base.auth.client.ShopStock.DeleteOne(stock).Exec(ctx); err != nil {
					t.Fatal(err)
				}
			case "missing_reservation":
				if err := f.base.auth.client.ShopReservation.DeleteOne(reservation).Exec(ctx); err != nil {
					t.Fatal(err)
				}
			}
			record := f.reconcile(t, f.evidence(t, attempt, "953", "finished", "12.34000001"))
			if record.Issue != "inventory_review" || record.State != "exception" {
				t.Fatal("lost inventory was not reviewable", record.Issue, record.State)
			}
			count, err := f.base.auth.client.PaymentReceipt.Query().Count(ctx)
			if err != nil || count != 1 {
				t.Fatal("funds evidence rolled back", err)
			}
			count, err = f.base.auth.client.PaymentAllocation.Query().Count(ctx)
			if err != nil || count != 0 {
				t.Fatal("missing inventory fulfilled", err)
			}
			current, err := f.base.auth.client.Order.Get(ctx, detail.Order.ID)
			if err != nil || current.State != order.StateAwaitingPayment {
				t.Fatal("paid exception entered fulfillment", err)
			}
		})
	}
}

func TestShopPaymentsExpiredReservationAndUnissuedCancellation(t *testing.T) {
	for _, mode := range []string{"expired", "cancel", "paused", "other_customer"} {
		t.Run(mode, func(t *testing.T) {
			f := paymentDB(t)
			ctx := t.Context()
			detail, reservation, stock := shopPaymentOrder(t, f)
			if mode == "cancel" {
				if _, err := f.base.store.Transition(ctx, f.base.buyer, detail.Order.ID, "cancel", false, orders.Action{Version: detail.Order.Version}); err != nil {
					t.Fatal(err)
				}
				cancelledStock, err := f.base.auth.client.ShopStock.Get(ctx, stock.ID)
				if err != nil || cancelledStock.Reserved != 0 || cancelledStock.Committed != 0 {
					t.Fatal("unissued cancellation did not release units", err)
				}
				return
			}
			buyer := f.base.buyer
			store := f.store
			if mode == "expired" {
				if _, err := f.base.auth.client.ShopReservation.UpdateOne(reservation).SetExpiresAt(time.Unix(f.base.auth.clock.Load(), 0)).Save(ctx); err != nil {
					t.Fatal(err)
				}
			}
			if mode == "paused" {
				store = payments.New(f.base.auth.client, f.base.auth.service, f.provider, "fixture:synthetic-merchant", false, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
			}
			if mode == "other_customer" {
				buyer = f.base.other
			}
			_, err := store.Start(ctx, buyer, detail.Order.ID, payments.StartInput{ContractID: detail.Contract.ID, PolicyID: f.policy.ID, Route: "usdttrc20", AcceptPolicy: true})
			if mode == "expired" && !errors.Is(err, payments.ErrConflict) || mode == "paused" && !errors.Is(err, payments.ErrUnavailable) || mode == "other_customer" && !ent.IsNotFound(err) {
				t.Fatal("checkout guard", mode, err)
			}
			count, err := f.base.auth.client.PaymentAttempt.Query().Count(ctx)
			if err != nil || count != 0 {
				t.Fatal("rejected checkout retained attempt", err)
			}
			stock, err = f.base.auth.client.ShopStock.Get(ctx, stock.ID)
			if err != nil || stock.Reserved != 1 || stock.Committed != 0 {
				t.Fatal("rejected checkout altered stock", err)
			}
		})
	}
}

func TestShopPaymentsNativeReconciliationContinuesWhileCheckoutPaused(t *testing.T) {
	f, provider := nativePaymentDB(t)
	ctx := t.Context()
	detail, _, stock := shopPaymentOrder(t, f)
	attempt := f.start(t, detail)
	f.issue(t, attempt)
	if provider.calls != 1 || provider.depositCalls != 1 {
		t.Fatal("native checkout duplicated provider calls")
	}
	f.store = payments.New(f.base.auth.client, f.base.auth.service, provider, "fixture:synthetic-merchant", false, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	record := f.reconcile(t, f.evidence(t, attempt, "100", "finished", "12.34000001"))
	if record.State != "settled" {
		t.Fatal("checkout pause blocked existing settlement", record.Issue)
	}
	current, err := f.base.auth.client.ShopStock.Get(ctx, stock.ID)
	if err != nil || current.Committed != 1 || current.Reserved != 0 {
		t.Fatal("native payment did not allocate", err)
	}
	if err = f.store.Maintain(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestShopPaymentsAuditFailureRollsBackStockAndSettlement(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	detail, _, stock := shopPaymentOrder(t, f)
	attempt := f.start(t, detail)
	f.issue(t, attempt)
	recordID := f.record(t, f.evidence(t, attempt, "954", "finished", "12.34000001"))
	// Destructive fault injection is restricted to this disposable test database.
	if _, err := f.base.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if err := f.store.Reconcile(ctx, recordID); err == nil {
		t.Fatal("unaudited settlement succeeded")
	}
	current, err := f.base.auth.client.ShopStock.Get(ctx, stock.ID)
	if err != nil || current.Reserved != 1 || current.Committed != 0 {
		t.Fatal("failed settlement changed capacity", err)
	}
	count, err := f.base.auth.client.PaymentAllocation.Query().Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("failed settlement retained allocation", err)
	}
	count, err = f.base.auth.client.PaymentReceipt.Query().Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("partial settlement transaction", err)
	}
	row, err := f.base.auth.client.Order.Get(ctx, detail.Order.ID)
	if err != nil || row.State != order.StateAwaitingPayment {
		t.Fatal("failed settlement fulfilled order", err)
	}
}
