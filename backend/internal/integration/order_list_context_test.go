//go:build integration

package integration

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationread"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
)

func TestOrderListAcceptedPriceAndPrivateUnread(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	pack := f.create(t, "package")
	custom := f.create(t, "custom")
	thread, err := f.auth.client.Conversation.Create().SetUserID(f.buyer.User.ID).SetOrderID(pack.Order.ID).
		SetKind(conversation.KindOrder).SetSubject("Private customer conversation").SetCreatedBy(f.buyer.User.ID).
		SetRequestKey(uuid.NewString()).SetRequestHash("synthetic-list-context").SetSequence(7).SetPublicSequence(0).Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	list := func() orders.Listing {
		result, readErr := f.store.List(ctx, f.buyer, false, "", "", "")
		if readErr != nil {
			t.Fatal(readErr)
		}
		return result
	}
	check := func(want bool) {
		result := list()
		if len(result.Orders) != 2 {
			t.Fatal("incorrect owned order count")
		}
		for _, row := range result.Orders {
			if row.Unread == nil {
				t.Fatal("unread availability missing")
			}
			if row.ID == pack.Order.ID {
				if *row.Unread != want || row.AcceptedPrice == nil || row.AcceptedPrice.AmountMinor != "1234" || row.AcceptedPrice.Currency != "USD" {
					t.Fatal("accepted amount or audience-specific unread mismatch")
				}
			} else if row.ID != custom.Order.ID || row.AcceptedPrice != nil || *row.Unread {
				t.Fatal("an unaccepted request cannot acquire a payable total")
			}
		}
		raw, marshalErr := json.Marshal(result)
		if marshalErr != nil {
			t.Fatal(marshalErr)
		}
		for _, forbidden := range []string{"ordinary customer note", "Private customer conversation", "sender", "payment_state", "request_hash"} {
			if strings.Contains(string(raw), forbidden) {
				t.Fatal("private detail leaked into list")
			}
		}
	}
	check(false)
	chat := supportStore(f)
	for _, principal := range []*identity.Principal{f.buyer, f.admin} {
		if _, err = chat.Send(ctx, principal, thread.ID, principal == f.admin, conversations.SendInput{RequestKey: uuid.NewString(), Body: "ordinary customer note", Visibility: "public"}); err != nil {
			t.Fatal(err)
		}
	}
	check(true)
	if _, err = f.auth.client.ConversationRead.Create().SetConversationID(thread.ID).SetUserID(f.buyer.User.ID).SetAudience(conversationread.AudiencePublic).SetSequence(2).Save(ctx); err != nil {
		t.Fatal(err)
	}
	check(false)
	staff, err := f.store.List(ctx, f.admin, true, "", "", pack.Order.ID)
	if err != nil || len(staff.Orders) != 1 || staff.Orders[0].Unread == nil || !*staff.Orders[0].Unread {
		t.Fatal("staff must use its own reader and sequence")
	}
	linked, err := f.auth.client.Conversation.Create().SetUserID(f.buyer.User.ID).SetLinkedOrderID(custom.Order.ID).
		SetKind(conversation.KindPresales).SetSubject("Private linked support").SetCreatedBy(f.buyer.User.ID).
		SetRequestKey(uuid.NewString()).SetRequestHash("synthetic-linked-list-context").Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = chat.Send(ctx, f.admin, linked.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Synthetic incoming linked reply", Visibility: "public"}); err != nil {
		t.Fatal(err)
	}
	for _, row := range list().Orders {
		if row.ID == custom.Order.ID && (row.Unread == nil || !*row.Unread || row.AcceptedPrice != nil) {
			t.Fatal("linked pre-sales unread must not invent an accepted price")
		}
	}
	other, err := f.store.List(ctx, f.other, false, "", "", pack.Order.ID)
	if err != nil || len(other.Orders) != 0 {
		t.Fatal("another customer must not see accepted prices or unread state")
	}
	if _, err = f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.List(ctx, f.buyer, false, "", "", ""); err == nil {
		t.Fatal("stale suspended principal retained list access")
	}
}
