//go:build integration

package integration

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reports"
)

func TestShopRefundVerifiedRecoveryReportsAndNoRestock(t *testing.T) {
	f, store, product, input := shopPurchaseFixture(t)
	ctx := t.Context()
	purchase, err := store.Reserve(ctx, f.base.buyer, f.base.game.Slug, product.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	detail, err := f.base.store.Get(ctx, f.base.buyer, purchase.OrderID, false)
	if err != nil {
		t.Fatal(err)
	}
	attempt := f.start(t, detail)
	f.issue(t, attempt)
	evidence := f.evidence(t, attempt, "980", "finished", "12.34000001")
	f.reconcile(t, evidence)
	history, err := f.store.History(ctx, f.base.buyer, purchase.OrderID, false)
	if err != nil || len(history.Receipts) != 1 {
		t.Fatal("source receipt", err)
	}
	support, err := f.store.OpenCase(ctx, f.base.buyer, purchase.OrderID, false, payments.CaseInput{RequestKey: uuid.NewString(), Kind: "cancellation", Note: "Synthetic manual delivery cannot be fulfilled; request review."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.base.auth.client.User.UpdateOneID(f.base.admin.User.ID).SetRole(identity.RoleOwner).Save(ctx); err != nil {
		t.Fatal(err)
	}
	f.base.admin = f.base.auth.principalFromSession(t, f.base.admin)
	provider := &outgoingFixture{}
	f.store.ConfigureOutgoing(provider, true)
	refund := &refundFixture{paymentFixture: f, provider: provider, caseID: support.ID, orderID: purchase.OrderID, receiptID: history.Receipts[0].ID}
	decision := refund.decision(t)
	transfer := refund.recipient(t, refund.proposal(t, "4.000000000000000001"))
	transfer, err = f.store.ApproveRefund(ctx, f.base.admin, transfer.ID, payments.TransferChange{Version: transfer.Version, Reason: "Review exact synthetic shop refund and recipient."})
	if err != nil {
		t.Fatal(err)
	}
	refund.issue(t, transfer.ID)
	refund.issue(t, transfer.ID)
	refund.read(t)
	transfer = refund.latest(t, transfer.ID)
	if err = f.store.VerifyRefund(ctx, f.base.admin, transfer.ID, payments.TransferChange{Version: transfer.Version, Code: "123456", Reason: "Confirm independently reconciled synthetic payout."}); err != nil {
		t.Fatal(err)
	}
	refund.read(t)
	if refund.latest(t, transfer.ID).State != "processing" {
		t.Fatal("authorization fabricated success")
	}
	provider.status("finished")
	refund.read(t)
	if refund.latest(t, transfer.ID).State != "confirmed" {
		t.Fatal("refund not reconciled")
	}
	closed, err := f.store.ChangeCase(ctx, f.base.buyer, support.ID, "accept", false, payments.CaseChange{Version: decision.Version, Note: "Accept the confirmed partial refund and cancellation."})
	if err != nil || closed.State != "closed" {
		t.Fatal("closure", err)
	}
	f.reconcile(t, evidence)
	reservation, err := f.base.auth.client.ShopReservation.Query().Where(shopreservation.OrderIDEQ(purchase.OrderID)).Only(ctx)
	if err != nil || reservation.State != "cancelled" {
		t.Fatal("cancelled reservation revived", err)
	}
	stock, err := f.base.auth.client.ShopStock.Query().Only(ctx)
	if err != nil || stock.Committed != 1 || stock.Reserved != 0 {
		t.Fatal("refund silently restocked", err)
	}
	provider.mu.Lock()
	creates, verifies := provider.creates, provider.verifies
	provider.mu.Unlock()
	if creates != 1 || verifies != 1 {
		t.Fatal("repeated outgoing write", creates, verifies)
	}
	reporting := reports.New(f.base.auth.service, nil)
	query := reportQuery("orders")
	query.Search = purchase.OrderID
	result, err := reporting.Preview(ctx, f.base.admin, query)
	if err != nil || result.Count != 1 {
		t.Fatal("shop report", err)
	}
	raw, err := json.Marshal(result)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), "shop") || strings.Contains(string(raw), input.Recipient["player_id"]) || strings.Contains(string(raw), "synthetic-recipient-address") {
		t.Fatal("report kind or private projection")
	}
}
