//go:build integration

package integration

import (
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/notification"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/scheduling"
)

func localInstant(at time.Time) scheduling.LocalTime {
	return scheduling.LocalTime{Local: at.UTC().Format("2006-01-02T15:04"), Zone: "UTC"}
}
func (f *fulfillmentFixture) availability(t *testing.T) (fulfillment.WindowView, time.Time) {
	t.Helper()
	ctx := t.Context()
	if _, err := f.work.SaveCalendarProfile(ctx, f.booster, f.booster.User.ID, false, fulfillment.StaffCalendarProfile{Timezone: "UTC", Enabled: true, GameTags: []string{"orders-game"}, RegionTags: []string{}}); err != nil {
		t.Fatal(err)
	}
	start := time.Unix(f.auth.clock.Load(), 0).Truncate(time.Minute).Add(30 * time.Minute)
	row, err := f.work.AddAvailability(ctx, f.booster, f.booster.User.ID, false, fulfillment.WindowInput{RequestKey: uuid.NewString(), Start: localInstant(start), End: localInstant(start.Add(4 * time.Hour))})
	if err != nil {
		t.Fatal(err)
	}
	return row, start
}
func (f *fulfillmentFixture) propose(t *testing.T, v fulfillment.View, window fulfillment.WindowView, start time.Time) fulfillment.BookingView {
	t.Helper()
	b, err := f.work.ProposeBooking(t.Context(), f.buyer, v.OrderID, fulfillment.BookingInput{WorkVersion: v.Version, RequestKey: uuid.NewString(), AvailabilityID: window.ID, Start: localInstant(start), End: localInstant(start.Add(time.Hour)), Note: "Customer proposed a synthetic session"})
	if err != nil {
		t.Fatal(err)
	}
	return b
}
func (f *fulfillmentFixture) book(t *testing.T, v fulfillment.View) fulfillment.View {
	t.Helper()
	window, start := f.availability(t)
	proposal := f.propose(t, v, window, start)
	if _, err := f.work.ChangeBooking(t.Context(), f.booster, v.OrderID, proposal.ID, "booster", "confirm", fulfillment.BookingAction{Version: proposal.Version, Note: "Confirmed available session"}); err != nil {
		t.Fatal(err)
	}
	result, err := f.work.Get(t.Context(), f.booster, v.OrderID, "booster")
	if err != nil {
		t.Fatal(err)
	}
	return result
}
func TestSchedulingConflictPrivacyAndReminders(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	first := f.handoff(t, f.assign(t, f.paid(t, "duo")))
	second := f.handoff(t, f.assign(t, f.paid(t, "duo")))
	window, start := f.availability(t)
	if _, err := f.work.Calendar(ctx, f.buyer, f.booster.User.ID, false, ""); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer read staff calendar", err)
	}
	if _, err := f.work.Calendar(ctx, f.second, f.booster.User.ID, false, ""); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("other staff calendar", err)
	}
	a, b := f.propose(t, first, window, start), f.propose(t, second, window, start)
	var wins atomic.Int64
	var confirmed fulfillment.BookingView
	var lock sync.Mutex
	var wg sync.WaitGroup
	for _, v := range []fulfillment.BookingView{a, b} {
		wg.Go(func() {
			result, err := f.work.ChangeBooking(ctx, f.booster, v.OrderID, v.ID, "booster", "confirm", fulfillment.BookingAction{Version: v.Version, Note: "Confirm available slot"})
			if err == nil {
				wins.Add(1)
				lock.Lock()
				confirmed = result
				lock.Unlock()
			} else if !errors.Is(err, fulfillment.ErrConflict) {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("overlapping confirmations", wins.Load())
	}
	if err := f.work.RemoveAvailability(ctx, f.booster, f.booster.User.ID, window.ID, false, window.Version); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("removed booked availability", err)
	}
	if _, err := f.work.ChangeBooking(ctx, f.buyer, confirmed.OrderID, confirmed.ID, "account", "confirm", fulfillment.BookingAction{Version: confirmed.Version, Note: "Customer cannot confirm staff capacity"}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer confirmed", err)
	}
	slots, err := f.work.Slots(ctx, f.buyer, confirmed.OrderID, "account", "", 0)
	if err != nil {
		t.Fatal(err)
	}
	for _, slot := range slots.Items {
		if slot.StartsAt.Before(confirmed.EndsAt) && slot.EndsAt.After(confirmed.StartsAt) {
			t.Fatal("occupied slot offered")
		}
	}
	for range 3 {
		if err = f.work.Reminders(ctx); err != nil {
			t.Fatal(err)
		}
	}
	notices, err := f.auth.client.Notification.Query().Where(notification.MessageIDEQ(confirmed.ID)).All(ctx)
	if err != nil || len(notices) != 2 {
		t.Fatal("duplicate/missing reminders", len(notices), err)
	}
	if _, err = f.work.ChangeBooking(ctx, f.buyer, confirmed.OrderID, confirmed.ID, "account", "cancel", fulfillment.BookingAction{Version: confirmed.Version, Note: "Customer changed availability"}); err != nil {
		t.Fatal(err)
	}
	sender := &recordingSender{}
	delivery, err := notifications.New(f.auth.client, f.auth.service, f.auth.cfg.PublicOrigin)
	if err != nil {
		t.Fatal(err)
	}
	for _, notice := range notices {
		if err = delivery.EmailHandler(sender)(ctx, jobs.Job{Payload: []byte(`{"notification_id":"` + notice.ID + `"}`)}); err != nil {
			t.Fatal(err)
		}
	}
	if len(sender.messages) != 0 {
		t.Fatal("cancelled reminder delivered")
	}
}
func TestSchedulingRescheduleAndAtomicAssignmentCancellation(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	v := f.handoff(t, f.assign(t, f.paid(t, "duo")))
	window, start := f.availability(t)
	input := fulfillment.BookingInput{WorkVersion: v.Version, RequestKey: uuid.NewString(), AvailabilityID: window.ID, Start: localInstant(start), End: localInstant(start.Add(time.Hour)), Note: "Initial proposal"}
	proposal, err := f.work.ProposeBooking(ctx, f.buyer, v.OrderID, input)
	if err != nil {
		t.Fatal(err)
	}
	retry, err := f.work.ProposeBooking(ctx, f.buyer, v.OrderID, input)
	if err != nil || retry.ID != proposal.ID {
		t.Fatal("proposal retry", err)
	}
	input.Note = "Changed payload"
	if _, err = f.work.ProposeBooking(ctx, f.buyer, v.OrderID, input); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("idempotency misuse", err)
	}
	confirmed, err := f.work.ChangeBooking(ctx, f.booster, v.OrderID, proposal.ID, "booster", "confirm", fulfillment.BookingAction{Version: proposal.Version, Note: "Confirmed"})
	if err != nil {
		t.Fatal(err)
	}
	v, err = f.work.Get(ctx, f.buyer, v.OrderID, "account")
	if err != nil {
		t.Fatal(err)
	}
	input.WorkVersion = v.Version
	input.RequestKey = uuid.NewString()
	input.PreviousID = confirmed.ID
	input.PreviousVersion = confirmed.Version
	input.Start = localInstant(start.Add(time.Hour))
	input.End = localInstant(start.Add(2 * time.Hour))
	input.Note = "Move to the next hour"
	replacement, err := f.work.ProposeBooking(ctx, f.buyer, v.OrderID, input)
	if err != nil {
		t.Fatal(err)
	}
	old, err := f.auth.client.Booking.Get(ctx, confirmed.ID)
	if err != nil || old.State != "cancelled" || replacement.PreviousID != old.ID {
		t.Fatal("reschedule lost history", err)
	}
	if _, err = f.work.ChangeBooking(ctx, f.booster, v.OrderID, replacement.ID, "booster", "confirm", fulfillment.BookingAction{Version: replacement.Version, Note: "Confirmed replacement"}); err != nil {
		t.Fatal(err)
	}
	v, err = f.work.Get(ctx, f.admin, v.OrderID, "admin")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.work.Assign(ctx, f.admin, v.OrderID, fulfillment.Assignment{Version: v.Version, OrderVersion: v.OrderVersion, AssignedID: f.second.User.ID, Reason: "Assignment changed"}); err != nil {
		t.Fatal(err)
	}
	row, err := f.auth.client.Booking.Get(ctx, replacement.ID)
	if err != nil || row.State != "cancelled" {
		t.Fatal("old staff retained booking", err)
	}
	if _, err = f.work.Bookings(ctx, f.booster, v.OrderID, "booster", ""); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("old staff kept history access", err)
	}
	if _, err = f.work.ProposeBooking(ctx, f.other, v.OrderID, input); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("foreign customer proposed", err)
	}
}

func TestSchedulingCustomerCapacityAdjacencyAndAttendance(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	first := f.handoff(t, f.assign(t, f.paid(t, "duo")))
	second := f.handoff(t, f.assign(t, f.paid(t, "duo")))
	window, start := f.availability(t)
	a := f.propose(t, first, window, start)
	confirmed, err := f.work.ChangeBooking(ctx, f.booster, first.OrderID, a.ID, "booster", "confirm", fulfillment.BookingAction{Version: a.Version, Note: "Confirmed"})
	if err != nil {
		t.Fatal(err)
	}
	second, err = f.work.Assign(ctx, f.admin, second.OrderID, fulfillment.Assignment{Version: second.Version, OrderVersion: second.OrderVersion, AssignedID: f.second.User.ID, Reason: "Independent second staff"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.work.SaveCalendarProfile(ctx, f.second, f.second.User.ID, false, fulfillment.StaffCalendarProfile{Timezone: "UTC", Enabled: true}); err != nil {
		t.Fatal(err)
	}
	otherWindow, err := f.work.AddAvailability(ctx, f.second, f.second.User.ID, false, fulfillment.WindowInput{RequestKey: uuid.NewString(), Start: localInstant(start), End: localInstant(start.Add(4 * time.Hour))})
	if err != nil {
		t.Fatal(err)
	}
	input := fulfillment.BookingInput{WorkVersion: second.Version, RequestKey: uuid.NewString(), AvailabilityID: otherWindow.ID, Start: localInstant(start), End: localInstant(start.Add(time.Hour)), Note: "Same customer different staff"}
	if _, err = f.work.ProposeBooking(ctx, f.buyer, second.OrderID, input); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("customer double booking accepted", err)
	}
	input.Start, input.End = localInstant(start.Add(time.Hour)), localInstant(start.Add(2*time.Hour))
	adjacent, err := f.work.ProposeBooking(ctx, f.buyer, second.OrderID, input)
	if err != nil {
		t.Fatal("adjacent proposal", err)
	}
	if _, err = f.work.ChangeBooking(ctx, f.second, second.OrderID, adjacent.ID, "booster", "confirm", fulfillment.BookingAction{Version: adjacent.Version, Note: "Adjacent confirmed"}); err != nil {
		t.Fatal(err)
	}
	profile, err := f.work.Calendar(ctx, f.booster, f.booster.User.ID, false, "")
	if err != nil {
		t.Fatal(err)
	}
	profile.Profile.Enabled = false
	if _, err = f.work.SaveCalendarProfile(ctx, f.booster, f.booster.User.ID, false, profile.Profile); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("paused booked calendar", err)
	}
	action := fulfillment.BookingAction{Version: confirmed.Version, Note: "Session attendance recorded"}
	if _, err = f.work.ChangeBooking(ctx, f.booster, first.OrderID, confirmed.ID, "booster", "no_show", action); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("early no-show", err)
	}
	// Model active browser sessions while advancing the fixture clock to attendance time.
	for _, actor := range []*identity.Principal{f.buyer, f.booster} {
		if _, err = f.auth.client.AuthSession.UpdateOneID(actor.Session.ID).SetLastSeenAt(start).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	f.auth.clock.Store(start.Add(time.Minute).Unix())
	if _, err = f.work.ChangeBooking(ctx, f.buyer, first.OrderID, confirmed.ID, "account", "attended", action); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer recorded attendance", err)
	}
	if _, err = f.work.ChangeBooking(ctx, f.booster, first.OrderID, confirmed.ID, "booster", "no_show", action); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("no-show before session ended", err)
	}
	// Model continued activity while the session runs; keep the absolute sign-in expiry intact.
	for _, actor := range []*identity.Principal{f.buyer, f.booster} {
		if _, err = f.auth.client.AuthSession.UpdateOneID(actor.Session.ID).SetLastSeenAt(confirmed.EndsAt).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}
	f.auth.clock.Store(confirmed.EndsAt.Add(time.Minute).Unix())
	recorded, err := f.work.ChangeBooking(ctx, f.booster, first.OrderID, confirmed.ID, "booster", "no_show", action)
	if err != nil || recorded.State != "no_show" {
		t.Fatal("attendance", err)
	}
	if _, err = f.work.ChangeBooking(ctx, f.booster, first.OrderID, confirmed.ID, "booster", "attended", action); !errors.Is(err, fulfillment.ErrConflict) {
		t.Fatal("stale attendance", err)
	}
}

func TestSchedulingAuditFailureRollsBackConfirmationAndAvailability(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	v := f.handoff(t, f.assign(t, f.paid(t, "duo")))
	window, start := f.availability(t)
	proposal := f.propose(t, v, window, start)
	if _, err := f.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if _, err := f.work.ChangeBooking(ctx, f.booster, v.OrderID, proposal.ID, "booster", "confirm", fulfillment.BookingAction{Version: proposal.Version, Note: "Audit must commit"}); err == nil {
		t.Fatal("unaudited confirmation")
	}
	row, err := f.auth.client.Booking.Get(ctx, proposal.ID)
	if err != nil || row.State != "proposed" || row.Version != proposal.Version {
		t.Fatal("confirmation not rolled back", err)
	}
	if err = f.work.RemoveAvailability(ctx, f.booster, f.booster.User.ID, window.ID, false, window.Version); err == nil {
		t.Fatal("unaudited removal")
	}
	availability, err := f.auth.client.AvailabilityWindow.Get(ctx, window.ID)
	if err != nil || !availability.Active || availability.Version != window.Version {
		t.Fatal("removal not rolled back", err)
	}
}
