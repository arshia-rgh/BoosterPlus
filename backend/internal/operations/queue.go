package operations

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ListJobs inspects a maximum of 50 safe job projections using allowlisted filters.
func (s *Store) ListJobs(ctx context.Context, p *identity.Principal, state, kind, after string) (out Listing, err error) {
	if !jobState(state) || kind != "" && !supportedKind(kind) {
		return out, ErrInvalid
	}
	var at time.Time
	var id string
	if after != "" {
		at, id, err = cursor(after)
		if err != nil {
			return out, err
		}
	}
	err = s.private(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		var e error
		out, e = queuePage(ctx, tx, state, kind, at, id)
		return e
	})
	return out, err
}
func queuePage(ctx context.Context, tx *ent.Tx, state, kind string, at time.Time, id string) (out Listing, err error) {
	out = Listing{Items: []Job{}}
	query := "SELECT id,kind,state,attempts,max_attempts,retry_generation,COALESCE(last_error,''),created_at,available_at,lease_until FROM jobs WHERE state=?"
	args := []any{state}
	if kind != "" {
		query += " AND kind=?"
		args = append(args, kind)
	}
	if id != "" {
		query += " AND (created_at<? OR (created_at=? AND id<?))"
		args = append(args, at, at, id)
	}
	query += " ORDER BY created_at DESC,id DESC LIMIT 51"
	rows, e := tx.QueryContext(ctx, query, args...)
	if e != nil {
		return out, e
	}
	defer func() { err = errors.Join(err, rows.Close()) }()
	for rows.Next() {
		v, e := scanJob(rows)
		if e != nil {
			return out, e
		}
		out.Items = append(out.Items, v)
	}
	if err = rows.Err(); err != nil {
		return out, err
	}
	if len(out.Items) > 50 {
		last := out.Items[49]
		out.Next = continuation(last.CreatedAt, last.ID)
		out.Items = out.Items[:50]
	}
	return out, nil
}
func scanJob(row interface{ Scan(...any) error }) (Job, error) {
	var v Job
	var lease sql.NullTime
	if e := row.Scan(&v.ID, &v.Kind, &v.State, &v.Attempts, &v.MaxAttempts, &v.RetryGeneration, &v.ErrorCode, &v.CreatedAt, &v.AvailableAt, &lease); e != nil {
		return v, e
	}
	if lease.Valid {
		v.LeaseUntil = &lease.Time
	}
	v.ErrorCode = errorCode(v.ErrorCode)
	v.Retryable = v.State == "failed" && supportedKind(v.Kind) && v.RetryGeneration >= 0 && v.RetryGeneration < 2147483646
	return v, nil
}

// Retry requeues only the observed failed generation; auditing and queue recovery are atomic.
func (s *Store) Retry(ctx context.Context, p *identity.Principal, id string, input RetryInput) (out Job, err error) {
	if !validID(id) || input.Generation < 0 || input.Generation >= 2147483646 || !validReason(input.Reason) {
		return out, ErrInvalid
	}
	err = s.private(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		v, e := jobByID(ctx, tx, id)
		if e != nil {
			return e
		}
		if !v.Retryable || v.RetryGeneration != input.Generation {
			return ErrConflict
		}
		changed, e := tx.ExecContext(ctx, "UPDATE jobs SET state='pending',attempts=0,owner=NULL,lease_until=NULL,last_error=NULL,available_at=UTC_TIMESTAMP(6),retry_generation=retry_generation+1 WHERE id=? AND state='failed' AND retry_generation=?", id, input.Generation)
		if e != nil {
			return e
		}
		n, e := changed.RowsAffected()
		if e != nil {
			return e
		}
		if n != 1 {
			return ErrConflict
		}
		if _, e = tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(current.User.ID).SetTargetID(id).SetAction("job_retry").SetMetadata(map[string]string{"reason": input.Reason}).SetCreatedAt(s.now().UTC()).Save(ctx); e != nil {
			return e
		}
		out, e = jobByID(ctx, tx, id)
		return e
	})
	return out, err
}

func jobByID(ctx context.Context, tx *ent.Tx, id string) (out Job, err error) {
	rows, e := tx.QueryContext(ctx, "SELECT id,kind,state,attempts,max_attempts,retry_generation,COALESCE(last_error,''),created_at,available_at,lease_until FROM jobs WHERE id=?", id)
	if e != nil {
		return out, e
	}
	defer func() { err = errors.Join(err, rows.Close()) }()
	if !rows.Next() {
		return out, errors.Join(ErrConflict, rows.Err())
	}
	out, e = scanJob(rows)
	return out, errors.Join(e, rows.Err())
}
