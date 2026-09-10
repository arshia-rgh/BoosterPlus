//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/operations"
)

func TestOperationsRetryAuthorityConcurrencyAndGeneration(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	s := operations.New(f.auth.client, f.auth.service, nil)
	id := enqueue(t, f.auth.db, "operations-retry")
	executeSQL(t, f.auth.db, "UPDATE jobs SET state='failed',attempts=max_attempts,last_error='handler_failed' WHERE id=?", id)
	input := operations.RetryInput{Generation: 0, Reason: "Worker connectivity repaired and repeat execution reviewed."}
	for _, p := range []*identity.Principal{f.buyer, f.other} {
		if _, e := s.ListJobs(ctx, p, "failed", "", ""); e == nil {
			t.Fatal("customer inspected queue")
		}
		if _, e := s.Retry(ctx, p, id, input); e == nil {
			t.Fatal("customer retried task")
		}
	}
	old := time.Unix(f.auth.clock.Load(), 0).Add(-11 * time.Minute)
	executeSQL(t, f.auth.db, "UPDATE auth_sessions SET authenticated_at=? WHERE id=?", old, f.admin.Session.ID)
	if _, e := s.Retry(ctx, f.admin, id, input); e == nil {
		t.Fatal("stale primary retry")
	}
	executeSQL(t, f.auth.db, "UPDATE auth_sessions SET authenticated_at=?,mfa_verified_at=? WHERE id=?", time.Unix(f.auth.clock.Load(), 0), old, f.admin.Session.ID)
	if _, e := s.Retry(ctx, f.admin, id, input); e == nil {
		t.Fatal("stale authenticator retry")
	}
	executeSQL(t, f.auth.db, "UPDATE auth_sessions SET mfa_verified_at=? WHERE id=?", time.Unix(f.auth.clock.Load(), 0), f.admin.Session.ID)
	var winners atomic.Int64
	var wg sync.WaitGroup
	for range 4 {
		wg.Go(func() {
			if _, e := s.Retry(ctx, f.admin, id, input); e == nil {
				winners.Add(1)
			} else if !errors.Is(e, operations.ErrConflict) {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	if winners.Load() != 1 {
		t.Fatal("duplicate retries", winners.Load())
	}
	var state, payload string
	var generation, attempts int
	if e := f.auth.db.QueryRowContext(ctx, "SELECT state,payload,retry_generation,attempts FROM jobs WHERE id=?", id).Scan(&state, &payload, &generation, &attempts); e != nil {
		t.Fatal(e)
	}
	if state != "pending" || generation != 1 || attempts != 0 || !strings.Contains(payload, "9007199254740993") {
		t.Fatal("retry changed payload or invalid generation")
	}
	executeSQL(t, f.auth.db, "UPDATE jobs SET state='failed',attempts=max_attempts,last_error='handler_failed' WHERE id=?", id)
	if _, e := s.Retry(ctx, f.admin, id, input); !errors.Is(e, operations.ErrConflict) {
		t.Fatal("old generation retried a later failure", e)
	}
	input.Generation = 1
	if _, e := s.Retry(ctx, f.admin, id, input); e != nil {
		t.Fatal(e)
	}
	// Completion still uses the worker's existing lease fence after manual recovery.
	q := jobs.New(f.auth.db)
	job := claim(t, q)
	if job.ID != id {
		t.Fatal("unexpected task claimed")
	}
	if e := q.Complete(ctx, job); e != nil {
		t.Fatal(e)
	}
	if _, e := s.Retry(ctx, f.admin, id, operations.RetryInput{Generation: 2, Reason: input.Reason}); !errors.Is(e, operations.ErrConflict) {
		t.Fatal("completed task retried", e)
	}
}
func TestOperationsProjectionFiltersAndAuditRollback(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	s := operations.New(f.auth.client, f.auth.service, nil)
	secret := "Private synthetic payload must never appear in task views"
	tx, e := f.auth.db.BeginTx(ctx, nil)
	if e != nil {
		t.Fatal(e)
	}
	id, e := jobs.EnqueueTx(ctx, tx, "system.ping", "operations-private", json.RawMessage(`{"private":"`+secret+`"}`))
	if e != nil {
		t.Fatal(e)
	}
	if e = tx.Commit(); e != nil {
		t.Fatal(e)
	}
	executeSQL(t, f.auth.db, "UPDATE jobs SET state='failed',attempts=max_attempts,last_error='private-exception-text' WHERE id=?", id)
	page, e := s.ListJobs(ctx, f.admin, "failed", "system.ping", "")
	if e != nil || len(page.Items) != 1 {
		t.Fatal("queue listing", e)
	}
	raw, e := json.Marshal(page)
	if e != nil {
		t.Fatal(e)
	}
	for _, private := range []string{secret, "operations-private", "private-exception-text", "request_hash", "payload", "owner"} {
		if strings.Contains(string(raw), private) {
			t.Fatal("private task data exposed")
		}
	}
	if page.Items[0].ErrorCode != "internal_error" {
		t.Fatal("unknown error not normalized")
	}
	for _, bad := range []string{"invalid", "pending' OR 1=1--"} {
		if _, e = s.ListJobs(ctx, f.admin, bad, "", ""); !errors.Is(e, operations.ErrInvalid) {
			t.Fatal("unsafe state filter", e)
		}
	}
	if _, e = s.ListJobs(ctx, f.admin, "failed", "", "invalid!"); !errors.Is(e, operations.ErrInvalid) {
		t.Fatal("invalid cursor", e)
	}
	executeSQL(t, f.auth.db, "DROP TABLE auth_audits")
	if _, e = s.Retry(ctx, f.admin, id, operations.RetryInput{Generation: 0, Reason: "Investigated synthetic failure"}); e == nil {
		t.Fatal("audit failure did not stop retry")
	}
	var state string
	var generation int
	if e = f.auth.db.QueryRowContext(ctx, "SELECT state,retry_generation FROM jobs WHERE id=?", id).Scan(&state, &generation); e != nil || state != "failed" || generation != 0 {
		t.Fatal("retry did not roll back", e)
	}
}

func TestOperationsOverviewAndBoundedQueuePagination(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	s := operations.New(f.auth.client, f.auth.service, nil)
	request := f.create(t, "custom")
	for i := range 55 {
		id := enqueue(t, f.auth.db, fmt.Sprintf("operations-page-%d", i))
		executeSQL(t, f.auth.db, "UPDATE jobs SET state='failed',attempts=max_attempts,last_error='handler_failed' WHERE id=?", id)
	}
	page, e := s.ListJobs(ctx, f.admin, "failed", "", "")
	if e != nil || len(page.Items) != 50 || page.Next == "" {
		t.Fatal("first page", e)
	}
	rest, e := s.ListJobs(ctx, f.admin, "failed", "", page.Next)
	if e != nil || len(rest.Items) != 5 || rest.Next != "" {
		t.Fatal("second page", e)
	}
	seen := map[string]bool{}
	for _, v := range append(page.Items, rest.Items...) {
		if seen[v.ID] {
			t.Fatal("duplicate pagination row")
		}
		seen[v.ID] = true
	}
	overview, e := s.Overview(ctx, f.admin)
	if e != nil {
		t.Fatal(e)
	}
	counts := map[string]int{}
	for _, card := range overview.Cards {
		counts[card.Key] = card.Count
	}
	if counts["requests"] != 1 || counts["failed_jobs"] != 55 || len(overview.Jobs) != 6 || len(overview.Requests) != 1 || overview.Requests[0].Href != "/admin/orders/"+request.Order.ID {
		t.Fatal("overview definitions or bounds incorrect")
	}
	raw, e := json.Marshal(overview)
	if e != nil {
		t.Fatal(e)
	}
	if strings.Contains(string(raw), f.buyer.User.Email) || strings.Contains(string(raw), "ordinary customer note") || strings.Contains(string(raw), "amount_minor") {
		t.Fatal("dashboard exposed unnecessary private or financial data")
	}
	for _, p := range []*identity.Principal{f.buyer, f.other} {
		if _, e = s.Overview(ctx, p); e == nil {
			t.Fatal("customer dashboard access")
		}
	}
	executeSQL(t, f.auth.db, "UPDATE users SET suspended=1 WHERE id=?", f.admin.User.ID)
	if _, e = s.Overview(ctx, f.admin); e == nil {
		t.Fatal("suspended administrator dashboard access")
	}
}
