//go:build integration

package integration

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	work "github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
)

func TestBoosterDiscoveryPaginationAndLiteralSearch(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	detail := f.paid(t, "duo")
	v := f.book(t, f.handoff(t, f.assign(t, detail)))
	original, err := f.auth.client.Order.Get(ctx, v.OrderID)
	if err != nil {
		t.Fatal(err)
	}
	contract, err := f.auth.client.OrderContract.Get(ctx, original.CurrentContract)
	if err != nil {
		t.Fatal(err)
	}
	bookingRow, err := f.auth.client.Booking.Query().Where(booking.OrderIDEQ(v.OrderID)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	// Cloned immutable snapshots are isolated fixture history, not real checkout or capacity changes.
	for i := range 52 {
		id, cid := uuid.NewString(), uuid.NewString()
		_, err = f.auth.client.Order.Create().SetID(id).SetUserID(original.UserID).SetGameID(original.GameID).SetGameName("Literal %_ Game").SetSlug(original.Slug).SetService(original.Service).SetPackageKey(original.PackageKey).SetVariantKey(original.VariantKey).SetKind(original.Kind).SetRequestKey(uuid.NewString()).SetRequestHash(strings.Repeat("a", 64)).SetState(order.StateQueued).SetAnswers(original.Answers).SetSnapshot(original.Snapshot).SetEstimate(original.Estimate).SetTermsVersion(original.TermsVersion).SetCurrentContract(cid).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		_, err = f.auth.client.OrderContract.Create().SetID(cid).SetOrderID(id).SetActiveOrderID(id).SetUserID(original.UserID).SetGameID(original.GameID).SetPaymentState(ordercontract.PaymentStateSettled).SetData(contract.Data).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		_, err = f.auth.client.Fulfillment.Create().SetOrderID(id).SetAssignedID(f.booster.User.ID).SetMode(fulfillment.ModeTogether).SetCurrentNote("Synthetic assignment").SetAnswers(map[string]any{"player": "synthetic"}).SetUpdatedAt(time.Unix(f.auth.clock.Load(), 0)).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		start := bookingRow.StartsAt.Add(time.Duration(i+1) * 24 * time.Hour)
		_, err = f.auth.client.Booking.Create().SetOrderID(id).SetUserID(original.UserID).SetAssignedID(f.booster.User.ID).SetAvailabilityID(bookingRow.AvailabilityID).SetRequestKey(uuid.NewString()).SetRequestHash(strings.Repeat("b", 64)).SetStartsAt(start).SetEndsAt(start.Add(time.Hour)).SetTimezone("UTC").SetState(booking.StateConfirmed).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
	}
	first, err := f.work.ListFiltered(ctx, f.booster, "booster", work.ListFilters{Search: "%_", State: "queued"})
	if err != nil || len(first.Items) != 50 || first.Next == "" {
		t.Fatal("first page", len(first.Items), err)
	}
	second, err := f.work.ListFiltered(ctx, f.booster, "booster", work.ListFilters{Search: "%_", State: "queued", After: first.Next})
	if err != nil || len(second.Items) != 2 || second.Next != "" {
		t.Fatal("second page", len(second.Items), err)
	}
	seen := map[string]bool{}
	for _, item := range append(first.Items, second.Items...) {
		if seen[item.OrderID] || item.Game != "Literal %_ Game" || item.NextSession == nil {
			t.Fatal("duplicate, wildcard or missing next session", item.OrderID)
		}
		seen[item.OrderID] = true
	}
	agenda, err := f.work.Agenda(ctx, f.booster, "", "confirmed")
	if err != nil || len(agenda.Items) != 50 || agenda.Next == "" {
		t.Fatal("agenda first", len(agenda.Items), err)
	}
	tail, err := f.work.Agenda(ctx, f.booster, agenda.Next, "confirmed")
	if err != nil || len(tail.Items) != 3 || tail.Next != "" {
		t.Fatal("agenda tail", len(tail.Items), err)
	}
	seen = map[string]bool{}
	for _, item := range append(agenda.Items, tail.Items...) {
		if seen[item.ID] {
			t.Fatal("duplicate session")
		}
		seen[item.ID] = true
	}
}
