package payments

import (
	"context"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// DiscoverOutgoing repairs missing or ambiguous provider references using one bounded page.
func (s *Store) DiscoverOutgoing(ctx context.Context) error {
	if s.outgoing == nil {
		return ErrUnavailable
	}
	settings, err := s.client.PaymentSettings.Get(ctx, 1)
	if err != nil {
		return err
	}
	page, err := s.outgoing.ListPayouts(ctx, settings.OutgoingPage)
	if err != nil {
		return err
	}
	return s.fenced(ctx, func(tx *ent.Tx) error {
		for _, id := range page.IDs {
			record, e := s.transferRecord(ctx, tx, id)
			if e != nil {
				return e
			}
			if e = s.queueTransfer(ctx, tx, record); e != nil {
				return e
			}
		}
		next := settings.OutgoingPage + 1
		if next >= page.Pages {
			next = 0
		}
		_, e := tx.PaymentSettings.UpdateOneID(1).SetOutgoingPage(next).Save(ctx)
		return e
	})
}
func (s *Store) maintainOutgoing(ctx context.Context) error {
	return s.fenced(ctx, func(tx *ent.Tx) error {
		rows, err := tx.TransferRecord.Query().Where(transferrecord.AccountEQ(s.account), transferrecord.CheckedAtLTE(s.instant().Add(-time.Minute))).Order(ent.Asc(transferrecord.FieldCheckedAt), ent.Asc(transferrecord.FieldID)).Limit(50).All(ctx)
		if err != nil {
			return err
		}
		for _, row := range rows {
			if err = s.queueTransfer(ctx, tx, row); err != nil {
				return err
			}
		}
		return nil
	})
}

// RequestOutgoingRead cannot mark a transfer paid or assign it to a guessed beneficiary.
func (s *Store) RequestOutgoingRead(ctx context.Context, p *identity.Principal, input ReconcileInput) error {
	if !providerPattern.MatchString(input.PaymentID) || !validText(input.Reason, 10, 2000) {
		return ErrInvalid
	}
	if s.outgoing == nil {
		return ErrUnavailable
	}
	return s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		record, err := s.transferRecord(ctx, tx, input.PaymentID)
		if err != nil {
			return err
		}
		if err = s.audit(ctx, tx, current, "outgoing_reconcile", record.ID); err != nil {
			return err
		}
		return s.queueTransfer(ctx, tx, record)
	})
}
func transferReadKey(row *ent.TransferRecord, now time.Time) string {
	return "outgoing-read:" + row.ID + ":" + strconv.Itoa(row.Version) + ":" + strconv.FormatInt(now.Unix()/60, 10)
}
