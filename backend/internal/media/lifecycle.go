package media

import (
	"context"
	"errors"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) failed(ctx context.Context, id string) (failed bool, result error) {
	rows, err := s.client.QueryContext(ctx, "SELECT state FROM jobs WHERE kind='media.scan' AND idempotency_key=?", "media:"+id)
	if err != nil {
		return false, err
	}
	defer func() { result = errors.Join(result, rows.Close()) }()
	if rows.Next() {
		var state string
		if err = rows.Scan(&state); err != nil {
			return false, err
		}
		failed = state == "failed"
	}
	return failed, rows.Err()
}

// Retry restarts only an exhausted scan job for an owned unbound upload. It does
// not turn scanner errors into clean results or permit a different file payload.
func (s *Store) Retry(ctx context.Context, p *identity.Principal, id string, admin bool) error {
	return s.auth.AuthorizedTransaction(ctx, p, capFor(admin), admin, func(tx *ent.Tx, current *identity.Principal) error {
		row, err := managed(ctx, tx.Client(), current, id, admin)
		if err != nil {
			return err
		}
		if err = member(ctx, tx.Client(), current, row.ConversationID, admin); err != nil {
			return err
		}
		if row.State != mediafile.StateQueued || row.MessageID != nil || !row.ExpiresAt.After(s.now()) {
			return ErrConflict
		}
		result, err := tx.ExecContext(ctx, "UPDATE jobs SET state='pending',attempts=0,owner=NULL,lease_until=NULL,last_error=NULL,available_at=UTC_TIMESTAMP(6) WHERE kind='media.scan' AND idempotency_key=? AND state='failed'", "media:"+id)
		if err != nil {
			return err
		}
		count, err := result.RowsAffected()
		if err != nil {
			return err
		}
		if count != 1 {
			return ErrConflict
		}
		return audit(ctx, tx, current, id, "media_scan_retry", s.now())
	})
}

// Remove revokes an unattached upload immediately; object cleanup is retried by
// the worker. Bound conversation evidence cannot be deleted by this endpoint.
func (s *Store) Remove(ctx context.Context, p *identity.Principal, id string, admin bool) error {
	return s.auth.AuthorizedTransaction(ctx, p, capFor(admin), admin, func(tx *ent.Tx, current *identity.Principal) error {
		row, err := managed(ctx, tx.Client(), current, id, admin)
		if err != nil {
			return err
		}
		if err = member(ctx, tx.Client(), current, row.ConversationID, admin); err != nil {
			return err
		}
		if row.MessageID != nil {
			return ErrConflict
		}
		if row.State == mediafile.StateDeleted {
			return nil
		}
		_, err = tx.MediaFile.UpdateOneID(id).SetState(mediafile.StateDeleted).ClearPurgedAt().SetUpdatedAt(s.now()).Save(ctx)
		if err != nil {
			return err
		}
		return audit(ctx, tx, current, id, "media_discarded", s.now())
	})
}
