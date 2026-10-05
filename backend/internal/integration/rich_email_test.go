//go:build integration

package integration

import (
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/notification"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderevent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/submissionevent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/emailtemplate"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
)

func TestRichEmailIdentityPresentationSurvivesEncryptedQueue(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	id, err := f.service.RequestEmail(ctx, identity.EmailRequest{Portal: identity.PortalCustomer, Email: "rich-email@example.test", Purpose: "login", Browser: f.browser, IP: "127.0.0.1", AcceptTerms: true})
	if err != nil {
		t.Fatal(err)
	}
	row, err := f.client.AuthMessage.Query().Where(authmessage.ChallengeIDEQ(id)).Only(ctx)
	if err != nil || len(row.EncryptedPayload) == 0 {
		t.Fatal("missing encrypted message", err)
	}
	sender := &recordingSender{}
	job := jobs.Job{Payload: []byte(`{"message_id":"` + row.ID + `"}`)}
	if err = f.service.EmailHandler(sender)(ctx, job); err != nil || len(sender.messages) != 1 {
		t.Fatal("encrypted presentation not delivered", err)
	}
	message := sender.messages[0]
	if len(message.View.Code) != 6 || strings.Contains(message.View.Preview, message.View.Code) || strings.Contains(string(row.EncryptedPayload), "rich-email@example.test") {
		t.Fatal("verification code presentation or encrypted privacy boundary changed")
	}
	html, err := emailtemplate.Render(message.Subject, message.Body, message.View)
	if err != nil || strings.Count(html, message.View.Code) != 1 || !strings.Contains(html, "customer portal login") {
		t.Fatal("incorrect verification markup", err)
	}
	row, err = f.client.AuthMessage.Get(ctx, row.ID)
	if err != nil || len(row.EncryptedPayload) != 0 || row.SentAt == nil {
		t.Fatal("delivered presentation was not redacted", err)
	}
	if err = f.service.EmailHandler(sender)(ctx, job); err != nil || len(sender.messages) != 1 {
		t.Fatal("completed delivery retried", err)
	}
}

func emailForOrderEvent(t *testing.T, f *paymentFixture, id, action string) *ent.Notification {
	t.Helper()
	event, err := f.base.auth.client.OrderEvent.Query().Where(orderevent.OrderIDEQ(id), orderevent.ActionEQ(action)).Only(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	row, err := f.base.auth.client.Notification.Query().Where(notification.MessageIDEQ(event.ID), notification.UserIDEQ(f.base.buyer.User.ID)).Only(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	return row
}

func TestRichEmailSellerPayoutRequiresProviderConfirmation(t *testing.T) {
	f := resaleDB(t, "buy_first")
	ctx := t.Context()
	if err := f.store.SellerObligationHandler()(ctx, jobs.Job{Payload: []byte(`{"offer_id":"` + f.offer.ID + `"}`)}); err != nil {
		t.Fatal(err)
	}
	rows, err := f.store.SellerPayouts(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || len(rows) != 1 {
		t.Fatal("missing seller obligation", err)
	}
	provider := &outgoingFixture{}
	f.store.ConfigureOutgoing(provider, true)
	value, err := f.store.ConfirmSellerRecipient(ctx, f.base.other, rows[0].ID, payments.RecipientInput{Version: rows[0].Version, Address: "synthetic-seller-destination", Accept: true})
	if err != nil {
		t.Fatal(err)
	}
	value, err = f.store.ApproveSellerPayout(ctx, f.base.admin, value.ID, payments.TransferChange{Version: value.Version, Reason: "Synthetic verified seller obligation."})
	if err != nil {
		t.Fatal(err)
	}
	shared := &refundFixture{paymentFixture: f.paymentFixture, provider: provider}
	shared.issue(t, value.ID)
	confirmed := f.base.auth.client.SubmissionEvent.Query().Where(submissionevent.SubmissionIDEQ(f.offer.SubmissionID), submissionevent.ActionEQ("seller_payout_confirmed"))
	if count, countErr := confirmed.Count(ctx); countErr != nil || count != 0 {
		t.Fatal("unverified payout announced confirmation", countErr)
	}
	provider.status("finished")
	shared.read(t)
	event, err := confirmed.Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	notice, err := f.base.auth.client.Notification.Query().Where(notification.MessageIDEQ(event.ID), notification.UserIDEQ(f.base.other.User.ID)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	store, err := notifications.New(f.base.auth.client, f.base.auth.service, f.base.auth.cfg.PublicOrigin)
	if err != nil {
		t.Fatal(err)
	}
	sender := &activitySender{}
	if err = store.EmailHandler(sender)(ctx, jobs.Job{Payload: []byte(`{"notification_id":"` + notice.ID + `"}`)}); err != nil {
		t.Fatal(err)
	}
	if len(sender.sent) != 1 || sender.sent[0].Subject != "Seller payout confirmed | PLAYORA" || !strings.Contains(sender.sent[0].Body, "/sell/"+f.offer.SubmissionID) || strings.Contains(sender.sent[0].Body, "synthetic-seller-destination") {
		t.Fatal("seller confirmation missing or disclosed payment destination")
	}
}

func TestRichEmailVerifiedPaymentRetryAndPrivacy(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	detail := f.base.create(t, "package")
	attempt := f.start(t, detail)
	f.issue(t, attempt)
	f.reconcile(t, f.evidence(t, attempt, "9501", "waiting", "0"))
	count, err := f.base.auth.client.OrderEvent.Query().Where(orderevent.OrderIDEQ(detail.Order.ID), orderevent.ActionEQ("payment_verified")).Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("unconfirmed payment created confirmation", err)
	}
	f.reconcile(t, f.evidence(t, attempt, "9501", "finished", "12.34000001"))
	notice := emailForOrderEvent(t, f, detail.Order.ID, "payment_verified")
	store, err := notifications.New(f.base.auth.client, f.base.auth.service, f.base.auth.cfg.PublicOrigin)
	if err != nil {
		t.Fatal(err)
	}
	sender := &activitySender{fail: true}
	handler := store.EmailHandler(sender)
	job := jobs.Job{Payload: []byte(`{"notification_id":"` + notice.ID + `"}`)}
	if err = handler(ctx, job); err == nil {
		t.Fatal("delivery error swallowed")
	}
	sender.fail = false
	if err = handler(ctx, job); err != nil {
		t.Fatal(err)
	}
	if err = handler(ctx, job); err != nil {
		t.Fatal(err)
	}
	if len(sender.sent) != 1 || sender.sent[0].Subject != "Payment confirmed | PLAYORA" {
		t.Fatal("confirmation or retry deduplication missing")
	}
	message := sender.sent[0]
	html, err := emailtemplate.Render(message.Subject, message.Body, message.View)
	if err != nil || !strings.Contains(html, "/orders/"+detail.Order.ID) || strings.Contains(html, "ordinary customer note") || strings.Contains(html, "synthetic-merchant") {
		t.Fatal("invalid/private confirmation", err)
	}
}

func TestRichEmailStalePaymentAndForeignResourceSuppression(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	detail := f.base.create(t, "package")
	attempt := f.start(t, detail)
	f.issue(t, attempt)
	f.reconcile(t, f.evidence(t, attempt, "9502", "finished", "12.34000001"))
	notice := emailForOrderEvent(t, f, detail.Order.ID, "payment_verified")
	f.reconcile(t, f.evidence(t, attempt, "9502", "refunded", "12.34000001"))
	store, err := notifications.New(f.base.auth.client, f.base.auth.service, f.base.auth.cfg.PublicOrigin)
	if err != nil {
		t.Fatal(err)
	}
	sender := &activitySender{}
	handler := store.EmailHandler(sender)
	if err = handler(ctx, jobs.Job{Payload: []byte(`{"notification_id":"` + notice.ID + `"}`)}); err != nil {
		t.Fatal(err)
	}
	if len(sender.sent) != 1 || strings.Contains(sender.sent[0].Subject, "Payment confirmed") {
		t.Fatal("stale confirmation presented as current")
	}
	reversal := emailForOrderEvent(t, f, detail.Order.ID, "payment_reversed")
	// Simulate a corrupted recipient reference; send-time ownership must fail closed.
	executeSQL(t, f.base.auth.db, "UPDATE notifications SET user_id=? WHERE id=?", f.base.other.User.ID, reversal.ID)
	if err = handler(ctx, jobs.Job{Payload: []byte(`{"notification_id":"` + reversal.ID + `"}`)}); err != nil {
		t.Fatal(err)
	}
	row, err := f.base.auth.client.Notification.Get(ctx, reversal.ID)
	if err != nil || len(sender.sent) != 1 || row.EmailState != notification.EmailStateSuppressed {
		t.Fatal("foreign resource was emailed", err)
	}
}

func TestRichEmailRefundOnlyAfterVerifiedTransfer(t *testing.T) {
	f := refundDB(t)
	ctx := t.Context()
	f.decision(t)
	value := f.recipient(t, f.proposal(t, "1"))
	approved, err := f.store.ApproveRefund(ctx, f.base.admin, value.ID, payments.TransferChange{Version: value.Version, Reason: "Synthetic approved partial refund."})
	if err != nil {
		t.Fatal(err)
	}
	f.issue(t, approved.ID)
	count, err := f.base.auth.client.OrderEvent.Query().Where(orderevent.OrderIDEQ(f.orderID), orderevent.ActionEQ("refund_confirmed")).Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("pending transfer claimed confirmation", err)
	}
	f.provider.status("finished")
	f.read(t)
	notice := emailForOrderEvent(t, f.paymentFixture, f.orderID, "refund_confirmed")
	store, err := notifications.New(f.base.auth.client, f.base.auth.service, f.base.auth.cfg.PublicOrigin)
	if err != nil {
		t.Fatal(err)
	}
	sender := &activitySender{}
	if err = store.EmailHandler(sender)(ctx, jobs.Job{Payload: []byte(`{"notification_id":"` + notice.ID + `"}`)}); err != nil {
		t.Fatal(err)
	}
	if len(sender.sent) != 1 || sender.sent[0].Subject != "Refund transfer confirmed | PLAYORA" || !strings.Contains(sender.sent[0].Body, "one part") || strings.Contains(sender.sent[0].Body, "synthetic-recipient-address") {
		t.Fatal("incorrect refund completion/privacy copy")
	}
}
