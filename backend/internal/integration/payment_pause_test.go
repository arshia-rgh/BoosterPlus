//go:build integration

package integration

import (
	"errors"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
)

func TestPausedCheckoutNeverGrantsPaymentButReconcilesExistingFunds(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	unpaid := f.base.create(t, "package")
	outstanding := f.base.create(t, "package")
	attempt := f.start(t, outstanding)
	f.issue(t, attempt)
	f.store = payments.New(f.base.auth.client, f.base.auth.service, f.provider, "fixture:synthetic-merchant", false, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	if _, err := f.store.Start(ctx, f.base.buyer, unpaid.Order.ID, payments.StartInput{ContractID: unpaid.Contract.ID, PolicyID: f.policy.ID, AcceptPolicy: true}); !errors.Is(err, payments.ErrUnavailable) {
		t.Fatal("paused checkout accepted", err)
	}
	for _, action := range []string{"bypass_payment", "mark_paid"} {
		if _, err := f.base.store.Transition(ctx, f.base.buyer, unpaid.Order.ID, action, false, orders.Action{Version: unpaid.Order.Version}); err == nil {
			t.Fatal("runtime payment bypass exists", action)
		}
	}
	contract, err := f.base.auth.client.OrderContract.Get(ctx, unpaid.Contract.ID)
	if err != nil || string(contract.PaymentState) != "unissued" {
		t.Fatal("unpaid contract changed", err)
	}
	row, err := f.base.auth.client.Order.Get(ctx, unpaid.Order.ID)
	if err != nil || string(row.State) != "awaiting_payment" {
		t.Fatal("unpaid order entered fulfillment", err)
	}
	f.reconcile(t, f.evidence(t, attempt, "990", "finished", "12.34000001"))
	history, err := f.store.History(ctx, f.base.buyer, outstanding.Order.ID, false)
	if err != nil || history.Enabled || len(history.Receipts) != 1 {
		t.Fatal("paused checkout lost existing payment reconciliation", err)
	}
	row, err = f.base.auth.client.Order.Get(ctx, outstanding.Order.ID)
	if err != nil || string(row.State) != "queued" {
		t.Fatal("verified payment not fulfilled during pause", err)
	}
	f.provider.mu.Lock()
	calls := f.provider.calls
	f.provider.mu.Unlock()
	if calls != 1 {
		t.Fatal("paused checkout issued a new invoice", calls)
	}
}
