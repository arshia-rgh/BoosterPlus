package jobs

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
)

// Attempt metadata is committed with queue state; it never stores payloads,
// lease-owner secrets, recipient addresses or handler error strings.
func (s *Store) claimAttempt(ctx context.Context, id string) (_ *Job, resultErr error) {
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return nil, err
	}
	defer func() {
		if e := tx.Rollback(); e != nil && !errors.Is(e, sql.ErrTxDone) {
			resultErr = errors.Join(resultErr, e)
		}
	}()
	owner := rand.Text()
	result, err := tx.ExecContext(ctx, `UPDATE jobs SET state='running',owner=?,lease_until=DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 30 SECOND),attempts=attempts+1 WHERE id=? AND attempts<max_attempts AND ((state='pending' AND available_at<=UTC_TIMESTAMP(6)) OR (state='running' AND lease_until<UTC_TIMESTAMP(6)))`, owner, id)
	if err != nil {
		return nil, err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if n != 1 {
		return nil, nil
	}
	if _, err = tx.ExecContext(ctx, `UPDATE job_attempts SET outcome='lease_expired',finished_at=UTC_TIMESTAMP(6) WHERE job_id=? AND outcome='running'`, id); err != nil {
		return nil, err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO job_attempts(job_id,retry_generation,attempt,outcome,started_at) SELECT id,retry_generation,attempts,'running',UTC_TIMESTAMP(6) FROM jobs WHERE id=?`, id); err != nil {
		return nil, err
	}
	job := &Job{ID: id, Owner: owner}
	if err = tx.QueryRowContext(ctx, "SELECT kind,payload,attempts FROM jobs WHERE id=? AND owner=? AND state='running'", id, owner).Scan(&job.Kind, &job.Payload, &job.Attempts); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return job, nil
}
func (s *Store) finishAttempt(ctx context.Context, job *Job, outcome, query string, args ...any) (resultErr error) {
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	defer func() {
		if e := tx.Rollback(); e != nil && !errors.Is(e, sql.ErrTxDone) {
			resultErr = errors.Join(resultErr, e)
		}
	}()
	result, err := tx.ExecContext(ctx, query, args...)
	if err = checkLease(result, err); err != nil {
		return err
	}
	// Zero history rows are permitted for a lease begun before this migration;
	// new claims always insert a row in the same transaction as the claim.
	if _, err = tx.ExecContext(ctx, `UPDATE job_attempts SET outcome=?,finished_at=UTC_TIMESTAMP(6) WHERE job_id=? AND retry_generation=(SELECT retry_generation FROM jobs WHERE id=?) AND attempt=? AND outcome='running'`, outcome, job.ID, job.ID, job.Attempts); err != nil {
		return err
	}
	return tx.Commit()
}
func (s *Store) retireExhausted(ctx context.Context) (resultErr error) {
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	defer func() {
		if e := tx.Rollback(); e != nil && !errors.Is(e, sql.ErrTxDone) {
			resultErr = errors.Join(resultErr, e)
		}
	}()
	if _, err = tx.ExecContext(ctx, `UPDATE jobs SET state='failed', owner=NULL, lease_until=NULL, last_error='lease_exhausted' WHERE state='running' AND lease_until<UTC_TIMESTAMP(6) AND attempts>=max_attempts`); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `UPDATE job_attempts a JOIN jobs j ON j.id=a.job_id AND j.retry_generation=a.retry_generation AND j.attempts=a.attempt SET a.outcome='lease_expired',a.finished_at=UTC_TIMESTAMP(6) WHERE a.outcome='running' AND j.state='failed' AND j.last_error='lease_exhausted'`); err != nil {
		return err
	}
	return tx.Commit()
}
