//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationread"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestAccountOverviewOwnedBoundedAndRevoked(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	empty, err := f.store.AccountOverview(ctx, f.other)
	if err != nil || len(empty.Attention)+len(empty.Active)+len(empty.Upcoming) != 0 {
		t.Fatal("new account overview", err)
	}
	detail := f.create(t, "custom")
	for i := range 8 {
		owner := f.buyer.User.ID
		public := 3
		if i == 6 {
			public = 0
		}
		if i == 7 {
			owner = f.other.User.ID
		}
		thread, createErr := f.auth.client.Conversation.Create().SetUserID(owner).SetKind(conversation.KindPresales).
			SetSubject("Private overview fixture").SetRequestKey(uuid.NewString()).SetRequestHash("synthetic").SetCreatedBy(owner).
			SetPublicSequence(public).SetSequence(99).Save(ctx)
		if createErr != nil {
			t.Fatal(createErr)
		}
		for sequence := 1; sequence <= public; sequence++ {
			if _, createErr = f.auth.client.ConversationMessage.Create().SetConversationID(thread.ID).SetSenderID(f.admin.User.ID).
				SetSenderRole("administrator").SetSenderLabel("PLAYORA support").SetVisibility(conversationmessage.VisibilityPublic).
				SetSequence(sequence).SetPublicSequence(sequence).SetBody("Synthetic overview reply").SetRequestKey(uuid.NewString()).SetRequestHash("synthetic-overview-message").Save(ctx); createErr != nil {
				t.Fatal(createErr)
			}
		}
		for _, audience := range []conversationread.Audience{conversationread.AudiencePublic, conversationread.AudienceStaff} {
			sequence := 2
			if audience == conversationread.AudienceStaff {
				sequence = 99
			}
			if _, createErr = f.auth.client.ConversationRead.Create().SetUserID(owner).SetConversationID(thread.ID).SetAudience(audience).SetSequence(sequence).Save(ctx); createErr != nil {
				t.Fatal(createErr)
			}
		}
	}
	for range 6 {
		d := f.create(t, "custom")
		if _, err = f.auth.client.Order.UpdateOneID(d.Order.ID).SetState(order.StateQuoted).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	now := time.Unix(f.auth.clock.Load(), 0)
	for i, state := range []booking.State{booking.StateConfirmed, booking.StateProposed, booking.StateCancelled, booking.StateConfirmed} {
		start := now.Add(time.Duration(i+1) * time.Hour)
		if i == 3 {
			start = now.Add(-2 * time.Hour)
		}
		if _, err = f.auth.client.Booking.Create().SetOrderID(detail.Order.ID).SetUserID(f.buyer.User.ID).SetAssignedID(f.admin.User.ID).
			SetAvailabilityID(uuid.NewString()).SetRequestKey(uuid.NewString()).SetRequestHash("synthetic-overview").
			SetStartsAt(start).SetEndsAt(start.Add(time.Hour)).SetTimezone("UTC").SetState(state).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	result, err := f.store.AccountOverview(ctx, f.buyer)
	if err != nil || len(result.Attention) != 5 || !result.MoreAttention || len(result.Active) != 1 || result.MoreActive || len(result.Upcoming) != 2 || result.Upcoming[0].State != "confirmed" || result.Upcoming[1].State != "proposed" {
		t.Fatal("bounded priority and future session summary", err)
	}
	if len(result.Messages) != 5 || !result.MoreMessages {
		t.Fatal("unread threads must be bounded")
	}
	for _, thread := range result.Messages {
		if thread.Unread != 1 {
			t.Fatal("staff sequence leaked into customer unread count")
		}
	}
	other, err := f.store.AccountOverview(ctx, f.other)
	if err != nil || len(other.Attention)+len(other.Active)+len(other.Upcoming) != 0 {
		t.Fatal("another customer saw private work", err)
	}
	if len(other.Messages) != 1 || other.MoreMessages {
		t.Fatal("conversation ownership scope")
	}
	if _, err = f.auth.client.ConversationRead.Update().Where(conversationread.UserIDEQ(f.buyer.User.ID), conversationread.AudienceEQ(conversationread.AudiencePublic)).SetSequence(3).Save(ctx); err != nil {
		t.Fatal(err)
	}
	// Completion removes active work without inventing a payable balance or wallet.
	if _, err = f.auth.client.Order.UpdateOneID(detail.Order.ID).SetState(order.StateCompleted).Save(ctx); err != nil {
		t.Fatal(err)
	}
	after, err := f.store.AccountOverview(ctx, f.buyer)
	if err != nil || len(after.Active) != 0 {
		t.Fatal("completed work stayed active", err)
	}
	if len(after.Messages) != 0 || after.MoreMessages {
		t.Fatal("read or staff-only updates remained unread")
	}
	var document, value any
	if err = json.Unmarshal(api.Contract, &document); err != nil {
		t.Fatal(err)
	}
	c := jsonschema.NewCompiler()
	if err = c.AddResource("contract.json", document); err != nil {
		t.Fatal(err)
	}
	schema, err := c.Compile("contract.json#/components/schemas/AccountOverview")
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(result)
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(raw, &value); err != nil {
		t.Fatal(err)
	}
	if err = schema.Validate(value); err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	f.store.Register(mux)
	response := httptest.NewRecorder()
	mux.ServeHTTP(response, httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/me/overview", nil))
	if response.Code != http.StatusUnauthorized {
		t.Fatal("anonymous overview authorization", response.Code)
	}
	if _, err = f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.AccountOverview(ctx, f.buyer); !errors.Is(err, identity.ErrForbidden) && !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("stale suspended principal retained access", err)
	}
}

func TestAccountOverviewProgressRequiresOwnedActiveSettledContract(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	paid := f.paid(t, "duo")
	assigned := f.assign(t, paid)
	_, err := f.auth.client.Fulfillment.Update().Where(fulfillment.OrderIDEQ(assigned.OrderID)).SetProgress(42).SetCurrentNote("Synthetic private note omitted from overview").Save(ctx)
	if err != nil {
		t.Fatal(err)
	}
	overview, err := f.store.AccountOverview(ctx, f.buyer)
	if err != nil || len(overview.Progress) != 1 || overview.Progress[0].OrderID != paid.Order.ID || overview.Progress[0].ReportedPercent != 42 {
		t.Fatal("owned reported progress missing", err)
	}
	encoded, err := json.Marshal(overview.Progress)
	if err != nil {
		t.Fatal(err)
	}
	var rows []map[string]any
	if err = json.Unmarshal(encoded, &rows); err != nil {
		t.Fatal(err)
	}
	if len(rows[0]) != 3 {
		t.Fatal("progress projection must exclude notes, staff, player and credential data")
	}
	other, err := f.store.AccountOverview(ctx, f.other)
	if err != nil || len(other.Progress) != 0 {
		t.Fatal("foreign progress disclosed", err)
	}
	if _, err = f.auth.client.OrderContract.UpdateOneID(paid.Contract.ID).SetPaymentState(ordercontract.PaymentStateUnissued).Save(ctx); err != nil {
		t.Fatal(err)
	}
	unpaid, err := f.store.AccountOverview(ctx, f.buyer)
	if err != nil || len(unpaid.Progress) != 0 {
		t.Fatal("unverified contract appeared as active progress", err)
	}
	if _, err = f.auth.client.OrderContract.UpdateOneID(paid.Contract.ID).SetPaymentState(ordercontract.PaymentStateSettled).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.client.Order.UpdateOneID(paid.Order.ID).SetState(order.StateCompleted).Save(ctx); err != nil {
		t.Fatal(err)
	}
	completed, err := f.store.AccountOverview(ctx, f.buyer)
	if err != nil || len(completed.Progress) != 0 {
		t.Fatal("completed work remains in activity", err)
	}
}
