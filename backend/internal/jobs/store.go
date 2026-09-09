// Package jobs implements a durable TiDB queue with fenced leases and retries.
package jobs

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

// ErrLeaseLost prevents an expired/reassigned worker from acknowledging a job.
var ErrLeaseLost = errors.New("job lease no longer belongs to this worker")

// ErrConflict prevents reusing an idempotency key for a different job.
var ErrConflict = errors.New("job idempotency key has a different request")

// Job carries references to work; handlers must not log its payload.
type Job struct {
	ID       string
	Kind     string
	Payload  json.RawMessage
	Owner    string
	Attempts int
}

// Store shares a connection pool; all claims are conditional SQL updates.
type Store struct{ db *sql.DB }

// New creates a queue without running migrations.
func New(db *sql.DB) *Store { return &Store{db: db} }

// EnqueueTx adds a job in the SAME transaction as the business change/outbox event.
func EnqueueTx(ctx context.Context, tx *sql.Tx, kind, key string, payload json.RawMessage) (string, error) {
	if tx == nil {
		return "", errors.New("job requires an active transaction")
	}
	return enqueue(ctx, tx, kind, key, payload)
}

// EnqueueEntTx places outbox work inside the caller's Ent business transaction.
func EnqueueEntTx(ctx context.Context, tx *ent.Tx, kind, key string, payload json.RawMessage) (string, error) {
	if tx == nil {
		return "", errors.New("job requires an active Ent transaction")
	}
	return enqueue(ctx, tx, kind, key, payload)
}

type executor interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}

func enqueue(ctx context.Context, tx executor, kind, key string, payload json.RawMessage) (_ string, resultErr error) {
	if tx == nil || !regexp.MustCompile(`^[a-z][a-z0-9_.]{0,63}$`).MatchString(kind) || len(key) == 0 || len(key) > 160 || len(payload) > 16<<10 {
		return "", errors.New("invalid job request")
	}
	var value any
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	if err := decoder.Decode(&value); err != nil {
		return "", errors.New("invalid job JSON")
	}
	var trailing any
	if trailingErr := decoder.Decode(&trailing); !errors.Is(trailingErr, io.EOF) {
		return "", errors.New("invalid trailing job JSON")
	}
	canonical, err := json.Marshal(value)
	if err != nil {
		return "", fmt.Errorf("canonical job payload: %w", err)
	}
	digest := fmt.Sprintf("%x", sha256.Sum256(append([]byte(kind+"\n"), canonical...)))
	id := rand.Text()
	_, err = tx.ExecContext(ctx, `INSERT INTO jobs (id,kind,idempotency_key,payload,request_hash,available_at,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE id=id`, id, kind, key, string(canonical), digest)
	if err != nil {
		return "", fmt.Errorf("enqueue job: %w", err)
	}
	rows, queryErr := tx.QueryContext(ctx, "SELECT id,request_hash FROM jobs WHERE idempotency_key=?", key)
	if queryErr != nil {
		return "", fmt.Errorf("read job idempotency: %w", queryErr)
	}
	defer func() { resultErr = errors.Join(resultErr, rows.Close()) }()
	if !rows.Next() {
		return "", errors.Join(errors.New("enqueued job missing"), rows.Err())
	}
	var actualID, actualDigest string
	if scanErr := rows.Scan(&actualID, &actualDigest); scanErr != nil {
		return "", scanErr
	}
	if actualDigest != digest {
		return "", ErrConflict
	}
	return actualID, nil
}

// Claim returns a leased job, or nil when no due job can be claimed.
func (s *Store) Claim(ctx context.Context) (*Job, error) {
	if _, err := s.db.ExecContext(ctx, `UPDATE jobs SET state='failed', owner=NULL, lease_until=NULL, last_error='lease_exhausted' WHERE state='running' AND lease_until<UTC_TIMESTAMP(6) AND attempts>=max_attempts`); err != nil {
		return nil, fmt.Errorf("retire exhausted leases: %w", err)
	}
	ids, err := s.candidates(ctx)
	if err != nil {
		return nil, err
	}
	for _, id := range ids {
		owner := rand.Text()
		result, claimErr := s.db.ExecContext(ctx, `UPDATE jobs SET state='running',owner=?,lease_until=DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 30 SECOND),attempts=attempts+1 WHERE id=? AND attempts<max_attempts AND ((state='pending' AND available_at<=UTC_TIMESTAMP(6)) OR (state='running' AND lease_until<UTC_TIMESTAMP(6)))`, owner, id)
		if claimErr != nil {
			return nil, fmt.Errorf("claim job: %w", claimErr)
		}
		count, countErr := result.RowsAffected()
		if countErr != nil {
			return nil, countErr
		}
		if count != 1 {
			continue
		}
		job := &Job{ID: id, Owner: owner}
		if scanErr := s.db.QueryRowContext(ctx, "SELECT kind,payload,attempts FROM jobs WHERE id=? AND owner=? AND state='running'", id, owner).Scan(&job.Kind, &job.Payload, &job.Attempts); scanErr != nil {
			return nil, fmt.Errorf("read leased job: %w", scanErr)
		}
		return job, nil
	}
	return nil, nil // No due work is a normal queue result, not a failed lease.
}

func (s *Store) candidates(ctx context.Context) (_ []string, resultErr error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id FROM jobs WHERE attempts<max_attempts AND ((state='pending' AND available_at<=UTC_TIMESTAMP(6)) OR (state='running' AND lease_until<UTC_TIMESTAMP(6))) ORDER BY available_at,id LIMIT 16`)
	if err != nil {
		return nil, fmt.Errorf("find due jobs: %w", err)
	}
	defer func() { resultErr = errors.Join(resultErr, rows.Close()) }()
	ids := make([]string, 0, 16)
	for rows.Next() {
		var id string
		if scanErr := rows.Scan(&id); scanErr != nil {
			return nil, scanErr
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// Renew extends only a currently valid owner lease.
func (s *Store) Renew(ctx context.Context, job *Job) error {
	result, err := s.db.ExecContext(ctx, "UPDATE jobs SET lease_until=DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 30 SECOND) WHERE id=? AND owner=? AND state='running' AND lease_until>UTC_TIMESTAMP(6)", job.ID, job.Owner)
	return checkLease(result, err)
}

// Complete acknowledges only the worker still holding a valid lease.
func (s *Store) Complete(ctx context.Context, job *Job) error {
	result, err := s.db.ExecContext(ctx, "UPDATE jobs SET state='complete',owner=NULL,lease_until=NULL,last_error=NULL WHERE id=? AND owner=? AND state='running' AND lease_until>UTC_TIMESTAMP(6)", job.ID, job.Owner)
	return checkLease(result, err)
}

// Fail records a safe error code and bounded exponential retry; never error text.
func (s *Store) Fail(ctx context.Context, job *Job) error {
	delay := 1 << max(0, min(job.Attempts, 10))
	result, err := s.db.ExecContext(ctx, `UPDATE jobs SET state=IF(attempts>=max_attempts,'failed','pending'),owner=NULL,lease_until=NULL,last_error='handler_failed',available_at=DATE_ADD(UTC_TIMESTAMP(6), INTERVAL ? SECOND) WHERE id=? AND owner=? AND state='running' AND lease_until>UTC_TIMESTAMP(6)`, delay, job.ID, job.Owner)
	return checkLease(result, err)
}

func checkLease(result sql.Result, err error) error {
	if err != nil {
		return fmt.Errorf("update job lease: %w", err)
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count != 1 {
		return ErrLeaseLost
	}
	return nil
}
