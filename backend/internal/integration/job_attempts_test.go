//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/operations"
)

func TestRecordedJobAttemptsFencingRetryAndPrivateHistory(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	executeSQL(t, f.auth.db, "UPDATE jobs SET available_at=DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 1 DAY)")
	id := enqueue(t, f.auth.db, "attempt-history")
	queue := jobs.New(f.auth.db)
	ops := operations.New(f.auth.client, f.auth.service, nil)
	first := claim(t, queue)
	if first.ID != id {
		t.Fatal("unexpected job")
	}
	if err := queue.Fail(ctx, first); err != nil {
		t.Fatal(err)
	}
	executeSQL(t, f.auth.db, "UPDATE jobs SET available_at=UTC_TIMESTAMP(6) WHERE id=?", id)
	second := claim(t, queue)
	executeSQL(t, f.auth.db, "UPDATE jobs SET lease_until=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE id=?", id)
	third := claim(t, queue)
	if err := queue.Complete(ctx, second); !errors.Is(err, jobs.ErrLeaseLost) {
		t.Fatal("stale lease modified attempt", err)
	}
	if err := queue.Complete(ctx, third); err != nil {
		t.Fatal(err)
	}
	history, err := ops.Attempts(ctx, f.admin, id, "")
	if err != nil || len(history.Items) != 3 {
		t.Fatal("history", err)
	}
	for i, want := range []string{"complete", "lease_expired", "handler_failed"} {
		if history.Items[i].Outcome != want || history.Items[i].FinishedAt == nil {
			t.Fatalf("attempt %d missing terminal outcome", i)
		}
	}
	if _, err = ops.Attempts(ctx, f.buyer, id, ""); err == nil {
		t.Fatal("customer read staff history")
	}
	if _, err = ops.Attempts(ctx, f.admin, id, "bad:cursor"); err == nil {
		t.Fatal("invalid cursor accepted")
	}
	raw, err := json.Marshal(history)
	if err != nil {
		t.Fatal(err)
	}
	for _, secret := range []string{first.Owner, second.Owner, third.Owner, "9007199254740993", "payload", "request_hash"} {
		if strings.Contains(string(raw), secret) {
			t.Fatal("private queue data in history")
		}
	}
	executeSQL(t, f.auth.db, "UPDATE jobs SET state='failed' WHERE id=?", id)
	if _, err = ops.Retry(ctx, f.admin, id, operations.RetryInput{Generation: 0, Reason: "Fixture retry investigation"}); err != nil {
		t.Fatal(err)
	}
	next := claim(t, queue)
	if err = queue.Complete(ctx, next); err != nil {
		t.Fatal(err)
	}
	history, err = ops.Attempts(ctx, f.admin, id, "")
	if err != nil || len(history.Items) != 4 || history.Items[0].Generation != 1 || history.Items[0].Number != 1 {
		t.Fatal("retry erased prior attempts", err)
	}
	// Fill distinct old generations to exercise the bounded cursor without issuing work.
	for n := 2; n < 55; n++ {
		executeSQL(t, f.auth.db, "INSERT INTO job_attempts(job_id,retry_generation,attempt,outcome,started_at,finished_at) VALUES(?,?,1,'complete',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", id, n)
	}
	page, err := ops.Attempts(ctx, f.admin, id, "")
	if err != nil || len(page.Items) != 50 || page.Next == "" {
		t.Fatal("history page", err)
	}
	older, err := ops.Attempts(ctx, f.admin, id, page.Next)
	if err != nil || len(older.Items) != 7 || older.Next != "" {
		t.Fatal("history continuation", err)
	}
	if page.Items[49].Generation <= older.Items[0].Generation {
		t.Fatal("history cursor overlaps")
	}
}

func TestJobAttemptWriteFailureRollsBackQueueState(t *testing.T) {
	db := queueDB(t)
	ctx := t.Context()
	id := enqueue(t, db, "attempt-atomicity")
	queue := jobs.New(db)
	executeSQL(t, db, "INSERT INTO job_attempts(job_id,retry_generation,attempt,outcome,started_at) VALUES(?,0,1,'running',UTC_TIMESTAMP(6))", id)
	if _, err := queue.Claim(ctx); err == nil {
		t.Fatal("duplicate history did not reject claim")
	}
	var state string
	var attempts int
	if err := db.QueryRowContext(ctx, "SELECT state,attempts FROM jobs WHERE id=?", id).Scan(&state, &attempts); err != nil || state != "pending" || attempts != 0 {
		t.Fatal("history failure left claimed work", err)
	}
	executeSQL(t, db, "DELETE FROM job_attempts WHERE job_id=?", id)
	job := claim(t, queue)
	executeSQL(t, db, "RENAME TABLE job_attempts TO isolated_attempt_history_failure")
	err := queue.Complete(ctx, job)
	executeSQL(t, db, "RENAME TABLE isolated_attempt_history_failure TO job_attempts")
	if err == nil {
		t.Fatal("missing history store accepted completion")
	}
	if err = db.QueryRowContext(ctx, "SELECT state FROM jobs WHERE id=?", id).Scan(&state); err != nil || state != "running" {
		t.Fatal("failed history write committed completion", err)
	}
	if err = queue.Complete(ctx, job); err != nil {
		t.Fatal(err)
	}
}
