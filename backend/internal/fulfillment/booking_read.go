package fulfillment

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitywindow"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Bookings returns private session history after checking the current resource audience.
func (s *Store) Bookings(ctx context.Context, p *identity.Principal, id, audience, cursor string) (BookingListing, error) {
	result := BookingListing{Items: []BookingView{}}
	err := s.auth.AuthorizedTransaction(ctx, p, audience, false, func(tx *ent.Tx, current *identity.Principal) error {
		if _, _, e := s.bookingResource(ctx, tx, current, id, audience); e != nil {
			return e
		}
		result = BookingListing{Items: []BookingView{}}
		q := tx.Booking.Query().Where(booking.OrderIDEQ(id)).Order(ent.Desc(booking.FieldCreatedAt), ent.Desc(booking.FieldID)).Limit(51)
		if cursor != "" {
			at, key, e := cursorPair(cursor)
			if e != nil {
				return e
			}
			q.Where(booking.Or(booking.CreatedAtLT(at), booking.And(booking.CreatedAtEQ(at), booking.IDLT(key))))
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			last := rows[49]
			result.Next = nextCursor(last.CreatedAt, last.ID)
			rows = rows[:50]
		}
		for _, row := range rows {
			item, viewErr := bookingView(ctx, tx.Client(), row)
			if viewErr != nil {
				return viewErr
			}
			result.Items = append(result.Items, item)
		}
		return nil
	})
	return result, err
}

// SlotListing pages declared windows and removes occupied periods without identities.
type SlotListing struct {
	Items []SlotView `json:"items"`
	Next  string     `json:"next"`
}

// Slots returns up to ten windows' bookable gaps in the selected week within the 90-day horizon.
func (s *Store) Slots(ctx context.Context, p *identity.Principal, id, audience, cursor string, week int) (SlotListing, error) {
	result := SlotListing{Items: []SlotView{}}
	if week < 0 || week > 12 {
		return result, ErrInvalid
	}
	err := s.auth.AuthorizedTransaction(ctx, p, audience, false, func(tx *ent.Tx, current *identity.Principal) error {
		result = SlotListing{Items: []SlotView{}}
		row, work, e := s.bookingResource(ctx, tx, current, id, audience)
		if e != nil {
			return e
		}
		if !active(row) {
			return ErrConflict
		}
		if e = activeStaff(ctx, tx.Client(), work.AssignedID); e != nil {
			return e
		}
		profile, e := tx.StaffProfile.Get(ctx, work.AssignedID)
		if ent.IsNotFound(e) {
			return nil
		}
		if e != nil {
			return e
		}
		if !profile.Enabled {
			return nil
		}
		now := s.now().Truncate(time.Minute).Add(time.Minute).Add(time.Duration(week) * 7 * 24 * time.Hour)
		end := now.Add(7 * 24 * time.Hour)
		horizon := s.now().Add(90 * 24 * time.Hour)
		if end.After(horizon) {
			end = horizon
		}
		q := tx.AvailabilityWindow.Query().Where(availabilitywindow.UserIDEQ(work.AssignedID), availabilitywindow.ActiveEQ(true), availabilitywindow.StartsAtLT(end), availabilitywindow.EndsAtGT(now)).Order(ent.Asc(availabilitywindow.FieldStartsAt), ent.Asc(availabilitywindow.FieldID)).Limit(11)
		if cursor != "" {
			at, key, parseErr := cursorPair(cursor)
			if parseErr != nil {
				return parseErr
			}
			q.Where(availabilitywindow.Or(availabilitywindow.StartsAtGT(at), availabilitywindow.And(availabilitywindow.StartsAtEQ(at), availabilitywindow.IDGT(key))))
		}
		windows, e := q.All(ctx)
		if e != nil {
			return e
		}
		result = SlotListing{Items: []SlotView{}}
		if len(windows) > 10 {
			last := windows[9]
			result.Next = nextCursor(last.StartsAt, last.ID)
			windows = windows[:10]
		}
		occupied, e := tx.Booking.Query().Where(booking.StateEQ(booking.StateConfirmed), booking.Or(booking.AssignedIDEQ(work.AssignedID), booking.UserIDEQ(row.UserID)), booking.StartsAtLT(end), booking.EndsAtGT(now)).Order(ent.Asc(booking.FieldStartsAt)).Limit(2001).All(ctx)
		if e != nil {
			return e
		}
		if len(occupied) > 2000 {
			return ErrConflict
		}
		for _, window := range windows {
			start, finish := window.StartsAt, window.EndsAt
			if start.Before(now) {
				start = now
			}
			if finish.After(end) {
				finish = end
			}
			for _, busy := range occupied {
				if !busy.StartsAt.Before(finish) || !busy.EndsAt.After(start) {
					continue
				}
				gapEnd := busy.StartsAt
				if gapEnd.After(finish) {
					gapEnd = finish
				}
				if gapEnd.Sub(start) >= 15*time.Minute {
					result.Items = append(result.Items, SlotView{window.ID, start, gapEnd, window.Timezone})
				}
				if busy.EndsAt.After(start) {
					start = busy.EndsAt
				}
				if !start.Before(finish) {
					break
				}
			}
			if finish.Sub(start) >= 15*time.Minute {
				result.Items = append(result.Items, SlotView{window.ID, start, finish, window.Timezone})
			}
		}
		return nil
	})
	return result, err
}

// cancelBookingsInTx invalidates future sessions during reassignment or completion.
func (s *Store) cancelBookingsInTx(ctx context.Context, tx *ent.Tx, p *identity.Principal, id, reason string) error {
	rows, err := tx.Booking.Query().Where(booking.OrderIDEQ(id), booking.Or(booking.StateEQ(booking.StateProposed), booking.And(booking.StateEQ(booking.StateConfirmed), booking.EndsAtGT(s.now())))).Limit(101).All(ctx)
	if err != nil {
		return err
	}
	if len(rows) > 100 {
		return ErrConflict
	}
	for _, row := range rows {
		if row.Version >= 2147483646 {
			return ErrConflict
		}
		row, err = tx.Booking.UpdateOneID(row.ID).AddVersion(1).SetState(booking.StateCancelled).SetUpdatedAt(s.now()).Save(ctx)
		if err != nil {
			return err
		}
		if err = bookingEvent(ctx, tx, p, row, reason, s.now()); err != nil {
			return err
		}
	}
	return nil
}
