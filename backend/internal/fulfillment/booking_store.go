package fulfillment

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitywindow"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) checkBookable(ctx context.Context, tx *ent.Tx, work *ent.Fulfillment, availabilityID string, start, end time.Time) error {
	blocked, caseErr := tx.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(work.OrderID)).Exist(ctx)
	if caseErr != nil {
		return caseErr
	}
	if blocked {
		return ErrConflict
	}
	if !start.After(s.now()) || start.After(s.now().Add(90*24*time.Hour)) {
		return ErrConflict
	}
	if err := activeStaff(ctx, tx.Client(), work.AssignedID); err != nil {
		return err
	}
	profile, err := tx.StaffProfile.Get(ctx, work.AssignedID)
	if err != nil {
		return err
	}
	if !profile.Enabled {
		return ErrConflict
	}
	allowed, err := tx.AvailabilityWindow.Query().Where(availabilitywindow.IDEQ(availabilityID), availabilitywindow.UserIDEQ(work.AssignedID), availabilitywindow.ActiveEQ(true), availabilitywindow.StartsAtLTE(start), availabilitywindow.EndsAtGTE(end)).Exist(ctx)
	if err != nil {
		return err
	}
	if !allowed {
		return ErrConflict
	}
	return nil
}
func bookingOverlap(ctx context.Context, tx *ent.Tx, staffID, userID, exclude string, start, end time.Time) (bool, error) {
	return tx.Booking.Query().Where(booking.IDNEQ(exclude), booking.StateEQ(booking.StateConfirmed), booking.Or(booking.AssignedIDEQ(staffID), booking.UserIDEQ(userID)), booking.StartsAtLT(end), booking.EndsAtGT(start)).Exist(ctx)
}

// ProposeBooking is privately idempotent; proposals never reserve a staff slot.
func (s *Store) ProposeBooking(ctx context.Context, p *identity.Principal, id string, input BookingInput) (BookingView, error) {
	if !bounded(input.Note, 1, 2000) || input.WorkVersion < 1 {
		return BookingView{}, ErrInvalid
	}
	start, end, err := resolveWindow(WindowInput{RequestKey: input.RequestKey, Start: input.Start, End: input.End})
	if err != nil {
		return BookingView{}, err
	}
	if key, e := uuid.Parse(input.AvailabilityID); e != nil || key.String() != input.AvailabilityID {
		return BookingView{}, ErrInvalid
	}
	digest, err := requestDigest(s, "booking-proposal", input)
	if err != nil {
		return BookingView{}, err
	}
	var result BookingView
	err = s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		row, work, e := s.bookingResource(ctx, tx, current, id, "account")
		if e != nil {
			return e
		}
		existing, e := tx.Booking.Query().Where(booking.UserIDEQ(current.User.ID), booking.RequestKeyEQ(input.RequestKey)).Only(ctx)
		if e == nil {
			if existing.RequestHash != digest || existing.OrderID != id {
				return ErrConflict
			}
			result, e = bookingView(ctx, tx.Client(), existing)
			return e
		}
		if !ent.IsNotFound(e) {
			return e
		}
		if !active(row) || work.Version != input.WorkVersion {
			return ErrConflict
		}
		if e = s.checkBookable(ctx, tx, work, input.AvailabilityID, start, end); e != nil {
			return e
		}
		var previous *ent.Booking
		if input.PreviousID != "" {
			previous, e = tx.Booking.Query().Where(booking.IDEQ(input.PreviousID), booking.OrderIDEQ(id), booking.UserIDEQ(current.User.ID)).Only(ctx)
			if e != nil {
				return e
			}
			if previous.Version != input.PreviousVersion || previous.Version >= 2147483646 || !previous.StartsAt.After(s.now()) || (previous.State != booking.StateProposed && previous.State != booking.StateConfirmed) {
				return ErrConflict
			}
		} else if input.PreviousVersion != 0 {
			return ErrInvalid
		}
		overlap, e := bookingOverlap(ctx, tx, work.AssignedID, row.UserID, input.PreviousID, start, end)
		if e != nil {
			return e
		}
		if overlap {
			return ErrConflict
		}
		count, e := tx.Booking.Query().Where(booking.OrderIDEQ(id), booking.StateEQ(booking.StateProposed), booking.IDNEQ(input.PreviousID)).Count(ctx)
		if e != nil {
			return e
		}
		if count >= 5 {
			return ErrConflict
		}
		if previous != nil {
			previous, e = tx.Booking.UpdateOneID(previous.ID).AddVersion(1).SetState(booking.StateCancelled).SetUpdatedAt(s.now()).Save(ctx)
			if e != nil {
				return e
			}
			if e = bookingEvent(ctx, tx, current, previous, "Replaced by a new session proposal.", s.now()); e != nil {
				return e
			}
		}
		created, e := tx.Booking.Create().SetOrderID(id).SetUserID(row.UserID).SetAssignedID(work.AssignedID).SetAvailabilityID(input.AvailabilityID).SetRequestKey(input.RequestKey).SetRequestHash(digest).SetPreviousID(input.PreviousID).SetStartsAt(start).SetEndsAt(end).SetTimezone(input.Start.Zone).SetCreatedAt(s.now()).SetUpdatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		if e = bookingEvent(ctx, tx, current, created, input.Note, s.now()); e != nil {
			return e
		}
		if e = s.bookingTimeline(ctx, tx, current, row, work, "session_proposed", input.Note); e != nil {
			return e
		}
		result, e = bookingView(ctx, tx.Client(), created)
		return e
	})
	return result, err
}

// ChangeBooking confirms against current capacity or records an explicit lifecycle event.
func (s *Store) ChangeBooking(ctx context.Context, p *identity.Principal, id, bookingID, audience, action string, input BookingAction) (BookingView, error) {
	if !bounded(input.Note, 1, 2000) || input.Version < 1 || input.Version >= 2147483646 {
		return BookingView{}, ErrInvalid
	}
	var result BookingView
	err := s.auth.AuthorizedTransaction(ctx, p, audience, audience == "admin", func(tx *ent.Tx, current *identity.Principal) error {
		row, work, e := s.bookingResource(ctx, tx, current, id, audience)
		if e != nil {
			return e
		}
		value, e := tx.Booking.Query().Where(booking.IDEQ(bookingID), booking.OrderIDEQ(id)).Only(ctx)
		if e != nil {
			return e
		}
		historical := audience == "admin" && (action == "attended" || action == "no_show") && !s.now().Before(value.EndsAt)
		if (!active(row) && !historical) || value.Version != input.Version || (value.AssignedID != work.AssignedID && audience != "admin") {
			return ErrConflict
		}
		var next booking.State
		switch action {
		case "confirm":
			if audience == "account" {
				return identity.ErrForbidden
			}
			if value.State != booking.StateProposed {
				return ErrConflict
			}
			if e = s.checkBookable(ctx, tx, work, value.AvailabilityID, value.StartsAt, value.EndsAt); e != nil {
				return e
			}
			overlap, checkErr := bookingOverlap(ctx, tx, work.AssignedID, row.UserID, value.ID, value.StartsAt, value.EndsAt)
			if checkErr != nil {
				return checkErr
			}
			if overlap {
				return ErrConflict
			}
			count, countErr := tx.Booking.Query().Where(booking.OrderIDEQ(id), booking.StateEQ(booking.StateConfirmed), booking.EndsAtGT(s.now())).Count(ctx)
			if countErr != nil {
				return countErr
			}
			if count >= 20 {
				return ErrConflict
			}
			next = booking.StateConfirmed
		case "cancel":
			if value.State != booking.StateProposed && value.State != booking.StateConfirmed {
				return ErrConflict
			}
			next = booking.StateCancelled
		case "attended", "no_show":
			if audience == "account" {
				return identity.ErrForbidden
			}
			if value.State != booking.StateConfirmed || s.now().Before(value.StartsAt) {
				return ErrConflict
			}
			next = booking.StateCompleted
			if action == "no_show" {
				if s.now().Before(value.EndsAt) {
					return ErrConflict
				}
				next = booking.StateNoShow
			}
		default:
			return ErrInvalid
		}
		value, e = tx.Booking.UpdateOneID(value.ID).AddVersion(1).SetState(next).SetUpdatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		if e = bookingEvent(ctx, tx, current, value, input.Note, s.now()); e != nil {
			return e
		}
		if e = s.bookingTimeline(ctx, tx, current, row, work, "session_"+action, input.Note); e != nil {
			return e
		}
		result, e = bookingView(ctx, tx.Client(), value)
		return e
	})
	return result, err
}
