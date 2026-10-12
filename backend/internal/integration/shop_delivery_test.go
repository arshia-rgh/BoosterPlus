//go:build integration

package integration

import (
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
)

func shopDeliveryFixture(t *testing.T, paid bool) (*paymentFixture, *shop.Store, string) {
	t.Helper()
	f := paymentDB(t)
	store, id := shopDeliveryForFixture(t, f, paid)
	return f, store, id
}
func shopDeliveryForFixture(t *testing.T, f *paymentFixture, paid bool) (*shop.Store, string) {
	t.Helper()
	detail, _, _ := shopPaymentOrder(t, f)
	if _, err := supportStore(f.base).Create(t.Context(), f.base.buyer, false, conversations.CreateInput{Kind: "order", OrderID: detail.Order.ID, RequestKey: uuid.NewString(), Subject: "Synthetic shop delivery support"}); err != nil {
		t.Fatal(err)
	}
	if _, err := f.base.auth.client.ShopRecipient.Create().SetOrderID(detail.Order.ID).SetUserID(f.base.buyer.User.ID).SetRecipientValues(map[string]string{"player_id": "synthetic-player"}).Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	if paid {
		attempt := f.start(t, detail)
		f.issue(t, attempt)
		if record := f.reconcile(t, f.evidence(t, attempt, "960", "finished", "12.34000001")); record.State != "settled" {
			t.Fatal("fixture not settled", record.Issue)
		}
	}
	return shopStore(f.base), detail.Order.ID
}
func deliveryChange(t *testing.T, f *paymentFixture, store *shop.Store, id, action, proof string) shop.DeliveryView {
	t.Helper()
	view, err := store.Delivery(t.Context(), f.base.admin, id, true)
	if err != nil {
		t.Fatal(err)
	}
	view, err = store.ChangeDelivery(t.Context(), f.base.admin, id, action, shop.DeliveryChange{OrderVersion: view.OrderVersion, Version: view.Version, Note: "Explicit synthetic delivery review.", ProofMessageID: proof})
	if err != nil {
		t.Fatal(action, err)
	}
	return view
}

// Synthetic media represents scanner output only in a disposable test database.
func shopDeliveryProof(t *testing.T, f *paymentFixture, id string) (*ent.ConversationMessage, *ent.MediaFile) {
	t.Helper()
	ctx := t.Context()
	thread, err := f.base.auth.client.Conversation.Query().Where(conversation.OrderIDEQ(id)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	mediaID := uuid.NewString()
	image, err := f.base.auth.client.MediaFile.Create().SetID(mediaID).SetUserID(f.base.admin.User.ID).SetConversationID(thread.ID).SetVisibility(mediafile.VisibilityPublic).SetRequestKey(uuid.NewString()).SetRequestHash(strings.Repeat("d", 64)).SetChecksum(strings.Repeat("a", 64)).SetSize(10).SetContentType("image/png").SetState(mediafile.StateReady).SetCleanContentType("image/png").SetCleanChecksum(strings.Repeat("a", 64)).SetCleanSize(10).SetExpiresAt(time.Now().Add(time.Hour)).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	published, err := supportStore(f.base).Send(ctx, f.base.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Synthetic reviewed delivery evidence.", Visibility: "public", Purpose: "proof", Attachments: []string{mediaID}})
	if err != nil {
		t.Fatal(err)
	}
	message, err := f.base.auth.client.ConversationMessage.Get(ctx, published.ID)
	if err != nil {
		t.Fatal(err)
	}
	return message, image
}
func TestShopDeliveryReviewedLifecycleAndRecipientIsolation(t *testing.T) {
	f, store, id := shopDeliveryFixture(t, true)
	ctx := t.Context()
	for _, p := range []*identity.Principal{nil, f.base.buyer, f.base.other} {
		if _, err := store.ChangeDelivery(ctx, p, id, "claim", shop.DeliveryChange{OrderVersion: 2, Note: "Unauthorized synthetic claim."}); err == nil {
			t.Fatal("unauthorized staff claim")
		}
	}
	if out, err := store.Delivery(ctx, f.base.other, id, false); err == nil || out.OrderID != "" {
		t.Fatal("foreign delivery disclosed")
	}
	if _, err := store.RevealRecipient(ctx, f.base.admin, id, true); err == nil {
		t.Fatal("unassigned staff recipient disclosed")
	}
	recipient, err := store.RevealRecipient(ctx, f.base.buyer, id, false)
	if err != nil || recipient.Values["player_id"] != "synthetic-player" {
		t.Fatal("owner recipient", err)
	}
	if out, e := store.RevealRecipient(ctx, f.base.other, id, false); e == nil || out.Values != nil {
		t.Fatal("foreign recipient disclosed")
	}
	claimed := deliveryChange(t, f, store, id, "claim", "")
	if claimed.State != "processing" || claimed.OrderState != "in_progress" {
		t.Fatal("claim state", claimed.State)
	}
	if _, err = store.RevealRecipient(ctx, f.base.admin, id, true); err != nil {
		t.Fatal(err)
	}
	if _, err = store.ChangeDelivery(ctx, f.base.admin, id, "hold", shop.DeliveryChange{OrderVersion: claimed.OrderVersion - 1, Version: claimed.Version, Note: "Stale delivery action should fail."}); !errors.Is(err, shop.ErrConflict) {
		t.Fatal("stale action", err)
	}
	deliveryChange(t, f, store, id, "hold", "")
	deliveryChange(t, f, store, id, "resume", "")
	message, file := shopDeliveryProof(t, f, id)
	deliveryChange(t, f, store, id, "submit", message.ID)
	// A scanner/storage revocation after submission must block review approval.
	if _, err = f.base.auth.client.MediaFile.UpdateOne(file).SetState(mediafile.StateRejected).Save(ctx); err != nil {
		t.Fatal(err)
	}
	view, err := store.Delivery(ctx, f.base.admin, id, true)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.ChangeDelivery(ctx, f.base.admin, id, "approve", shop.DeliveryChange{OrderVersion: view.OrderVersion, Version: view.Version, Note: "Do not accept revoked media evidence."}); !errors.Is(err, shop.ErrConflict) {
		t.Fatal("revoked evidence accepted", err)
	}
	if _, err = f.base.auth.client.MediaFile.UpdateOne(file).SetState(mediafile.StateReady).Save(ctx); err != nil {
		t.Fatal(err)
	}
	deliveryChange(t, f, store, id, "return", "")
	deliveryChange(t, f, store, id, "submit", message.ID)
	completed := deliveryChange(t, f, store, id, "approve", "")
	if completed.State != "completed" || completed.OrderState != "completed" {
		t.Fatal("completion state")
	}
	public, err := store.Delivery(ctx, f.base.buyer, id, false)
	if err != nil || public.AssignedID != "" || public.ProofMessageID != message.ID {
		t.Fatal("customer delivery", err)
	}
	if out, e := store.RevealRecipient(ctx, f.base.admin, id, true); e == nil || out.Values != nil {
		t.Fatal("closed recipient access")
	}
}
func TestShopDeliveryConcurrencyAndAuditRollback(t *testing.T) {
	f, store, id := shopDeliveryFixture(t, true)
	ctx := t.Context()
	view, err := store.Delivery(ctx, f.base.admin, id, true)
	if err != nil {
		t.Fatal(err)
	}
	var successes atomic.Int32
	var group sync.WaitGroup
	for range 4 {
		group.Go(func() {
			_, e := store.ChangeDelivery(ctx, f.base.admin, id, "claim", shop.DeliveryChange{OrderVersion: view.OrderVersion, Note: "Concurrent synthetic claim attempt."})
			if e == nil {
				successes.Add(1)
			} else if !errors.Is(e, shop.ErrConflict) {
				t.Error(e)
			}
		})
	}
	group.Wait()
	if successes.Load() != 1 {
		t.Fatal("duplicate assignment", successes.Load())
	}
	view, err = store.Delivery(ctx, f.base.admin, id, true)
	if err != nil {
		t.Fatal(err)
	}
	// Destructive fault injection is restricted to the isolated disposable database.
	if _, err = f.base.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if out, e := store.RevealRecipient(ctx, f.base.admin, id, true); e == nil || out.Values != nil {
		t.Fatal("unaudited private data returned")
	}
	if out, e := store.ChangeDelivery(ctx, f.base.admin, id, "hold", shop.DeliveryChange{OrderVersion: view.OrderVersion, Version: view.Version, Note: "Audit failure must roll back all effects."}); e == nil || out.OrderID != "" {
		t.Fatal("unaudited change returned")
	}
	after, err := store.Delivery(ctx, f.base.admin, id, true)
	if err != nil || after.Version != view.Version || after.OrderVersion != view.OrderVersion || after.State != "processing" {
		t.Fatal("partial transaction", err)
	}
}
func TestShopDeliveryPaymentAndRecentAuthenticationGuards(t *testing.T) {
	for _, mode := range []string{"unpaid", "receipt_missing", "recipient_erased", "stale_auth", "suspended"} {
		t.Run(mode, func(t *testing.T) {
			f, store, id := shopDeliveryFixture(t, mode != "unpaid")
			ctx := t.Context()
			view, err := store.Delivery(ctx, f.base.admin, id, true)
			if err != nil {
				t.Fatal(err)
			}
			switch mode {
			case "receipt_missing":
				_, err = f.base.auth.client.PaymentReceipt.Delete().Exec(ctx)
			case "recipient_erased":
				_, err = f.base.auth.client.ShopRecipient.Update().SetErasedAt(time.Now()).Save(ctx)
			case "stale_auth":
				_, err = f.base.auth.client.AuthSession.UpdateOneID(f.base.admin.Session.ID).SetAuthenticatedAt(time.Unix(f.base.auth.clock.Load(), 0).Add(-time.Hour)).SetMfaVerifiedAt(time.Unix(f.base.auth.clock.Load(), 0).Add(-time.Hour)).Save(ctx)
			case "suspended":
				_, err = f.base.auth.client.User.UpdateOneID(f.base.admin.User.ID).SetSuspended(true).Save(ctx)
			}
			if err != nil {
				t.Fatal(err)
			}
			if out, e := store.ChangeDelivery(ctx, f.base.admin, id, "claim", shop.DeliveryChange{OrderVersion: view.OrderVersion, Note: "Unsafe delivery must not begin."}); e == nil || out.OrderID != "" {
				t.Fatal("guard failed", mode)
			}
			count, err := f.base.auth.client.ShopDelivery.Query().Count(ctx)
			if err != nil || count != 0 {
				t.Fatal("rejected delivery retained work", err)
			}
		})
	}
}
func TestShopDeliveryCasesInvalidatePendingReview(t *testing.T) {
	for _, outcome := range []string{"continue", "cancel"} {
		t.Run(outcome, func(t *testing.T) {
			f, store, id := shopDeliveryFixture(t, true)
			ctx := t.Context()
			deliveryChange(t, f, store, id, "claim", "")
			message, _ := shopDeliveryProof(t, f, id)
			view := deliveryChange(t, f, store, id, "submit", message.ID)
			record, err := f.store.OpenCase(ctx, f.base.buyer, id, false, payments.CaseInput{RequestKey: uuid.NewString(), Kind: "cancellation", Note: "Please review the synthetic delivery."})
			if err != nil {
				t.Fatal(err)
			}
			if _, err = store.ChangeDelivery(ctx, f.base.admin, id, "approve", shop.DeliveryChange{OrderVersion: view.OrderVersion, Version: view.Version, Note: "An active case must block completion."}); err == nil {
				t.Fatal("case ignored")
			}
			decision, err := f.store.ChangeCase(ctx, f.base.admin, record.ID, "decide", true, payments.CaseChange{Version: record.Version, Outcome: outcome, Note: "Explicit reviewed delivery decision."})
			if err != nil {
				t.Fatal(err)
			}
			if _, err = f.store.ChangeCase(ctx, f.base.buyer, record.ID, "accept", false, payments.CaseChange{Version: decision.Version, Note: "I accept the synthetic case decision."}); err != nil {
				t.Fatal(err)
			}
			view, err = store.Delivery(ctx, f.base.admin, id, true)
			if err != nil {
				t.Fatal(err)
			}
			if outcome == "continue" {
				if view.State != "held" || view.OrderState != string(order.StateOnHold) || view.ProofMessageID != "" {
					t.Fatal("case retained stale submission")
				}
				deliveryChange(t, f, store, id, "resume", "")
			} else if view.State != "cancelled" || view.OrderState != "cancelled" {
				t.Fatal("case left delivery active")
			}
			stock, err := f.base.auth.client.ShopStock.Query().Only(ctx)
			if err != nil || stock.Committed != 1 || stock.Reserved != 0 {
				t.Fatal("case restocked delivery", err)
			}
		})
	}
}

func TestShopDeliveryProofCannotCrossOrderAudienceOrPurpose(t *testing.T) {
	f, store, id := shopDeliveryFixture(t, true)
	ctx := t.Context()
	view := deliveryChange(t, f, store, id, "claim", "")
	message, file := shopDeliveryProof(t, f, id)
	// Deliberate stored-evidence corruption exercises every binding independently;
	// these immutable fields cannot be changed through the application's API.
	cases := []struct {
		query    string
		invalid  any
		original any
	}{
		{"UPDATE conversation_messages SET purpose=? WHERE id=?", "message", "proof"},
		{"UPDATE conversation_messages SET sender_id=? WHERE id=?", f.base.other.User.ID, f.base.admin.User.ID},
		{"UPDATE conversation_messages SET sender_role=? WHERE id=?", "customer", f.base.admin.User.Role},
		{"UPDATE conversation_messages SET visibility=? WHERE id=?", "internal", "public"},
		{"UPDATE conversation_messages SET attachments=? WHERE id=?", "[]", "[\"" + file.ID + "\"]"},
		{"UPDATE conversation_messages SET attachments=? WHERE id=?", "[\"" + file.ID + "\",\"" + file.ID + "\"]", "[\"" + file.ID + "\"]"},
	}
	for _, test := range cases {
		t.Run(test.query, func(t *testing.T) {
			query := test.query
			if _, err := f.base.auth.db.ExecContext(ctx, query, test.invalid, message.ID); err != nil {
				t.Fatal(err)
			}
			if _, err := store.ChangeDelivery(ctx, f.base.admin, id, "submit", shop.DeliveryChange{OrderVersion: view.OrderVersion, Version: view.Version, Note: "Reject mismatched synthetic evidence.", ProofMessageID: message.ID}); err == nil {
				t.Fatal("unsafe proof accepted")
			}
			if _, err := f.base.auth.db.ExecContext(ctx, query, test.original, message.ID); err != nil {
				t.Fatal(err)
			}
		})
	}
	thread, err := f.base.auth.client.Conversation.Get(ctx, message.ConversationID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.base.auth.db.ExecContext(ctx, "UPDATE conversations SET order_id=? WHERE id=?", uuid.NewString(), thread.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = store.ChangeDelivery(ctx, f.base.admin, id, "submit", shop.DeliveryChange{OrderVersion: view.OrderVersion, Version: view.Version, Note: "Reject another order's evidence.", ProofMessageID: message.ID}); err == nil {
		t.Fatal("foreign order proof accepted")
	}
	if _, err = f.base.auth.db.ExecContext(ctx, "UPDATE conversations SET order_id=? WHERE id=?", id, thread.ID); err != nil {
		t.Fatal(err)
	}
	deliveryChange(t, f, store, id, "submit", message.ID)
}

func TestShopDeliveryProofPublicationBoundaries(t *testing.T) {
	f, store, id := shopDeliveryFixture(t, true)
	ctx := t.Context()
	thread, err := f.base.auth.client.Conversation.Query().Where(conversation.OrderIDEQ(id)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	support := supportStore(f.base)
	proof := conversations.SendInput{RequestKey: uuid.NewString(), Body: "Synthetic delivery proof boundary.", Purpose: "proof", Visibility: "public", Attachments: []string{uuid.NewString()}}
	if _, err = support.Send(ctx, f.base.buyer, thread.ID, false, proof); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer proof", err)
	}
	if _, err = support.Send(ctx, f.base.admin, thread.ID, true, proof); err == nil {
		t.Fatal("unclaimed proof")
	}
	deliveryChange(t, f, store, id, "claim", "")
	proof.Visibility = "internal"
	if _, err = support.Send(ctx, f.base.admin, thread.ID, true, proof); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("private proof", err)
	}
	proof.Visibility = "public"
	deliveryChange(t, f, store, id, "hold", "")
	if _, err = support.Send(ctx, f.base.admin, thread.ID, true, proof); !errors.Is(err, conversations.ErrConflict) {
		t.Fatal("held proof", err)
	}
	count, err := f.base.auth.client.ConversationMessage.Query().Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("rejected proof persisted", err)
	}
	deliveryChange(t, f, store, id, "resume", "")
	before, err := store.Delivery(ctx, f.base.admin, id, true)
	if err != nil {
		t.Fatal(err)
	}
	message, _ := shopDeliveryProof(t, f, id)
	retry := conversations.SendInput{RequestKey: message.RequestKey, Body: message.Body, Purpose: "proof", Visibility: "public", Attachments: message.Attachments}
	repeated, err := support.Send(ctx, f.base.admin, thread.ID, true, retry)
	if err != nil || repeated.ID != message.ID {
		t.Fatal("proof retry", err)
	}
	after, err := store.Delivery(ctx, f.base.admin, id, true)
	if err != nil || after.Version != before.Version || after.OrderVersion != before.OrderVersion || after.State != "processing" {
		t.Fatal("proof publication completed or submitted order", err)
	}
	// Age both factors, leaving the completed sign-in active to test step-up.
	if _, err = f.base.auth.client.AuthSession.UpdateOneID(f.base.admin.Session.ID).SetAuthenticatedAt(time.Unix(f.base.auth.clock.Load(), 0).Add(-time.Hour)).SetMfaVerifiedAt(time.Unix(f.base.auth.clock.Load(), 0).Add(-time.Hour)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = support.Send(ctx, f.base.admin, thread.ID, true, retry); err == nil {
		t.Fatal("stale factor proof retry")
	}
}

func TestShopDeliveryAssignmentAndPortalBoundaries(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	staff := func(email, role string) *identity.Principal {
		_, p := f.base.auth.staffLogin(t, email, role)
		_, _, p = f.base.auth.enroll(t, p)
		return p
	}
	other := staff("shop-staff@example.test", identity.RoleAdmin)
	owner := staff("shop-owner@example.test", identity.RoleOwner)
	booster := staff("shop-booster@example.test", identity.RoleBooster)
	f.base.auth.clock.Add(121)
	_, customerOwner := f.base.auth.login(t, owner.User.Email)
	if customerOwner.User.ID == owner.User.ID || customerOwner.User.MfaEnabled {
		t.Fatal("customer inherited staff identity or factor")
	}
	store, id := shopDeliveryForFixture(t, f, true)
	view := deliveryChange(t, f, store, id, "claim", "")
	change := shop.DeliveryChange{OrderVersion: view.OrderVersion, Version: view.Version, Note: "Explicit assignment boundary test."}
	for _, p := range []*identity.Principal{other, booster} {
		if _, err := store.RevealRecipient(ctx, p, id, true); !errors.Is(err, identity.ErrForbidden) {
			t.Fatal("unassigned recipient", err)
		}
		if _, err := store.ChangeDelivery(ctx, p, id, "hold", change); !errors.Is(err, identity.ErrForbidden) {
			t.Fatal("unassigned hold", err)
		}
		if _, err := store.ChangeDelivery(ctx, p, id, "take_over", change); !errors.Is(err, identity.ErrForbidden) {
			t.Fatal("nonowner takeover", err)
		}
	}
	if _, err := store.Delivery(ctx, booster, id, true); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("booster staff delivery read", err)
	}
	view, err := store.ChangeDelivery(ctx, owner, id, "take_over", change)
	if err != nil || view.AssignedID != owner.User.ID {
		t.Fatal("owner takeover", err)
	}
	if _, err = store.RevealRecipient(ctx, owner, id, true); err != nil {
		t.Fatal(err)
	}
	if out, e := store.RevealRecipient(ctx, f.base.admin, id, true); !errors.Is(e, identity.ErrForbidden) || out.Values != nil {
		t.Fatal("former assignee access", e)
	}
	// An independent customer account with the same email is never staff authority.
	if _, err = store.Delivery(ctx, customerOwner, id, true); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer portal became staff", err)
	}
}
