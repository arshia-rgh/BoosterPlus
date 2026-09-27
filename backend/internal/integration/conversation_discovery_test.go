//go:build integration

package integration

import (
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestConversationDiscoveryFiltersBeforePaginationAndPrivateAudiences(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := supportStore(f)
	ids := map[string]bool{}
	for n := range 53 {
		value, err := store.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: fmt.Sprintf("Discovery record %d", n)})
		if err != nil {
			t.Fatal(err)
		}
		ids[value.ID] = true
	}
	first, err := store.List(ctx, f.buyer, false, conversations.ListFilters{})
	if err != nil || len(first.Conversations) != 50 || first.Next == "" {
		t.Fatal("bounded first page", err)
	}
	for _, row := range first.Conversations {
		delete(ids, row.ID)
	}
	for id := range ids {
		found, e := store.List(ctx, f.buyer, false, conversations.ListFilters{Search: id})
		if e != nil || len(found.Conversations) != 1 || found.Conversations[0].ID != id {
			t.Fatal("search applied only after page limit", e)
		}
	}
	second, err := store.List(ctx, f.buyer, false, conversations.ListFilters{After: first.Next})
	if err != nil || len(second.Conversations) != 3 || second.Next != "" {
		t.Fatal("stable remaining page", err)
	}
	for _, row := range second.Conversations {
		if !ids[row.ID] {
			t.Fatal("pagination duplicated or omitted result")
		}
	}
	legacy, err := store.List(ctx, f.buyer, false, conversations.ListFilters{After: first.Conversations[49].ID})
	if err != nil || len(legacy.Conversations) != 3 {
		t.Fatal("legacy owned cursor stopped working", err)
	}
	thread, err := store.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Literal 100%_Rank question"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Literal 100XXrank question"}); err != nil {
		t.Fatal(err)
	}
	found, err := store.List(ctx, f.buyer, false, conversations.ListFilters{Search: "100%_rank", Kind: "presales"})
	if err != nil || len(found.Conversations) != 1 || found.Conversations[0].ID != thread.ID {
		t.Fatal("literal case-folded search", err)
	}
	hidden, err := store.List(ctx, f.other, false, conversations.ListFilters{Search: thread.ID})
	if err != nil || len(hidden.Conversations) != 0 {
		t.Fatal("foreign conversation discovery", err)
	}
	f.auth.clock.Add(1)
	message, err := store.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Public ordinary reply", Visibility: "public"})
	if err != nil {
		t.Fatal(err)
	}
	unread, err := store.List(ctx, f.buyer, false, conversations.ListFilters{Unread: "true"})
	if err != nil || len(unread.Conversations) != 1 || unread.Conversations[0].Unread != 1 {
		t.Fatal("owned unread discovery", err)
	}
	if err = store.Read(ctx, f.buyer, thread.ID, false, message.Sequence); err != nil {
		t.Fatal(err)
	}
	f.auth.clock.Add(1)
	newer, err := store.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Newest public conversation"})
	if err != nil {
		t.Fatal(err)
	}
	f.auth.clock.Add(1)
	if _, err = store.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Private internal marker", Visibility: "internal"}); err != nil {
		t.Fatal(err)
	}
	publicOrder, err := store.List(ctx, f.buyer, false, conversations.ListFilters{})
	if err != nil || publicOrder.Conversations[0].ID != newer.ID {
		t.Fatal("private note changed customer activity ordering", err)
	}
	staffOrder, err := store.List(ctx, f.admin, true, conversations.ListFilters{})
	if err != nil || staffOrder.Conversations[0].ID != thread.ID {
		t.Fatal("staff latest activity not first", err)
	}
	unread, err = store.List(ctx, f.buyer, false, conversations.ListFilters{Unread: "true"})
	if err != nil || len(unread.Conversations) != 0 {
		t.Fatal("internal note affected customer unread", err)
	}
	staff, err := store.List(ctx, f.admin, true, conversations.ListFilters{Customer: f.buyer.User.ID, Unread: "true"})
	if err != nil || len(staff.Conversations) != 1 || staff.Conversations[0].Unread != 2 {
		t.Fatal("staff audience unread", err)
	}
	for _, term := range []string{"Public ordinary reply", "Private internal marker"} {
		found, err = store.List(ctx, f.buyer, false, conversations.ListFilters{Search: term})
		if err != nil || len(found.Conversations) != 0 {
			t.Fatal("message content searched as metadata", err)
		}
	}
	for _, bad := range []conversations.ListFilters{{After: "bad"}, {OrderID: "bad"}, {Kind: "internal"}, {Unread: "perhaps"}, {State: "anything"}, {Search: strings.Repeat("x", 161)}} {
		if _, e := store.List(ctx, f.buyer, false, bad); e == nil {
			t.Fatal("invalid discovery filter accepted")
		}
	}
	if _, e := store.List(ctx, f.buyer, false, conversations.ListFilters{Search: strings.Repeat("界", 160)}); e != nil {
		t.Fatal("valid multibyte search rejected", e)
	}
	for _, staffOnly := range []conversations.ListFilters{{Customer: f.other.User.ID}, {Assigned: "me"}} {
		if _, e := store.List(ctx, f.buyer, false, staffOnly); !errors.Is(e, identity.ErrForbidden) {
			t.Fatal("customer staff-only filter accepted", e)
		}
	}
}
