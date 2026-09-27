package fulfillment

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitywindow"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/scheduling"
)

// Calendar returns the selected staff member's profile and a bounded future page.
func (s *Store) Calendar(ctx context.Context, p *identity.Principal, id string, admin bool, cursor string) (CalendarView, error) {
	result := CalendarView{Windows: []WindowView{}}
	err := s.auth.AuthorizedTransaction(ctx, p, staffCapability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		if e := staffTarget(ctx, tx.Client(), current, id, admin); e != nil {
			return e
		}
		profile, e := tx.StaffProfile.Get(ctx, id)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		result = CalendarView{Profile: calendarProfile(profile), Windows: []WindowView{}}
		q := tx.AvailabilityWindow.Query().Where(availabilitywindow.UserIDEQ(id), availabilitywindow.EndsAtGT(s.now().Add(-24*time.Hour))).Order(ent.Asc(availabilitywindow.FieldStartsAt), ent.Asc(availabilitywindow.FieldID)).Limit(101)
		if cursor != "" {
			at, key, parseErr := cursorPair(cursor)
			if parseErr != nil {
				return parseErr
			}
			q.Where(availabilitywindow.Or(availabilitywindow.StartsAtGT(at), availabilitywindow.And(availabilitywindow.StartsAtEQ(at), availabilitywindow.IDGT(key))))
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 100 {
			last := rows[99]
			result.Next = nextCursor(last.StartsAt, last.ID)
			rows = rows[:100]
		}
		for _, row := range rows {
			result.Windows = append(result.Windows, windowView(row))
		}
		return nil
	})
	return result, err
}

// SaveCalendarProfile changes only declared staffing hints and availability policy.
func (s *Store) SaveCalendarProfile(ctx context.Context, p *identity.Principal, id string, admin bool, input StaffCalendarProfile) (StaffCalendarProfile, error) {
	if input.Version < 0 || input.Version >= 2147483646 || !validTags(input.GameTags) || !validTags(input.RegionTags) {
		return StaffCalendarProfile{}, ErrInvalid
	}
	if _, err := scheduling.Location(input.Timezone); err != nil {
		return StaffCalendarProfile{}, err
	}
	var result StaffCalendarProfile
	err := s.auth.AuthorizedTransaction(ctx, p, staffCapability(admin), admin, func(tx *ent.Tx, current *identity.Principal) error {
		if e := staffTarget(ctx, tx.Client(), current, id, admin); e != nil {
			return e
		}
		row, e := tx.StaffProfile.Get(ctx, id)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		if row != nil && row.Version != input.Version || row == nil && input.Version != 0 {
			return ErrConflict
		}
		if !input.Enabled {
			booked, findErr := tx.Booking.Query().Where(booking.AssignedIDEQ(id), booking.StateEQ(booking.StateConfirmed), booking.EndsAtGT(s.now())).Exist(ctx)
			if findErr != nil {
				return findErr
			}
			if booked {
				return ErrConflict
			}
		}
		if row == nil {
			row, e = tx.StaffProfile.Create().SetID(id).SetTimezone(input.Timezone).SetEnabled(input.Enabled).SetGameTags(normalizedTags(input.GameTags)).SetRegionTags(normalizedTags(input.RegionTags)).SetUpdatedAt(s.now()).Save(ctx)
		} else {
			row, e = tx.StaffProfile.UpdateOneID(id).AddVersion(1).SetTimezone(input.Timezone).SetEnabled(input.Enabled).SetGameTags(normalizedTags(input.GameTags)).SetRegionTags(normalizedTags(input.RegionTags)).SetUpdatedAt(s.now()).Save(ctx)
		}
		if e != nil {
			return e
		}
		if e = calendarAudit(ctx, tx, current, id, "staff_calendar_updated", s.now()); e != nil {
			return e
		}
		result = calendarProfile(row)
		return nil
	})
	return result, err
}

// AddAvailability records an idempotent, nonoverlapping dated window.
func (s *Store) AddAvailability(ctx context.Context, p *identity.Principal, id string, admin bool, input WindowInput) (WindowView, error) {
	start, end, err := resolveWindow(input)
	if err != nil {
		return WindowView{}, err
	}
	digest, err := requestDigest(s, "availability", input)
	if err != nil {
		return WindowView{}, err
	}
	var resultCopy WindowView
	err = s.auth.AuthorizedTransaction(ctx, p, staffCapability(admin), admin, func(tx *ent.Tx, current *identity.Principal) error {
		if e := staffTarget(ctx, tx.Client(), current, id, admin); e != nil {
			return e
		}
		result, e := s.addAvailability(ctx, tx, current, id, input, start, end, digest)
		if e != nil {
			return e
		}
		resultCopy = result
		return nil
	})
	return resultCopy, err
}

func (s *Store) addAvailability(ctx context.Context, tx *ent.Tx, current *identity.Principal, id string, input WindowInput, start, end time.Time, digest string) (WindowView, error) {
	existing, e := tx.AvailabilityWindow.Query().Where(availabilitywindow.UserIDEQ(id), availabilitywindow.RequestKeyEQ(input.RequestKey)).Only(ctx)
	if e == nil {
		if existing.RequestHash != digest {
			return WindowView{}, ErrConflict
		}
		return windowView(existing), nil
	}
	if !ent.IsNotFound(e) {
		return WindowView{}, e
	}
	if !start.After(s.now()) || start.After(s.now().Add(90*24*time.Hour)) {
		return WindowView{}, ErrInvalid
	}
	profile, e := tx.StaffProfile.Get(ctx, id)
	if e != nil {
		return WindowView{}, e
	}
	if !profile.Enabled || profile.Timezone != input.Start.Zone {
		return WindowView{}, ErrConflict
	}
	overlap, e := tx.AvailabilityWindow.Query().Where(availabilitywindow.UserIDEQ(id), availabilitywindow.ActiveEQ(true), availabilitywindow.StartsAtLT(end), availabilitywindow.EndsAtGT(start)).Exist(ctx)
	if e != nil {
		return WindowView{}, e
	}
	if overlap {
		return WindowView{}, ErrConflict
	}
	count, e := tx.AvailabilityWindow.Query().Where(availabilitywindow.UserIDEQ(id), availabilitywindow.ActiveEQ(true), availabilitywindow.EndsAtGT(s.now())).Count(ctx)
	if e != nil {
		return WindowView{}, e
	}
	if count >= 200 {
		return WindowView{}, ErrConflict
	}
	row, e := tx.AvailabilityWindow.Create().SetUserID(id).SetRequestKey(input.RequestKey).SetRequestHash(digest).SetStartsAt(start).SetEndsAt(end).SetTimezone(input.Start.Zone).SetUpdatedAt(s.now()).Save(ctx)
	if e != nil {
		return WindowView{}, e
	}
	if e = calendarAudit(ctx, tx, current, row.ID, "availability_created", s.now()); e != nil {
		return WindowView{}, e
	}
	return windowView(row), nil
}

// RemoveAvailability rejects removal while a confirmed future booking still needs it.
func (s *Store) RemoveAvailability(ctx context.Context, p *identity.Principal, id, windowID string, admin bool, version int) error {
	return s.auth.AuthorizedTransaction(ctx, p, staffCapability(admin), admin, func(tx *ent.Tx, current *identity.Principal) error {
		if e := staffTarget(ctx, tx.Client(), current, id, admin); e != nil {
			return e
		}
		row, e := tx.AvailabilityWindow.Query().Where(availabilitywindow.IDEQ(windowID), availabilitywindow.UserIDEQ(id)).Only(ctx)
		if e != nil {
			return e
		}
		if row.Version != version || version >= 2147483646 {
			return ErrConflict
		}
		if !row.Active {
			return nil
		}
		held, e := tx.Booking.Query().Where(booking.AvailabilityIDEQ(row.ID), booking.StateEQ(booking.StateConfirmed), booking.EndsAtGT(s.now())).Exist(ctx)
		if e != nil {
			return e
		}
		if held {
			return ErrConflict
		}
		if _, e = tx.AvailabilityWindow.UpdateOneID(row.ID).AddVersion(1).SetActive(false).SetUpdatedAt(s.now()).Save(ctx); e != nil {
			return e
		}
		return calendarAudit(ctx, tx, current, row.ID, "availability_removed", s.now())
	})
}
