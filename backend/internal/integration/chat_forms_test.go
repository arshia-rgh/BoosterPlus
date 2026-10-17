//go:build integration

package integration

import (
	"bytes"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationform"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

func chatForms(t *testing.T, f *orderFixture) *conversations.Store {
	t.Helper()
	keys, err := vault.NewKeyring("chat", map[string][]byte{"chat": vaultKey(t)})
	if err != nil {
		t.Fatal(err)
	}
	return conversations.NewWithVault(f.auth.client, f.auth.service, keys, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
}
func chatRequest(f *orderFixture) conversations.FormCreate {
	return conversations.FormCreate{RequestKey: uuid.NewString(), Mode: "request", Purpose: "information", Recipient: "customer", Title: "Requested account details", Description: "Synthetic isolated request", Fields: []conversations.FormField{{Key: "region", Label: "Region", Kind: "text", Required: true}, {Key: "access", Label: "Protected access", Kind: "multiline", Required: true, Secure: true}}, ExpiresAt: time.Unix(f.auth.clock.Load(), 0).Add(time.Hour)}
}
func TestChatFormsIsolationEncryptionRetryExpiryAndCancellation(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := chatForms(t, f)
	thread, err := store.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Private synthetic chat"})
	if err != nil {
		t.Fatal(err)
	}
	in := chatRequest(f)
	if _, err = store.CreateForm(ctx, f.buyer, thread.ID, in); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer authored form", err)
	}
	row, err := store.CreateForm(ctx, f.admin, thread.ID, in)
	if err != nil {
		t.Fatal(err)
	}
	retry, err := store.CreateForm(ctx, f.admin, thread.ID, in)
	if err != nil || retry.ID != row.ID {
		t.Fatal("create retry", err)
	}
	if _, err = store.Form(ctx, f.other, thread.ID, row.ID, false); !ent.IsNotFound(err) {
		t.Fatal("foreign form read", err)
	}
	input := conversations.FormReply{RequestKey: uuid.NewString(), Version: row.Version, Answers: map[string]string{"region": "test-region", "access": "synthetic-secret\nsecond-line"}}
	if _, err = store.ReplyForm(ctx, f.other, thread.ID, row.ID, input); err == nil {
		t.Fatal("foreign answer")
	}
	var wg sync.WaitGroup
	for range 3 {
		wg.Go(func() {
			if _, e := store.ReplyForm(ctx, f.buyer, thread.ID, row.ID, input); e != nil {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	stored, err := f.auth.client.ConversationForm.Get(ctx, row.ID)
	if err != nil || stored.Answers["access"] != "" || stored.Answers["region"] != "test-region" {
		t.Fatal("private answer in ordinary document", err)
	}
	bundle, err := f.auth.client.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeChatForm), secretbundle.ResourceIDEQ(row.ID)).Only(ctx)
	if err != nil || bytes.Contains(bundle.EncryptedPayload, []byte("synthetic-secret")) {
		t.Fatal("not encrypted", err)
	}
	messages, err := store.Messages(ctx, f.buyer, thread.ID, false, 0)
	if err != nil || len(messages.Messages) != 2 {
		t.Fatal("duplicate response", err)
	}
	safe, marshalErr := json.Marshal(messages)
	if marshalErr != nil {
		t.Fatal(marshalErr)
	}
	if strings.Contains(string(safe), "synthetic-secret") || strings.Contains(string(safe), "test-region") {
		t.Fatal("answers in messages")
	}
	view, err := store.Form(ctx, f.buyer, thread.ID, row.ID, false)
	if err != nil || !view.CanReveal {
		t.Fatal("read answer", err)
	}
	safe, marshalErr = json.Marshal(view)
	if marshalErr != nil {
		t.Fatal(marshalErr)
	}
	if strings.Contains(string(safe), "synthetic-secret") {
		t.Fatal("secure answer in read view")
	}
	value, err := store.RevealForm(ctx, f.admin, thread.ID, row.ID, true)
	if err != nil || !strings.Contains(string(value), `synthetic-secret\nsecond-line`) {
		t.Fatal("protected reveal", err)
	}
	clear(value)
	input.Answers["access"] = "changed"
	if _, err = store.ReplyForm(ctx, f.buyer, thread.ID, row.ID, input); !errors.Is(err, conversations.ErrConflict) {
		t.Fatal("changed key replay", err)
	}
	row, err = store.CancelForm(ctx, f.admin, thread.ID, row.ID, stored.Version)
	if err != nil || row.State != "cancelled" {
		t.Fatal("cancel", err)
	}
	if value, err = store.RevealForm(ctx, f.admin, thread.ID, row.ID, true); err == nil || len(value) > 0 {
		t.Fatal("cancelled reveal")
	}
	bundle, err = f.auth.client.SecretBundle.Get(ctx, bundle.ID)
	if err != nil || len(bundle.EncryptedPayload) > 0 || len(bundle.WrappedKey) > 0 {
		t.Fatal("cancel kept protected bytes", err)
	}
	in.RequestKey = uuid.NewString()
	in.Mode = "share"
	in.Answers = map[string]string{"region": "test-region", "access": "shared isolated text"}
	row, err = store.CreateForm(ctx, f.admin, thread.ID, in)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "UPDATE conversation_forms SET expires_at = ? WHERE id = ?", time.Unix(f.auth.clock.Load(), 0).Add(-time.Second), row.ID); err != nil {
		t.Fatal(err)
	}
	view, err = store.Form(ctx, f.buyer, thread.ID, row.ID, false)
	if err != nil || view.State != "expired" || view.CanReveal {
		t.Fatal("expiry", err)
	}
}
func TestChatFormsFailedAuditRollsBackAnswersAndMessages(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := chatForms(t, f)
	thread, err := store.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Audit failure fixture"})
	if err != nil {
		t.Fatal(err)
	}
	row, err := store.CreateForm(ctx, f.admin, thread.ID, chatRequest(f))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if _, err = store.ReplyForm(ctx, f.buyer, thread.ID, row.ID, conversations.FormReply{Version: 1, RequestKey: uuid.NewString(), Answers: map[string]string{"region": "A", "access": "secret"}}); err == nil {
		t.Fatal("missing audit accepted")
	}
	stored, err := f.auth.client.ConversationForm.Get(ctx, row.ID)
	if err != nil || stored.State != conversationform.StateOpen || len(stored.Answers) > 0 {
		t.Fatal("partial write", err)
	}
	count, err := f.auth.client.ConversationMessage.Query().Where(conversationmessage.ConversationIDEQ(thread.ID)).Count(ctx)
	if err != nil || count != 1 {
		t.Fatal("partial message", err)
	}
	count, err = f.auth.client.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeChatForm)).Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("partial secret", err)
	}
}
func TestChatFormsBoostingAccessAndAssignmentFence(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	detail := f.paid(t, "solo")
	work := f.handoff(t, f.assign(t, detail))
	store := chatForms(t, f.orderFixture)
	thread, err := store.OpenCoordination(ctx, f.admin, work.OrderID, work.Version)
	if err != nil {
		t.Fatal(err)
	}
	in := chatRequest(f.orderFixture)
	in.Purpose = "game_access"
	in.ShareWithBooster = true
	row, err := store.CreateForm(ctx, f.admin, thread.ID, in)
	if err != nil {
		t.Fatal(err)
	}
	row, err = store.ReplyForm(ctx, f.buyer, thread.ID, row.ID, conversations.FormReply{Version: row.Version, RequestKey: uuid.NewString(), Answers: map[string]string{"region": "A", "access": "isolated access"}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.RevealForm(ctx, f.second, thread.ID, row.ID, false); err == nil {
		t.Fatal("unassigned reveal")
	}
	raw, err := store.RevealForm(ctx, f.booster, thread.ID, row.ID, false)
	if err != nil || len(raw) == 0 {
		t.Fatal("assigned reveal", err)
	}
	clear(raw)
	work, err = f.work.Get(ctx, f.admin, work.OrderID, "admin")
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.work.Transition(ctx, f.booster, work.OrderID, "booster", "start", updateWork(work))
	if err != nil {
		t.Fatal("form not recognized for start", err)
	}
	work, err = f.work.Get(ctx, f.admin, work.OrderID, "admin")
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.work.Assign(ctx, f.admin, work.OrderID, fulfillment.Assignment{Version: work.Version, OrderVersion: work.OrderVersion, AssignedID: f.second.User.ID, Reason: "Synthetic reassignment"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.RevealForm(ctx, f.booster, thread.ID, row.ID, false); err == nil {
		t.Fatal("former assignment retained")
	}
	if _, err = store.RevealForm(ctx, f.second, thread.ID, row.ID, false); err == nil {
		t.Fatal("new assignment inherited private form")
	}
	bundle, e := f.auth.client.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeChatForm), secretbundle.ResourceIDEQ(row.ID)).Only(ctx)
	if e != nil || len(bundle.EncryptedPayload) != 0 || bundle.State != secretbundle.StateDeleted {
		t.Fatal("reassignment retained protected data", e)
	}
	in.RequestKey = uuid.NewString()
	replacement, e := store.CreateForm(ctx, f.admin, thread.ID, in)
	if e != nil {
		t.Fatal("cannot request new access while reassignment is on hold", e)
	}
	_, e = store.ReplyForm(ctx, f.buyer, thread.ID, replacement.ID, conversations.FormReply{Version: 1, RequestKey: uuid.NewString(), Answers: map[string]string{"region": "A", "access": "fresh replacement"}})
	if e != nil {
		t.Fatal(e)
	}
}
func TestChatFormsConsignmentPublicationAndSellerReceipt(t *testing.T) {
	f := resaleDraftDB(t, "consignment", false)
	ctx := t.Context()
	f.publish(t)
	progress, err := f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || progress.ListingState != "published" || len(progress.Blockers) != 0 {
		t.Fatal("credentials still block publication", err)
	}
	store := chatForms(t, f.base)
	thread, err := f.base.auth.client.Conversation.Query().Where(conversation.SubmissionIDEQ(f.offer.SubmissionID)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	in := chatRequest(f.base)
	in.Purpose = "seller_access"
	row, err := store.CreateForm(ctx, f.base.admin, thread.ID, in)
	if err != nil {
		t.Fatal(err)
	}
	_, err = store.ReplyForm(ctx, f.base.other, thread.ID, row.ID, conversations.FormReply{Version: row.Version, RequestKey: uuid.NewString(), Answers: map[string]string{"region": "A", "access": "seller requested access"}})
	if err != nil {
		t.Fatal(err)
	}
	progress, err = f.resale.Progress(ctx, f.base.other, f.offer.SubmissionID, false)
	if err != nil || progress.Handover.State != "received" {
		t.Fatal("form receipt missing", err)
	}
}

func TestChatFormsBuyerDeliveryRequiresPaymentConfirmationAndRetainsDisputeHold(t *testing.T) {
	f := resaleDraftDB(t, "consignment", false)
	ctx := t.Context()
	f.publish(t)
	order := f.reserve(t)
	store := chatForms(t, f.base)
	thread, err := store.Create(ctx, f.base.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "order", OrderID: order.Order.ID, Subject: "Buyer delivery"})
	if err != nil {
		t.Fatal(err)
	}
	input := chatRequest(f.base)
	input.Mode = "share"
	input.Purpose = "buyer_access"
	input.ExpiresAt = time.Unix(f.base.auth.clock.Load(), 0).Add(72 * time.Hour)
	input.Answers = map[string]string{"region": "A", "access": "buyer-specific access\nnew recovery line"}
	if _, err = store.CreateForm(ctx, f.base.admin, thread.ID, input); err == nil {
		t.Fatal("unpaid delivery created")
	}
	attempt := f.start(t, order)
	f.issue(t, attempt)
	f.reconcile(t, f.evidence(t, attempt, "915", "finished", "12.34000001"))
	row, err := store.CreateForm(ctx, f.base.admin, thread.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	view, err := store.Form(ctx, f.base.buyer, thread.ID, row.ID, false)
	if err != nil || view.CanReveal {
		t.Fatal("pending delivery offered reveal", err)
	}
	if value, e := store.RevealForm(ctx, f.base.buyer, thread.ID, row.ID, false); e == nil || len(value) > 0 {
		t.Fatal("undelivered access leaked")
	}
	delivery, err := f.resale.Delivery(ctx, f.base.admin, order.Order.ID, true)
	if err != nil || delivery.FormID != row.ID || delivery.Secret.State != "active" || delivery.ActiveCase {
		t.Fatal("form delivery receipt", err)
	}
	delivery, err = f.resale.ChangeDelivery(ctx, f.base.admin, order.Order.ID, "deliver", true, resale.DeliveryChange{Version: delivery.Version, SecretVersion: delivery.Secret.Version, Accept: true, Instructions: "Change recovery details and test access before acknowledging."})
	if err != nil {
		t.Fatal("deliver form", err)
	}
	if _, err = store.CancelForm(ctx, f.base.admin, thread.ID, row.ID, row.Version); err == nil {
		t.Fatal("delivered access cancelled outside resolution")
	}
	value, err := store.RevealForm(ctx, f.base.buyer, thread.ID, row.ID, false)
	if err != nil || !strings.Contains(string(value), "buyer-specific") {
		t.Fatal("buyer reveal", err)
	}
	clear(value)
	if _, err = store.RevealForm(ctx, f.base.other, thread.ID, row.ID, false); err == nil {
		t.Fatal("seller saw buyer access")
	}
	if _, err = f.resale.ChangeDelivery(ctx, f.base.buyer, order.Order.ID, "acknowledge", false, resale.DeliveryChange{Version: delivery.Version, Accept: true, Instructions: "I tested the synthetic account and received the agreed access."}); err != nil {
		t.Fatal(err)
	}
	record, err := f.store.OpenCase(ctx, f.base.buyer, order.Order.ID, false, payments.CaseInput{RequestKey: uuid.NewString(), Kind: "dispute", Note: "Synthetic access concern needs review."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.RevealForm(ctx, f.base.buyer, thread.ID, row.ID, false); err == nil {
		t.Fatal("dispute hold ignored")
	}
	delivery, err = f.resale.Delivery(ctx, f.base.buyer, order.Order.ID, false)
	if err != nil || !delivery.ActiveCase {
		t.Fatal("delivery omitted the active dispute hold", err)
	}
	record, err = f.store.ChangeCase(ctx, f.base.admin, record.ID, "decide", true, payments.CaseChange{Version: record.Version, Outcome: "rework", Note: "Prepare fresh access after the synthetic review."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.ChangeCase(ctx, f.base.buyer, record.ID, "accept", false, payments.CaseChange{Version: record.Version, Note: "I accept the fresh synthetic delivery proposal."}); err != nil {
		t.Fatal(err)
	}
	saved, err := f.base.auth.client.ConversationForm.Get(ctx, row.ID)
	if err != nil || saved.State != conversationform.StateCancelled {
		t.Fatal("rework retained form", err)
	}
	delivery, err = f.resale.Delivery(ctx, f.base.buyer, order.Order.ID, false)
	if err != nil || delivery.ActiveCase {
		t.Fatal("closed case retained an active dispute indicator", err)
	}
}
