//go:build integration

package integration

import (
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func TestNexusCasesResolveWithoutManualStockOrRepurchase(t *testing.T) {
	for _, scenario := range []struct {
		state, outcome string
		held           bool
	}{
		{"unsent", "continue", false}, {"pending", "continue", false},
		{"pending", "retain", false}, {"pending", "rework", false},
		{"partially_completed", "continue", true}, {"completed", "rework", true},
	} {
		t.Run(scenario.state+"_"+scenario.outcome, func(t *testing.T) {
			f := nexusCheckoutFixture(t, true)
			base, ctx := f.payment.base, t.Context()
			d, err := f.shop.ReserveSupplier(ctx, base.buyer, base.game.Slug, f.product.ID, f.acceptance(f.quote(t)))
			if err != nil {
				t.Fatal(err)
			}
			payPurchase(t, f.payment, d.OrderID)
			purchase, err := base.auth.client.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(d.OrderID)).Only(ctx)
			if err != nil {
				t.Fatal(err)
			}
			if scenario.state != "unsent" {
				f.provider.result.Status = scenario.state
				if scenario.state == "completed" {
					f.provider.result.Keys = []suppliers.DeliveredKey{{Code: "synthetic-case-code"}}
				}
				if scenario.state == "partially_completed" {
					half := suppliers.Decimal("0.5")
					f.provider.result.Delivered = &half
				}
				if err = f.worker.Dispatch(ctx, purchase.ID); err != nil {
					t.Fatal(err)
				}
			}
			record, err := f.payment.store.OpenCase(ctx, base.buyer, d.OrderID, false, payments.CaseInput{RequestKey: uuid.NewString(), Kind: "dispute", Note: "Please review this synthetic supplier delivery."})
			if err != nil {
				t.Fatal("open", err)
			}
			view, err := f.shop.Delivery(ctx, base.buyer, d.OrderID, false)
			if err != nil || !view.Supplier.NeedsReview || view.Supplier.CodesAvailable {
				t.Fatal("case still offered payment or codes", err)
			}
			if scenario.state == "pending" {
				if err = f.worker.Reconcile(ctx, purchase.ID); err != nil {
					t.Fatal(err)
				}
			}
			decision, err := f.payment.store.ChangeCase(ctx, base.admin, record.ID, "decide", true, payments.CaseChange{Version: record.Version, Outcome: scenario.outcome, Note: "Reviewed the isolated supplier case."})
			if err != nil {
				t.Fatal("decision", err)
			}
			if _, err = f.payment.store.ChangeCase(ctx, base.buyer, record.ID, "accept", false, payments.CaseChange{Version: decision.Version, Note: "Accept this isolated case decision."}); err != nil {
				t.Fatal("accept", err)
			}
			row, err := base.auth.client.Order.Get(ctx, d.OrderID)
			if err != nil {
				t.Fatal(err)
			}
			if scenario.held {
				if row.State != order.StateOnHold {
					t.Fatal("terminal/rework automatically resumed", row.State)
				}
			} else {
				if row.State != order.StateQueued {
					t.Fatal("safe resume blocked", row.State)
				}
				if err = f.worker.Maintain(ctx); err != nil {
					t.Fatal("maintenance", err)
				}
				if err = f.worker.Dispatch(ctx, purchase.ID); err != nil {
					t.Fatal("existing obligation", err)
				}
			}
			if f.provider.calls.Load() != 1 {
				t.Fatal("case generated additional purchase", f.provider.calls.Load())
			}
		})
	}
}
