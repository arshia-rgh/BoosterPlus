//go:build integration

package integration

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestAuditDirectoryExactFiltersPaginationAndCurrentAuthority(t *testing.T) {
	f := orderDB(t)
	owner := privacyOwner(t, f)
	ctx := t.Context()
	_, admin := f.auth.login(t, "audit-admin@example.test")
	if _, err := f.auth.client.User.UpdateOneID(admin.User.ID).SetRole(identity.RoleAdmin).Save(ctx); err != nil {
		t.Fatal(err)
	}
	admin = f.auth.enterPortal(t, admin, identity.PortalAdmin)
	_, _, admin = f.auth.enroll(t, admin)
	now := time.Unix(f.auth.clock.Load(), 0).UTC()
	for i := range 105 {
		_, err := f.auth.client.AuthAudit.Create().SetID(fmt.Sprintf("review-fixture-%03d", i)).SetActorID(owner.User.ID).SetAction("synthetic.review").SetTargetID("synthetic-target").SetMetadata(map[string]string{}).SetCreatedAt(now).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
	}
	query := identity.AuditQuery{Actor: owner.User.ID, Action: "synthetic.review", Target: "synthetic-target", From: now.Format("2006-01-02"), To: now.Format("2006-01-02")}
	first, err := f.auth.service.ListAudits(ctx, owner, query)
	if err != nil || len(first.Entries) != 100 || first.Next == "" {
		t.Fatal("first filtered audit page", err)
	}
	query.After = first.Next
	second, err := f.auth.service.ListAudits(ctx, owner, query)
	if err != nil || len(second.Entries) != 5 || second.Next != "" {
		t.Fatal("second filtered audit page", err)
	}
	seen := map[string]bool{}
	for _, row := range first.Entries {
		seen[row.ID] = true
	}
	for _, row := range second.Entries {
		if seen[row.ID] {
			t.Fatal("duplicate cursor row")
		}
	}
	query.After = ""
	query.Action = "synthetic"
	empty, err := f.auth.service.ListAudits(ctx, owner, query)
	if err != nil || len(empty.Entries) != 0 {
		t.Fatal("audit action was not exact", err)
	}
	if _, err = f.auth.service.ListAudits(ctx, admin, identity.AuditQuery{}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("non-owner audit access", err)
	}
	if _, err = f.auth.service.ListAudits(ctx, f.buyer, identity.AuditQuery{}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer audit access", err)
	}
	for _, invalid := range []identity.AuditQuery{{After: "not-a-cursor"}, {From: "2030-01-01", To: "2020-01-01"}, {Action: "bad\x00value"}, {From: "not-a-date"}} {
		if _, err = f.auth.service.ListAudits(ctx, owner, invalid); !errors.Is(err, identity.ErrInvalid) {
			t.Fatal("invalid audit query", err)
		}
	}
	if err = f.auth.service.RevokeUserSessions(ctx, owner, owner.User.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.service.ListAudits(ctx, owner, identity.AuditQuery{}); err == nil {
		t.Fatal("revoked owner retained audit access")
	}
}
