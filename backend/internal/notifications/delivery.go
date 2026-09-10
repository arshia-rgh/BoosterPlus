package notifications

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Delivery excludes email addresses, job payloads and message bodies.
type Delivery struct {
	ID        string    `json:"id"`
	State     string    `json:"state"`
	Attempts  int       `json:"attempts"`
	LastError string    `json:"last_error"`
	CreatedAt time.Time `json:"created_at"`
}

// Deliveries exposes only activity email failures and queued/running retries.
func (s *Store) Deliveries(ctx context.Context, p *identity.Principal) (result []Delivery, resultErr error) {
	if err := identity.Require(p, "admin"); err != nil {
		return nil, err
	}
	rows, err := s.client.QueryContext(ctx, "SELECT id,state,attempts,COALESCE(last_error,''),created_at FROM jobs WHERE kind='activity.email' AND state IN ('failed','pending','running') ORDER BY created_at DESC,id DESC LIMIT 50")
	if err != nil {
		return nil, err
	}
	defer func() { resultErr = errors.Join(resultErr, rows.Close()) }()
	result = []Delivery{}
	for rows.Next() {
		var row Delivery
		if err = rows.Scan(&row.ID, &row.State, &row.Attempts, &row.LastError, &row.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

// Retry requires recent staff factors and cannot restart running/completed work.
func (s *Store) Retry(ctx context.Context, p *identity.Principal, id string) error {
	return s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		result, err := tx.ExecContext(ctx, "UPDATE jobs SET state='pending',attempts=0,owner=NULL,lease_until=NULL,last_error=NULL,available_at=UTC_TIMESTAMP(6) WHERE id=? AND kind='activity.email' AND state='failed'", id)
		if err != nil {
			return err
		}
		count, err := result.RowsAffected()
		if err != nil {
			return err
		}
		if count != 1 {
			return identity.ErrConflict
		}
		_, err = tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(current.User.ID).SetAction("activity_delivery_retry").SetTargetID(id).SetMetadata(map[string]string{}).SetCreatedAt(time.Now()).Save(ctx)
		return err
	})
}
