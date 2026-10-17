//go:build integration

package integration

import (
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationread"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestUnreadExcludesOwnMessagesWithoutAcknowledgingIncoming(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := supportStore(f)
	detail := f.create(t, "custom")
	thread, err := store.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "order", OrderID: detail.Order.ID, Subject: "Unread synthetic conversation"})
	if err != nil {
		t.Fatal(err)
	}
	send := func(p *identity.Principal, admin bool, visibility string) {
		t.Helper()
		if _, e := store.Send(ctx, p, thread.ID, admin, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Synthetic audience message", Visibility: visibility}); e != nil {
			t.Fatal(e)
		}
	}
	check := func(want, first int) {
		t.Helper()
		view, e := store.Get(ctx, f.buyer, thread.ID, false)
		if e != nil || view.Unread != want || view.FirstUnreadSequence != first {
			t.Fatalf("customer unread: count=%d first=%d want=%d/%d error=%v", view.Unread, view.FirstUnreadSequence, want, first, e)
		}
		inbox, e := store.List(ctx, f.buyer, false, conversations.ListFilters{Unread: "true"})
		if e != nil || (len(inbox.Conversations) > 0) != (want > 0) {
			t.Fatal("unread filter disagrees", e)
		}
		overview, e := f.store.AccountOverview(ctx, f.buyer)
		if e != nil || (len(overview.Messages) > 0) != (want > 0) {
			t.Fatal("overview unread disagrees", e)
		}
		if want > 0 && overview.Messages[0].Unread != want {
			t.Fatal("overview count includes outgoing messages")
		}
		orders, e := f.store.List(ctx, f.buyer, false, "", "", detail.Order.ID)
		if e != nil || len(orders.Orders) != 1 || orders.Orders[0].Unread == nil || *orders.Orders[0].Unread != (want > 0) {
			t.Fatal("order unread disagrees", e)
		}
	}
	send(f.buyer, false, "public") // public 1: own outgoing only.
	check(0, 0)
	send(f.admin, true, "internal") // Must not change customer count/cursor.
	check(0, 0)
	send(f.admin, true, "public") // public 2: first incoming.
	send(f.buyer, false, "public")
	send(f.admin, true, "public") // public 4: second incoming.
	send(f.buyer, false, "public")
	check(2, 2)
	staff, err := store.Get(ctx, f.admin, thread.ID, true)
	if err != nil || staff.Unread != 3 || staff.FirstUnreadSequence != 1 {
		t.Fatal("staff own replies/notes counted unread", err)
	}
	if n, e := f.auth.client.ConversationRead.Query().Where(conversationread.ConversationIDEQ(thread.ID)).Count(ctx); e != nil || n != 0 {
		t.Fatal("sending silently advanced a read marker", e)
	}
	if err = store.Read(ctx, f.buyer, thread.ID, false, 2); err != nil {
		t.Fatal(err)
	}
	check(1, 4)
	send(f.buyer, false, "public") // Must not acknowledge the still unseen public 4.
	check(1, 4)
	if err = store.Read(ctx, f.buyer, thread.ID, false, 6); err != nil {
		t.Fatal(err)
	}
	check(0, 0)
}

func TestCoordinationUnreadAndBoosterMessageFormLabels(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	store := chatForms(t, f.orderFixture)
	work := f.assign(t, f.paid(t, "solo"))
	thread, err := store.OpenCoordination(ctx, f.admin, work.OrderID, work.Version)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.client.User.UpdateOneID(f.booster.User.ID).SetStaffAlias("").Save(ctx); err != nil {
		t.Fatal(err)
	}
	message, err := store.Send(ctx, f.booster, thread.ID, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Synthetic assigned booster reply", Visibility: "public"})
	if err != nil || message.SenderLabel != "Assigned booster" || message.SenderID != "" {
		t.Fatal("incorrect private-safe booster label", err)
	}
	view, err := store.Get(ctx, f.booster, thread.ID, false)
	if err != nil || view.Unread != 0 || view.FirstUnreadSequence != 0 {
		t.Fatal("booster outgoing counted unread", err)
	}
	list, err := f.store.List(ctx, f.buyer, false, "", "", work.OrderID)
	if err != nil || len(list.Orders) != 1 || list.Orders[0].Unread == nil || !*list.Orders[0].Unread {
		t.Fatal("coordination incoming missing from customer order badge", err)
	}
	in := chatRequest(f.orderFixture)
	in.Recipient = "booster"
	form, err := store.CreateForm(ctx, f.admin, thread.ID, in)
	if err != nil {
		t.Fatal(err)
	}
	_, err = store.ReplyForm(ctx, f.booster, thread.ID, form.ID, conversations.FormReply{RequestKey: uuid.NewString(), Version: form.Version, Answers: map[string]string{"region": "Synthetic region", "access": "Synthetic protected answer"}})
	if err != nil {
		t.Fatal(err)
	}
	history, err := store.Messages(ctx, f.buyer, thread.ID, false, 0)
	if err != nil || len(history.Messages) != 3 || history.Messages[2].SenderLabel != "Assigned booster" || history.Messages[2].SenderID != "" {
		t.Fatal("form reply changed booster label or privacy", err)
	}
	view, err = store.Get(ctx, f.booster, thread.ID, false)
	if err != nil || view.Unread != 1 || view.FirstUnreadSequence != 2 {
		t.Fatal("own form response acknowledged incoming request", err)
	}
	if _, err = f.auth.client.User.UpdateOneID(f.booster.User.ID).SetStaffAlias("Rank specialist").Save(ctx); err != nil {
		t.Fatal(err)
	}
	message, err = store.Send(ctx, f.booster, thread.ID, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Synthetic aliased reply", Visibility: "public"})
	if err != nil || message.SenderLabel != "Rank specialist" {
		t.Fatal("explicit alias not preserved", err)
	}
}
