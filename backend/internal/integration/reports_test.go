//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reports"
)

func reportQuery(kind string) reports.Query {
	return reports.Query{Kind: kind, From: "2000-01-01T00:00:00Z", To: "2100-01-01T00:00:00Z"}
}
func TestReportsAuthorityPrivacyAndExactPreview(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	purchase := f.create(t, "custom")
	s := reports.New(f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	q := reportQuery("orders")
	q.Search = purchase.Order.ID
	for _, p := range []*identity.Principal{f.buyer, f.other, nil} {
		if _, e := s.Preview(ctx, p, q); e == nil {
			t.Fatal("unprivileged report")
		}
	}
	preview, e := s.Preview(ctx, f.admin, q)
	if e != nil || preview.Count != 1 || preview.Rows[0][0] != purchase.Order.ID {
		t.Fatal("order report", e)
	}
	raw, e := json.Marshal(preview)
	if e != nil {
		t.Fatal(e)
	}
	for _, private := range []string{f.buyer.User.Email, f.buyer.User.ID, "ordinary customer note", "answers", "snapshot", "request_hash", "request_key", "mfa_secret"} {
		if strings.Contains(string(raw), private) {
			t.Fatal("private report projection", private)
		}
	}
	exported, e := s.Download(ctx, f.admin, reports.ExportInput{Query: q, Digest: preview.Digest, Reason: "Review operational intake"})
	if e != nil || exported.Report.Digest != preview.Digest || exported.AuditID == "" {
		t.Fatal("audited exact download", e)
	}
	audit, e := f.auth.client.AuthAudit.Get(ctx, exported.AuditID)
	if e != nil || audit.Action != "report_export" || audit.ActorID != f.admin.User.ID || audit.Metadata["reason"] != "Review operational intake" {
		t.Fatal("missing export audit", e)
	}
	if _, e = f.auth.client.Order.UpdateOneID(purchase.Order.ID).SetState(order.StateNeedsInformation).AddVersion(1).Save(ctx); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Download(ctx, f.admin, reports.ExportInput{Query: q, Digest: preview.Digest, Reason: "Stale review"}); !errors.Is(e, reports.ErrConflict) {
		t.Fatal("export ignored changed preview", e)
	}
	if n, countErr := f.auth.client.AuthAudit.Query().Where(authaudit.ActionEQ("report_export")).Count(ctx); countErr != nil || n != 1 {
		t.Fatal("failed export audited as successful", countErr)
	}
	if _, e = s.Preview(ctx, f.admin, reportQuery("audits")); !errors.Is(e, identity.ErrForbidden) {
		t.Fatal("admin read owner audit report", e)
	}
	executeSQL(t, f.auth.db, "UPDATE auth_sessions SET authenticated_at=?,mfa_verified_at=? WHERE id=?", time.Unix(f.auth.clock.Load(), 0).Add(-11*time.Minute), time.Unix(f.auth.clock.Load(), 0).Add(-11*time.Minute), f.admin.Session.ID)
	current, e := s.Preview(ctx, f.admin, q)
	if e != nil {
		t.Fatal("stale primary should still preview", e)
	}
	if _, e = s.Download(ctx, f.admin, reports.ExportInput{Query: q, Digest: current.Digest, Reason: "Requires recent verification"}); !errors.Is(e, identity.ErrRecent) {
		t.Fatal("stale primary exported", e)
	}
	executeSQL(t, f.auth.db, "UPDATE auth_sessions SET authenticated_at=?,mfa_verified_at=? WHERE id=?", time.Unix(f.auth.clock.Load(), 0), time.Unix(f.auth.clock.Load(), 0).Add(-11*time.Minute), f.admin.Session.ID)
	if _, e = s.Download(ctx, f.admin, reports.ExportInput{Query: q, Digest: current.Digest, Reason: "Fresh primary verification allows export"}); e != nil {
		t.Fatal("fresh email factor did not authorize export", e)
	}
}
func TestReportsPaginationFilterBindingAndPlainData(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	s := reports.New(f.auth.service, nil)
	// Direct synthetic catalog fixtures provide stable pagination without real catalog publication.
	for i := range 105 {
		if _, e := f.auth.client.Game.Create().SetSlug("report-" + uuid.NewString()).SetName("=HYPERLINK(\"https://example.invalid\")\nsynthetic " + strings.Repeat("x", i%3)).SetConfiguration(map[string]any{"private": "must not appear"}).SetCreatedAt(time.Date(2025, 1, 1, 0, 0, i, 0, time.UTC)).Save(ctx); e != nil {
			t.Fatal(e)
		}
	}
	q := reportQuery("catalog")
	q.Search = "report-"
	first, e := s.Preview(ctx, f.admin, q)
	if e != nil || first.Count != 100 || first.Next == "" {
		t.Fatal("first report page", e)
	}
	q.After = first.Next
	second, e := s.Preview(ctx, f.admin, q)
	if e != nil || second.Count != 5 || second.Next != "" {
		t.Fatal("second report page", e)
	}
	seen := map[string]bool{}
	for _, page := range []reports.Report{first, second} {
		for _, row := range page.Rows {
			if len(row) != len(page.Columns) || seen[row[0]] {
				t.Fatal("duplicate or malformed row")
			}
			seen[row[0]] = true
		}
	}
	q.Search = "different"
	if _, e = s.Preview(ctx, f.admin, q); !errors.Is(e, reports.ErrInvalid) {
		t.Fatal("cursor not bound to filters", e)
	}
	data, e := json.Marshal(first)
	if e != nil {
		t.Fatal(e)
	}
	if strings.Contains(string(data), "must not appear") {
		t.Fatal("draft payload leaked")
	}
	var decoded reports.Report
	if e = json.Unmarshal(data, &decoded); e != nil || decoded.Rows[0][3] != first.Rows[0][3] {
		t.Fatal("text not preserved as inert JSON", e)
	}
	for _, bad := range []reports.Query{{Kind: "unknown", From: q.From, To: q.To}, {Kind: "orders", From: q.To, To: q.From}, {Kind: "staff", From: "2025-01-01T00:00:00+03:30", To: q.To}, {Kind: "catalog", From: q.From, To: q.To, State: "fake"}, {Kind: "orders", From: q.From, To: q.To, After: "bad"}, {Kind: "orders", From: q.From, To: q.To, Search: strings.Repeat("a", 81)}} {
		if _, err := s.Preview(ctx, f.admin, bad); !errors.Is(err, reports.ErrInvalid) {
			t.Fatal("invalid filter", err)
		}
	}
}
func TestReportsOwnerAuditAndRollback(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	s := reports.New(f.auth.service, nil)
	if _, e := f.auth.client.User.UpdateOneID(f.admin.User.ID).SetRole(identity.RoleOwner).Save(ctx); e != nil {
		t.Fatal(e)
	}
	owner := f.auth.principalFromSession(t, f.admin)
	q := reportQuery("audits")
	q.Search = "catalog"
	preview, e := s.Preview(ctx, owner, q)
	if e != nil || preview.Count == 0 {
		t.Fatal("owner audit preview", e)
	}
	for _, row := range preview.Rows {
		if len(row) != 6 {
			t.Fatal("unexpected audit metadata")
		}
	}
	if _, e = s.Download(ctx, owner, reports.ExportInput{Query: q, Digest: preview.Digest, Reason: "Owner audit review"}); e != nil {
		t.Fatal(e)
	}
	staffQuery := reportQuery("staff")
	staffQuery.Search = owner.User.ID
	staff, e := s.Preview(ctx, owner, staffQuery)
	if e != nil || staff.Count != 1 || staff.Rows[0][3] != identity.RoleOwner {
		t.Fatal("staff projection", e)
	}
	executeSQL(t, f.auth.db, "DROP TABLE auth_audits")
	if _, e = s.Download(ctx, owner, reports.ExportInput{Query: staffQuery, Digest: staff.Digest, Reason: "Must fail closed"}); e == nil {
		t.Fatal("download returned without audit")
	}
	if _, e = f.auth.client.User.UpdateOneID(owner.User.ID).SetSuspended(true).Save(ctx); e != nil {
		t.Fatal(e)
	}
	if _, e = s.Preview(ctx, owner, staffQuery); e == nil {
		t.Fatal("suspended owner exported")
	}
}
