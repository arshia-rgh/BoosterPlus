//go:build integration

package integration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"log/slog"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

func queueDB(t *testing.T) *sql.DB {
	t.Helper()
	db := testDB(t)
	if err := runner(t, db).Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	return db
}
func enqueue(t *testing.T, db *sql.DB, key string) string {
	t.Helper()
	tx, err := db.BeginTx(t.Context(), nil)
	if err != nil {
		t.Fatal(err)
	}
	id, enqueueErr := jobs.EnqueueTx(t.Context(), tx, "system.ping", key, json.RawMessage(`{"reference":9007199254740993}`))
	if enqueueErr != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			t.Error(rollbackErr)
		}
		t.Fatal(enqueueErr)
	}
	if commitErr := tx.Commit(); commitErr != nil {
		t.Fatal(commitErr)
	}
	return id
}
func executeSQL(t *testing.T, db *sql.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.ExecContext(t.Context(), query, args...); err != nil {
		t.Fatal(err)
	}
}
func claim(t *testing.T, store *jobs.Store) *jobs.Job {
	t.Helper()
	job, err := store.Claim(t.Context())
	if err != nil || job == nil {
		t.Fatalf("claim %v %v", job, err)
	}
	return job
}
func TestQueueTransactionAndIdempotency(t *testing.T) {
	db := queueDB(t)
	id := enqueue(t, db, "repeat")
	if duplicate := enqueue(t, db, "repeat"); duplicate != id {
		t.Fatal("duplicate created")
	}
	tx, err := db.BeginTx(t.Context(), nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, conflictErr := jobs.EnqueueTx(t.Context(), tx, "system.ping", "repeat", json.RawMessage(`{}`)); !errors.Is(conflictErr, jobs.ErrConflict) {
		t.Error("conflicting key accepted", conflictErr)
	}
	if _, enqueueErr := jobs.EnqueueTx(t.Context(), tx, "system.ping", "rollback", json.RawMessage(`{}`)); enqueueErr != nil {
		t.Error(enqueueErr)
	}
	if rollbackErr := tx.Rollback(); rollbackErr != nil {
		t.Fatal(rollbackErr)
	}
	var count int
	if countErr := db.QueryRowContext(t.Context(), "SELECT COUNT(*) FROM jobs").Scan(&count); countErr != nil || count != 1 {
		t.Fatalf("rollback failed %d %v", count, countErr)
	}
	var payload string
	if payloadErr := db.QueryRowContext(t.Context(), "SELECT JSON_UNQUOTE(JSON_EXTRACT(payload,'$.reference')) FROM jobs WHERE id=?", id).Scan(&payload); payloadErr != nil || payload != "9007199254740993" {
		t.Fatalf("JSON precision lost %s %v", payload, payloadErr)
	}
}
func TestConcurrentQueueClaimAndFencing(t *testing.T) {
	db := queueDB(t)
	enqueue(t, db, "concurrent")
	store := jobs.New(db)
	var winners atomic.Int64
	var wait sync.WaitGroup
	for range 12 {
		wait.Go(func() {
			job, err := store.Claim(t.Context())
			if err != nil {
				t.Error(err)
			}
			if job != nil {
				winners.Add(1)
			}
		})
	}
	wait.Wait()
	if winners.Load() != 1 {
		t.Fatal("multiple claim winners", winners.Load())
	}
	executeSQL(t, db, "UPDATE jobs SET lease_until=DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 1 SECOND)")
	old := claim(t, store)
	if err := store.Renew(t.Context(), old); err != nil {
		t.Fatal(err)
	}
	executeSQL(t, db, "UPDATE jobs SET lease_until=DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 1 SECOND)")
	current := claim(t, store)
	if current.Owner == old.Owner {
		t.Fatal("owner token reused")
	}
	for _, operation := range []func(context.Context, *jobs.Job) error{store.Complete, store.Fail, store.Renew} {
		if err := operation(t.Context(), old); !errors.Is(err, jobs.ErrLeaseLost) {
			t.Error("stale owner accepted", err)
		}
	}
	if err := store.Complete(t.Context(), current); err != nil {
		t.Fatal(err)
	}
	if next, err := store.Claim(t.Context()); err != nil || next != nil {
		t.Fatal("completed job redelivered", err)
	}
}
func TestRetryAndExhaustion(t *testing.T) {
	for _, expired := range []bool{false, true} {
		t.Run(map[bool]string{false: "handler", true: "lease"}[expired], func(t *testing.T) {
			db := queueDB(t)
			enqueue(t, db, "retry")
			store := jobs.New(db)
			job := claim(t, store)
			if err := store.Fail(t.Context(), job); err != nil {
				t.Fatal(err)
			}
			if next, err := store.Claim(t.Context()); err != nil || next != nil {
				t.Fatal("backoff ignored", err)
			}
			executeSQL(t, db, "UPDATE jobs SET available_at=DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 1 SECOND), attempts=4")
			job = claim(t, store)
			if expired {
				executeSQL(t, db, "UPDATE jobs SET lease_until=DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 1 SECOND)")
				if next, err := store.Claim(t.Context()); err != nil || next != nil {
					t.Fatal("exhausted lease redelivered", err)
				}
			} else if err := store.Fail(t.Context(), job); err != nil {
				t.Fatal(err)
			}
			var state string
			if err := db.QueryRowContext(t.Context(), "SELECT state FROM jobs").Scan(&state); err != nil || state != "failed" {
				t.Fatal("job not dead-lettered", state, err)
			}
		})
	}
}
func TestWorkerSuccessPanicUnknownAndCancellation(t *testing.T) {
	for _, kind := range []string{"success", "panic", "unknown", "cancel"} {
		t.Run(kind, func(t *testing.T) {
			db := queueDB(t)
			enqueue(t, db, "worker")
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			handlers := map[string]jobs.Handler{}
			if kind != "unknown" {
				handlers["system.ping"] = func(work context.Context, _ jobs.Job) error {
					switch kind {
					case "panic":
						panic("private handler details")
					case "cancel":
						cancel()
						<-work.Done()
						return work.Err()
					default:
						return nil
					}
				}
			}
			done := make(chan error, 1)
			go func() { done <- jobs.Run(ctx, jobs.New(db), handlers, slog.New(slog.DiscardHandler)) }()
			target := "complete"
			if kind == "panic" || kind == "unknown" {
				target = "pending"
			}
			if kind == "cancel" {
				target = "running"
			}
			deadline := time.NewTimer(5 * time.Second)
			defer deadline.Stop()
			poll := time.NewTicker(20 * time.Millisecond)
			defer poll.Stop()
			for {
				var state string
				var attempts int
				if err := db.QueryRowContext(t.Context(), "SELECT state,attempts FROM jobs").Scan(&state, &attempts); err != nil {
					t.Fatal(err)
				}
				if state == target && attempts > 0 {
					break
				}
				select {
				case <-deadline.C:
					t.Fatal("worker did not reach expected state", state)
				case <-poll.C:
				}
			}
			cancel()
			select {
			case err := <-done:
				if err != nil {
					t.Fatal(err)
				}
			case <-time.After(time.Second):
				t.Fatal("worker did not stop")
			}
		})
	}
}
func TestReadinessDetectsMissingAndDriftedSchema(t *testing.T) {
	db := testDB(t)
	if err := database.Ready(t.Context(), db); err == nil {
		t.Fatal("empty schema ready")
	}
	if err := runner(t, db).Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err != nil {
		t.Fatal(err)
	}
	executeSQL(t, db, "ALTER TABLE jobs DROP COLUMN payload")
	if err := database.Ready(t.Context(), db); err == nil {
		t.Fatal("drifted schema ready")
	}
}

func TestReadinessRejectsLostUniqueIndex(t *testing.T) {
	db := queueDB(t)
	executeSQL(t, db, "ALTER TABLE jobs DROP INDEX jobs_idempotency_key")
	if err := database.Ready(t.Context(), db); err == nil {
		t.Fatal("readiness accepted loss of job idempotency constraint")
	}
}

func TestEntBusinessChangeAndOutboxRollbackTogether(t *testing.T) {
	db := queueDB(t)
	client := ent.NewClient(ent.Driver(entsql.OpenDB(dialect.MySQL, db)))
	tx, err := client.Tx(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if _, createErr := tx.User.Create().SetEmail("outbox@example.test").Save(t.Context()); createErr != nil {
		t.Error(createErr)
	}
	if _, enqueueErr := jobs.EnqueueEntTx(t.Context(), tx, "system.ping", "ent-transaction", json.RawMessage(`{}`)); enqueueErr != nil {
		t.Error(enqueueErr)
	}
	if rollbackErr := tx.Rollback(); rollbackErr != nil {
		t.Fatal(rollbackErr)
	}
	count, countErr := client.User.Query().Count(t.Context())
	if countErr != nil || count != 0 {
		t.Fatal("business rollback failed", countErr)
	}
	job, claimErr := jobs.New(db).Claim(t.Context())
	if claimErr != nil || job != nil {
		t.Fatal("outbox escaped business rollback", claimErr)
	}
}
