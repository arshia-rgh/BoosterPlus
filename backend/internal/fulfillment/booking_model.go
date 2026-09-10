package fulfillment

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/bookingevent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/scheduling"
)

// BookingInput proposes a time without claiming capacity or changing price.
type BookingInput struct {
	WorkVersion     int                  `json:"work_version"`
	RequestKey      string               `json:"request_key"`
	AvailabilityID  string               `json:"availability_id"`
	Start           scheduling.LocalTime `json:"start"`
	End             scheduling.LocalTime `json:"end"`
	PreviousID      string               `json:"previous_id"`
	PreviousVersion int                  `json:"previous_version"`
	Note            string               `json:"note"`
}

// BookingAction compares the observed booking revision; time changes create replacements.
type BookingAction struct {
	Version int    `json:"version"`
	Note    string `json:"note"`
}

// BookingHistory exposes state changes without internal staff identities.
type BookingHistory struct {
	Version   int       `json:"version"`
	State     string    `json:"state"`
	Note      string    `json:"note"`
	ActorRole string    `json:"actor_role"`
	CreatedAt time.Time `json:"created_at"`
}

// BookingView contains the order's private session, never other customers' schedules.
type BookingView struct {
	ID         string           `json:"id"`
	OrderID    string           `json:"order_id"`
	Version    int              `json:"version"`
	PreviousID string           `json:"previous_id"`
	StartsAt   time.Time        `json:"starts_at"`
	EndsAt     time.Time        `json:"ends_at"`
	Timezone   string           `json:"timezone"`
	State      string           `json:"state"`
	History    []BookingHistory `json:"history"`
}

// BookingListing has bounded chronological pagination.
type BookingListing struct {
	Items []BookingView `json:"items"`
	Next  string        `json:"next"`
}

// SlotView is an available interval with all private booking identities removed.
type SlotView struct {
	AvailabilityID string    `json:"availability_id"`
	StartsAt       time.Time `json:"starts_at"`
	EndsAt         time.Time `json:"ends_at"`
	Timezone       string    `json:"timezone"`
}

func bookingView(ctx context.Context, c *ent.Client, row *ent.Booking) (BookingView, error) {
	result := BookingView{row.ID, row.OrderID, row.Version, row.PreviousID, row.StartsAt, row.EndsAt, row.Timezone, string(row.State), []BookingHistory{}}
	events, err := c.BookingEvent.Query().Where(bookingevent.BookingIDEQ(row.ID)).Order(ent.Asc(bookingevent.FieldVersion)).Limit(50).All(ctx)
	if err != nil {
		return result, err
	}
	for _, event := range events {
		result.History = append(result.History, BookingHistory{event.Version, event.State, event.Note, event.ActorRole, event.CreatedAt})
	}
	return result, nil
}
func bookingEvent(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.Booking, note string, now time.Time) error {
	_, err := tx.BookingEvent.Create().SetBookingID(row.ID).SetVersion(row.Version).SetState(string(row.State)).SetNote(note).SetActorRole(p.User.Role).SetCreatedAt(now).Save(ctx)
	if err != nil {
		return err
	}
	_, err = tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(p.User.ID).SetTargetID(row.ID).SetAction("booking_" + string(row.State)).SetMetadata(map[string]string{}).SetCreatedAt(now).Save(ctx)
	return err
}
func (s *Store) bookingResource(ctx context.Context, tx *ent.Tx, p *identity.Principal, id, audience string) (*ent.Order, *ent.Fulfillment, error) {
	row, err := paid(ctx, tx.Client(), id)
	if err != nil {
		return nil, nil, err
	}
	work, err := record(ctx, tx.Client(), id)
	if err != nil {
		return nil, nil, err
	}
	if err = authority(p, row, work, audience); err != nil {
		return nil, nil, err
	}
	if work.Mode != "together" {
		return nil, nil, ErrConflict
	}
	return row, work, nil
}
func (s *Store) bookingTimeline(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.Order, work *ent.Fulfillment, action, note string) error {
	if row.Version >= 2147483646 || work.Version >= 2147483646 {
		return ErrConflict
	}
	if _, err := tx.Fulfillment.UpdateOneID(work.ID).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx); err != nil {
		return err
	}
	row, err := tx.Order.UpdateOneID(row.ID).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx)
	if err != nil {
		return err
	}
	return audit(ctx, tx, p, row, action, note, s.now())
}
