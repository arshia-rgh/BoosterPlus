package payments

import (
	"context"
	"log/slog"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentrecord"
)

// Discover repairs missing callbacks from one bounded authenticated merchant page.
func (s *Store) Discover(ctx context.Context) error {
	if s.provider == nil {
		return ErrUnavailable
	}
	settings, err := s.client.PaymentSettings.Get(ctx, 1)
	if err != nil {
		return err
	}
	page, err := s.provider.ListPayments(ctx, settings.DiscoveryPage)
	if err != nil {
		return err
	}
	return s.fenced(ctx, func(tx *ent.Tx) error {
		for _, id := range page.IDs {
			if !providerPattern.MatchString(id) {
				return ErrInvalid
			}
			row, e := s.record(ctx, tx, id)
			if e != nil {
				return e
			}
			if e = s.queueRead(ctx, tx, row); e != nil {
				return e
			}
		}
		next := settings.DiscoveryPage + 1
		if next >= page.Pages {
			next = 0
		}
		_, e := tx.PaymentSettings.UpdateOneID(1).SetDiscoveryPage(next).Save(ctx)
		return e
	})
}
func (s *Store) queueRead(ctx context.Context, tx *ent.Tx, row *ent.PaymentRecord) error {
	return enqueue(ctx, tx, "payments.reconcile", "payment-poll:"+row.ID+":"+strconv.FormatInt(s.instant().Unix()/60, 10), map[string]string{"record_id": row.ID})
}

// Maintain reconciles old references and closes expired local checkouts in bounded pages.
func (s *Store) Maintain(ctx context.Context) error {
	err := s.fenced(ctx, func(tx *ent.Tx) error {
		rows, e := tx.PaymentRecord.Query().Where(paymentrecord.AccountEQ(s.account), paymentrecord.CheckedAtLTE(s.instant().Add(-time.Minute))).Order(ent.Asc(paymentrecord.FieldCheckedAt), ent.Asc(paymentrecord.FieldID)).Limit(50).All(ctx)
		if e != nil {
			return e
		}
		for _, row := range rows {
			if e = s.queueRead(ctx, tx, row); e != nil {
				return e
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	return s.expire(ctx)
}

// RunMaintenance repairs missed signals while the durable queue owns provider reads.
func (s *Store) RunMaintenance(ctx context.Context, logger *slog.Logger) {
	if s.provider == nil {
		return
	}
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		if err := s.Discover(ctx); err != nil && ctx.Err() == nil {
			logger.ErrorContext(ctx, "payment discovery requires attention")
		}
		if s.outgoing != nil {
			if err := s.DiscoverOutgoing(ctx); err != nil && ctx.Err() == nil {
				logger.ErrorContext(ctx, "outgoing discovery requires attention")
			}
			if err := s.maintainOutgoing(ctx); err != nil && ctx.Err() == nil {
				logger.ErrorContext(ctx, "outgoing maintenance requires attention")
			}
		}
		if err := s.Maintain(ctx); err != nil && ctx.Err() == nil {
			logger.ErrorContext(ctx, "payment maintenance requires attention")
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
