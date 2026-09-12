//go:build integration

package integration

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
)

func TestResaleConsignmentHoldsAndResolvedRefundPreserveExactSellerDebt(t *testing.T) {
	f := resaleDB(t, "consignment")
	ctx := t.Context()
	f.publish(t)
	d := f.reserve(t)
	a := f.start(t, d)
	f.issue(t, a)
	f.reconcile(t, f.evidence(t, a, "911", "finished", "12.34000001"))
	raw, err := json.Marshal(map[string]string{"offer_id": f.offer.ID})
	if err != nil {
		t.Fatal(err)
	}
	if err = f.store.SellerObligationHandler()(ctx, jobs.Job{Payload: raw}); err != nil {
		t.Fatal(err)
	}
	transfers, err := f.store.SellerPayouts(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || len(transfers) != 1 {
		t.Fatal(err)
	}
	payout, err := f.store.ConfirmSellerRecipient(ctx, f.base.other, transfers[0].ID, payments.RecipientInput{Version: transfers[0].Version, Address: "synthetic-consignment-recipient", Accept: true})
	if err != nil {
		t.Fatal(err)
	}
	provider := &outgoingFixture{}
	f.store.ConfigureOutgoing(provider, true)
	approve := payments.TransferChange{Version: payout.Version, Reason: "Honor the accepted exact net seller obligation."}
	if _, err = f.store.ApproveSellerPayout(ctx, f.base.admin, payout.ID, approve); err == nil {
		t.Fatal("consignment paid before buyer handoff")
	}
	now := time.Unix(f.base.auth.clock.Load(), 0)
	secret, err := f.resale.SubmitDeliverySecret(ctx, f.base.admin, d.Order.ID, resale.SecretInput{RequestKey: uuid.NewString(), Value: []byte("synthetic completed consignment handoff"), ExpiresAt: now.Add(72 * time.Hour)})
	if err != nil {
		t.Fatal(err)
	}
	delivery, err := f.resale.Delivery(ctx, f.base.admin, d.Order.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	delivery, err = f.resale.ChangeDelivery(ctx, f.base.admin, d.Order.ID, "deliver", true, resale.DeliveryChange{Version: delivery.Version, SecretVersion: secret.Version, Instructions: "Follow the synthetic ownership transfer checklist.", Accept: true})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.resale.ChangeDelivery(ctx, f.base.buyer, d.Order.ID, "acknowledge", false, resale.DeliveryChange{Version: delivery.Version, Instructions: "I received and tested the synthetic account ownership.", Accept: true}); err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.ApproveSellerPayout(ctx, f.base.admin, payout.ID, approve); err == nil {
		t.Fatal("consignment paid before dispute deadline")
	}
	record, err := f.store.OpenCase(ctx, f.base.buyer, d.Order.ID, false, payments.CaseInput{RequestKey: uuid.NewString(), Kind: "dispute", Note: "Review a partial refund while retaining the account."})
	if err != nil {
		t.Fatal(err)
	}
	f.base.auth.clock.Add(int64(49 * time.Hour / time.Second))
	now = time.Unix(f.base.auth.clock.Load(), 0)
	// Time travel expires staff sessions too. This fixture represents a new
	// two-factor staff sign-in; the actual sign-in flow is independently qualified.
	if _, err = f.base.auth.client.AuthSession.UpdateOneID(f.base.admin.Session.ID).SetAuthenticatedAt(now).SetMfaVerifiedAt(now).SetLastSeenAt(now).SetExpiresAt(now.Add(8 * time.Hour)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	f.base.admin = f.base.auth.principalFromSession(t, f.base.admin)
	if _, err = f.store.ApproveSellerPayout(ctx, f.base.admin, payout.ID, approve); err == nil {
		t.Fatal("active dispute released seller payout")
	}
	record, err = f.store.ChangeCase(ctx, f.base.admin, record.ID, "decide", true, payments.CaseChange{Version: record.Version, Outcome: "retain", Note: "Retain delivered account and refund the agreed portion."})
	if err != nil {
		t.Fatal(err)
	}
	f.freshBuyer(t)
	history, err := f.store.History(ctx, f.base.buyer, d.Order.ID, false)
	if err != nil || len(history.Receipts) != 1 {
		t.Fatal(err)
	}
	refund, err := f.store.ProposeRefund(ctx, f.base.admin, record.ID, payments.RefundInput{RequestKey: uuid.NewString(), ReceiptID: history.Receipts[0].ID, Amount: "1", Terms: "Synthetic partial refund; original seller proceeds stay fixed."})
	if err != nil {
		t.Fatal(err)
	}
	refund, err = f.store.ConfirmRecipient(ctx, f.base.buyer, refund.ID, payments.RecipientInput{Version: refund.Version, Address: "synthetic-buyer-refund-recipient", Accept: true})
	if err != nil {
		t.Fatal(err)
	}
	refund, err = f.store.ApproveRefund(ctx, f.base.admin, refund.ID, payments.TransferChange{Version: refund.Version, Reason: "Authorize agreed partial customer refund."})
	if err != nil {
		t.Fatal(err)
	}
	shared := &refundFixture{paymentFixture: f.paymentFixture, provider: provider}
	shared.issue(t, refund.ID)
	provider.status("finished")
	shared.read(t)
	if _, err = f.store.ChangeCase(ctx, f.base.buyer, record.ID, "accept", false, payments.CaseChange{Version: record.Version, Note: "I accept the confirmed partial refund and retain ownership."}); err != nil {
		t.Fatal(err)
	}
	payout, err = f.store.ApproveSellerPayout(ctx, f.base.admin, payout.ID, approve)
	if err != nil || payout.State != "approved" || payout.Amount != "10.00000001" {
		t.Fatal("resolved refund changed or stranded accepted seller proceeds", err)
	}
}
