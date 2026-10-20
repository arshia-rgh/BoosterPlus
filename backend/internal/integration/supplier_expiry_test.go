//go:build integration

package integration

import (
	"errors"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderevent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
)

func TestNexusSupplierCheckoutExpiryReleasesAbandonedLimit(t *testing.T) {
	f := nexusCheckoutFixture(t, false)
	ctx, base := t.Context(), f.payment.base
	ids := make([]string, 0, 3)
	for range 3 {
		quote := f.quote(t)
		reserved, err := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, f.acceptance(quote))
		if err != nil {
			t.Fatal(err)
		}
		ids = append(ids, reserved.OrderID)
	}
	quote := f.quote(t)
	if _, err := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, f.acceptance(quote)); !errors.Is(err, identity.ErrLimited) {
		t.Fatal("unpaid limit not enforced", err)
	}
	base.auth.clock.Add(int64(time.Hour / time.Second))
	for range 2 {
		if err := f.payment.store.Maintain(ctx); err != nil {
			t.Fatal("expiry maintenance", err)
		}
	}
	for _, id := range ids {
		purchase, err := base.auth.client.Order.Get(ctx, id)
		if err != nil || purchase.State != order.StateExpired {
			t.Fatal("abandoned supplier checkout did not expire", err)
		}
		contract, err := base.auth.client.OrderContract.Get(ctx, purchase.CurrentContract)
		if err != nil || contract.PaymentState != ordercontract.PaymentStateRetired || contract.ActiveOrderID != nil {
			t.Fatal("expired contract is still payable", err)
		}
		supplier, err := base.auth.client.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(id)).Only(ctx)
		if err != nil || supplier.State != "cancelled" || supplier.PostClaimed || supplier.Issue != "checkout_expired" {
			t.Fatal("supplier obligation not safely retired", err)
		}
		events, err := base.auth.client.OrderEvent.Query().Where(orderevent.OrderIDEQ(id), orderevent.ActionEQ("supplier_checkout_expired")).Count(ctx)
		if err != nil || events != 1 {
			t.Fatal("expiry event not idempotent", err, events)
		}
	}
	if f.provider.calls.Load() != 0 {
		t.Fatal("expiry bought from supplier")
	}
	quote = f.quote(t)
	if _, err := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, f.acceptance(quote)); err != nil {
		t.Fatal("expired obligations still occupy unpaid limit", err)
	}
}

func TestNexusSupplierCheckoutExpiryPreservesUncertainFundedAndClaimed(t *testing.T) {
	for _, mode := range []string{"unexpired", "ambiguous", "funded", "claimed"} {
		t.Run(mode, func(t *testing.T) {
			f := nexusCheckoutFixture(t, false)
			ctx, base := t.Context(), f.payment.base
			quote := f.quote(t)
			reserved, err := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, f.acceptance(quote))
			if err != nil {
				t.Fatal(err)
			}
			attemptID := ""
			if mode == "ambiguous" || mode == "funded" {
				detail, detailErr := base.store.Get(ctx, base.buyer, reserved.OrderID, false)
				if detailErr != nil {
					t.Fatal(detailErr)
				}
				attempt := f.payment.start(t, detail)
				attemptID = attempt.ID
				f.payment.provider.ambiguous = mode == "ambiguous"
				f.payment.issue(t, attempt)
				if mode == "funded" {
					f.payment.reconcile(t, f.payment.evidence(t, attempt, "958", "confirming", "1"))
				}
			}
			supplier, err := base.auth.client.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(reserved.OrderID)).Only(ctx)
			if err != nil {
				t.Fatal(err)
			}
			if mode == "claimed" {
				// Even inconsistent historical state cannot erase a durable POST claim.
				if _, err = base.auth.client.SupplierPurchase.UpdateOne(supplier).SetPostClaimed(true).Save(ctx); err != nil {
					t.Fatal(err)
				}
			}
			advance := time.Hour
			if mode == "unexpired" {
				advance = 5 * time.Minute
			}
			base.auth.clock.Add(int64(advance / time.Second))
			if err = f.payment.store.Maintain(ctx); err != nil {
				t.Fatal(err)
			}
			current, err := base.auth.client.Order.Get(ctx, reserved.OrderID)
			expectedState := order.StateAwaitingPayment
			if mode == "ambiguous" {
				// Existing payment maintenance closes the local payment link,
				// while the unknown external invoice remains permanently fenced.
				expectedState = order.StateExpired
				attempt, attemptErr := base.auth.client.PaymentAttempt.Get(ctx, attemptID)
				if attemptErr != nil || !attempt.PostClaimed || attempt.InvoiceID != nil || attempt.State != "closed" || attempt.ActiveContractID != nil {
					t.Fatal("uncertain invoice lost its durable create fence", attemptErr)
				}
				f.payment.issue(t, payments.Attempt{ID: attemptID})
				if f.payment.provider.calls != 1 {
					t.Fatal("unknown invoice was created again")
				}
			}
			if err != nil || current.State != expectedState {
				t.Fatal("protected checkout expired", mode, err)
			}
			supplier, err = base.auth.client.SupplierPurchase.Get(ctx, supplier.ID)
			if err != nil || supplier.State != "awaiting_payment" || supplier.Issue == "checkout_expired" {
				t.Fatal("protected supplier obligation changed", mode, err)
			}
			events, err := base.auth.client.OrderEvent.Query().Where(orderevent.OrderIDEQ(reserved.OrderID), orderevent.ActionEQ("supplier_checkout_expired")).Count(ctx)
			if err != nil || events != 0 {
				t.Fatal("uncertain or funded supplier obligation was retired", mode, err)
			}
			if f.provider.calls.Load() != 0 {
				t.Fatal("expiry called supplier")
			}
		})
	}
}
