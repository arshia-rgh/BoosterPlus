package fulfillment

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

// Reminders claims bounded upcoming sessions and queues reference-only notices.
func (s *Store) Reminders(ctx context.Context) error {
	rows, err := s.client.Booking.Query().Where(booking.StateEQ(booking.StateConfirmed), booking.RemindedEQ(false), booking.StartsAtGT(s.now()), booking.StartsAtLTE(s.now().Add(time.Hour))).Order(ent.Asc(booking.FieldStartsAt)).Limit(100).All(ctx)
	if err != nil {
		return err
	}
	for _, row := range rows {
		if err = s.remind(ctx, row); err != nil {
			return err
		}
	}
	return nil
}
func (s *Store) remind(ctx context.Context, row *ent.Booking) error {
	tx, err := s.client.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	count, err := tx.Booking.Update().Where(booking.IDEQ(row.ID), booking.VersionEQ(row.Version), booking.StateEQ(booking.StateConfirmed), booking.RemindedEQ(false), booking.StartsAtGT(s.now())).SetReminded(true).Save(ctx)
	if err != nil {
		return errors.Join(err, tx.Rollback())
	}
	if count == 1 {
		// The delivery worker rechecks the booking, paid order and current assignment.
		if err = notifications.Enqueue(ctx, tx, row.UserID, row.OrderID, row.ID, "booking_customer", s.now()); err != nil {
			return errors.Join(err, tx.Rollback())
		}
		if err = notifications.Enqueue(ctx, tx, row.AssignedID, row.OrderID, row.ID, "booking_staff", s.now()); err != nil {
			return errors.Join(err, tx.Rollback())
		}
	}
	return tx.Commit()
}

// RunReminders bounds each maintenance run and never logs private session values.
func (s *Store) RunReminders(ctx context.Context, logger *slog.Logger) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			task, cancel := context.WithTimeout(ctx, 30*time.Second)
			err := s.Reminders(task)
			cancel()
			if err != nil && ctx.Err() == nil {
				logger.ErrorContext(ctx, "session reminder processing unavailable")
			}
		}
	}
}
