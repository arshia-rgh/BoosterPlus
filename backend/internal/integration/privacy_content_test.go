//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

func retentionData() map[string]any {
	return map[string]any{"enabled": true, "financial_days": 0, "dispute_days": 0, "audit_days": 0, "support_days": 0, "grace_days": 0, "policy_text": "Synthetic owner-approved retention policy for isolated tests only. Financial agreements and audit evidence remain preserved.", "backup_policy": "Synthetic isolated databases have no backups; no production deletion is asserted.", "preserve_evidence": true}
}
func privacyOwner(t *testing.T, f *orderFixture) *identity.Principal {
	t.Helper()
	if _, e := f.auth.client.User.UpdateOneID(f.admin.User.ID).SetRole(identity.RoleOwner).Save(t.Context()); e != nil {
		t.Fatal(e)
	}
	return f.auth.principalFromSession(t, f.admin)
}
func TestPrivacyPolicyHoldsErasureAndRevocation(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	now := func() time.Time { return time.Unix(f.auth.clock.Load(), 0) }
	s := privacy.New(f.auth.client, f.auth.service, now)
	content := sitecontent.New(f.auth.client, f.auth.service, now)
	if _, e := s.Request(ctx, f.buyer, privacy.RequestInput{PolicyID: uuid.NewString(), Accept: true}); !errors.Is(e, privacy.ErrConflict) {
		t.Fatal("unconfigured deletion", e)
	}
	if _, e := content.Save(ctx, f.admin, "retention", sitecontent.Input{Data: retentionData(), Label: "retention-1", Publish: true}); !errors.Is(e, identity.ErrForbidden) {
		t.Fatal("administrator published owner policy", e)
	}
	owner := privacyOwner(t, f)
	policy, e := content.Save(ctx, owner, "retention", sitecontent.Input{Data: retentionData(), Label: "retention-1", Publish: true})
	if e != nil {
		t.Fatal(e)
	}
	request, e := s.Request(ctx, f.buyer, privacy.RequestInput{PolicyID: policy.ReleaseID, Accept: true})
	if e != nil {
		t.Fatal(e)
	}
	duplicate, e := s.Request(ctx, f.buyer, privacy.RequestInput{PolicyID: policy.ReleaseID, Accept: true})
	if e != nil || duplicate.ID != request.ID {
		t.Fatal("request idempotency", e)
	}
	if _, e = s.Update(ctx, f.other, request.ID, false, privacy.Change{Version: request.Version, Action: "cancel"}); !errors.Is(e, identity.ErrForbidden) {
		t.Fatal("foreign cancellation", e)
	}
	purchase := f.create(t, "custom")
	held, e := s.Update(ctx, owner, request.ID, true, privacy.Change{Version: request.Version, Action: "review", PolicyID: policy.ReleaseID})
	if e != nil || held.State != "held" {
		t.Fatal("active order hold", e)
	}
	if _, e = s.Update(ctx, owner, held.ID, true, privacy.Change{Version: held.Version, Action: "erase", PolicyID: policy.ReleaseID}); !errors.Is(e, privacy.ErrConflict) {
		t.Fatal("erased held customer", e)
	}
	// Explicit isolated fixture closes an unpaid request; this does not fabricate settlement evidence.
	if _, e = f.auth.client.Order.UpdateOneID(purchase.Order.ID).SetState(order.StateCancelled).Save(ctx); e != nil {
		t.Fatal(e)
	}
	// Order creation opens its customer support thread; resolve it before removing ordinary support content.
	executeSQL(t, f.auth.db, "UPDATE conversations SET state='resolved' WHERE user_id=?", f.buyer.User.ID)
	reviewed, e := s.Update(ctx, owner, held.ID, true, privacy.Change{Version: held.Version, Action: "review", PolicyID: policy.ReleaseID})
	if e != nil || reviewed.State != "reviewed" {
		t.Fatal("review resolved records", e)
	}
	erased, e := s.Update(ctx, owner, reviewed.ID, true, privacy.Change{Version: reviewed.Version, Action: "erase", PolicyID: policy.ReleaseID})
	if e != nil || erased.State != "erased_pending_files" {
		t.Fatal("erase reviewed customer", e)
	}
	target, e := f.auth.client.User.Get(ctx, f.buyer.User.ID)
	if e != nil || target.DeletedAt == nil || !target.Suspended || target.Email == f.buyer.User.Email {
		t.Fatal("identity retained", e)
	}
	if _, e = s.Export(ctx, f.buyer, privacy.ExportInput{Section: "profile"}); e == nil {
		t.Fatal("erased session still authorized")
	}
	if e = f.auth.service.Suspend(ctx, owner, target.ID, false); !errors.Is(e, identity.ErrConflict) {
		t.Fatal("restored erased identity", e)
	}
	done, e := s.Update(ctx, owner, erased.ID, true, privacy.Change{Version: erased.Version, Action: "finalize"})
	if e != nil || done.State != "completed" {
		t.Fatal("finalize empty file cleanup", e)
	}
	if _, e = f.auth.client.Order.Get(ctx, purchase.Order.ID); e != nil {
		t.Fatal("financial history cascaded", e)
	}
}
func TestPrivacyExportOwnProjectionAndAuditFailure(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	s := privacy.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	purchase := f.create(t, "custom")
	support := supportStore(f)
	for _, customer := range []*identity.Principal{f.buyer, f.other} {
		thread, e := support.Create(ctx, customer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Export audience test"})
		if e != nil {
			t.Fatal(e)
		}
		if _, e = support.Send(ctx, customer, thread.ID, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: customer.User.Email, Visibility: "public"}); e != nil {
			t.Fatal(e)
		}
		if _, e = support.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Private staff-only export exclusion", Visibility: "internal"}); e != nil {
			t.Fatal(e)
		}
	}
	for _, section := range []string{"profile", "orders", "quotes", "contracts", "order_events", "submissions", "offers", "conversations", "messages", "receipts", "transfers", "reviews", "favorites", "alerts", "notifications", "cases", "bookings", "media", "case_events", "submission_events", "fulfillment"} {
		page, e := s.Export(ctx, f.buyer, privacy.ExportInput{Section: section})
		if e != nil || page.AuditID == "" {
			t.Fatal(section, e)
		}
		raw, e := json.Marshal(page)
		if e != nil {
			t.Fatal(e)
		}
		for _, private := range []string{f.other.User.Email, "mfa_secret", "token_hash", "code_digest", "request_hash", "encrypted_payload", "internal_reason", "Private staff-only export exclusion"} {
			if strings.Contains(string(raw), private) {
				t.Fatal("export leaked", section, private)
			}
		}
		if section == "orders" && (len(page.Records) != 1 || page.Records[0]["id"] != purchase.Order.ID) {
			t.Fatal("own order missing")
		}
	}
	if _, e := s.Export(ctx, f.buyer, privacy.ExportInput{Section: "auth_secrets"}); !errors.Is(e, privacy.ErrInvalid) {
		t.Fatal("arbitrary export", e)
	}
	executeSQL(t, f.auth.db, "DROP TABLE auth_audits")
	if _, e := s.Export(ctx, f.buyer, privacy.ExportInput{Section: "profile"}); e == nil {
		t.Fatal("export without audit")
	}
}
func TestPublishedLegalVersionRejectsStaleOrderConsent(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	owner := privacyOwner(t, f)
	s := sitecontent.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	input := f.input("custom")
	release, e := s.Save(ctx, owner, "legal", sitecontent.Input{Publish: true, Label: "approved-test-v2", Data: map[string]any{"text": "Synthetic account terms and privacy policy for a controlled test publication."}})
	if e != nil {
		t.Fatal(e)
	}
	if _, e = f.store.Create(ctx, f.buyer, input); !errors.Is(e, identity.ErrTerms) {
		t.Fatal("stale terms accepted", e)
	}
	input.TermsVersion = release.Label
	if _, e = f.store.Create(ctx, f.buyer, input); e != nil {
		t.Fatal("current terms rejected", e)
	}
	if _, e = s.Save(ctx, owner, "legal", sitecontent.Input{Version: release.Version, Publish: true, Label: release.Label, Data: map[string]any{"text": "Changed synthetic terms must never replace an accepted version with the same label."}}); !errors.Is(e, sitecontent.ErrConflict) {
		t.Fatal("reused immutable legal version", e)
	}
	public, e := s.Public(ctx, "legal")
	if e != nil || public.ReleaseID != release.ReleaseID {
		t.Fatal("failed publication changed active terms", e)
	}
}

func TestPrivacyManualHoldPolicyChangesAndRollback(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	owner := privacyOwner(t, f)
	now := func() time.Time { return time.Unix(f.auth.clock.Load(), 0) }
	s := privacy.New(f.auth.client, f.auth.service, now)
	content := sitecontent.New(f.auth.client, f.auth.service, now)
	data := retentionData()
	data["grace_days"] = 1
	policy, e := content.Save(ctx, owner, "retention", sitecontent.Input{Data: data, Label: "one-day", Publish: true})
	if e != nil {
		t.Fatal(e)
	}
	row, e := s.Request(ctx, f.buyer, privacy.RequestInput{PolicyID: policy.ReleaseID, Accept: true})
	if e != nil {
		t.Fatal(e)
	}
	held, e := s.Update(ctx, owner, row.ID, true, privacy.Change{Version: row.Version, Action: "hold", Reason: "Independent legal hold under review"})
	if e != nil || !held.ManualHold {
		t.Fatal("manual hold", e)
	}
	if _, e = s.Update(ctx, owner, held.ID, true, privacy.Change{Version: held.Version, Action: "review", PolicyID: policy.ReleaseID}); !errors.Is(e, privacy.ErrConflict) {
		t.Fatal("recheck silently released hold", e)
	}
	released, e := s.Update(ctx, owner, held.ID, true, privacy.Change{Version: held.Version, Action: "release_hold", Reason: "Independent hold resolved"})
	if e != nil {
		t.Fatal(e)
	}
	shortened, e := content.Save(ctx, owner, "retention", sitecontent.Input{Version: policy.Version, Data: retentionData(), Label: "shorter-period", Publish: true})
	if e != nil {
		t.Fatal(e)
	}
	reviewed, e := s.Update(ctx, owner, released.ID, true, privacy.Change{Version: released.Version, Action: "review", PolicyID: shortened.ReleaseID})
	if e != nil || reviewed.EligibleAt == nil || !reviewed.EligibleAt.After(now()) {
		t.Fatal("original retention shortened", e)
	}
	if _, e = s.Update(ctx, owner, reviewed.ID, true, privacy.Change{Version: reviewed.Version, Action: "erase", PolicyID: shortened.ReleaseID}); !errors.Is(e, privacy.ErrConflict) {
		t.Fatal("early erasure", e)
	}
	// A second account accepts the shorter policy and can be reviewed immediately.
	other, e := s.Request(ctx, f.other, privacy.RequestInput{PolicyID: shortened.ReleaseID, Accept: true})
	if e != nil {
		t.Fatal(e)
	}
	other, e = s.Update(ctx, owner, other.ID, true, privacy.Change{Version: other.Version, Action: "review", PolicyID: shortened.ReleaseID})
	if e != nil {
		t.Fatal(e)
	}
	executeSQL(t, f.auth.db, "DROP TABLE notifications")
	if _, e = s.Update(ctx, owner, other.ID, true, privacy.Change{Version: other.Version, Action: "erase", PolicyID: shortened.ReleaseID}); e == nil {
		t.Fatal("erasure ignored failed cleanup dependency")
	}
	account, e := f.auth.client.User.Get(ctx, f.other.User.ID)
	if e != nil || account.Email != f.other.User.Email || account.DeletedAt != nil {
		t.Fatal("partial erasure was committed", e)
	}
	if _, e = f.auth.service.Recheck(ctx, f.other, "account"); e != nil {
		t.Fatal("failed erasure revoked live session", e)
	}
}

func TestPublishedLegalInvalidatesPendingEmailAndReservesBootstrap(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	owner := privacyOwner(t, f)
	challenge, code := f.auth.request(t, "before-publication@example.test", "login", nil)
	content := sitecontent.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	input := sitecontent.Input{Publish: true, Label: f.auth.cfg.TermsVersion, Data: map[string]any{"text": "Synthetic replacement text cannot reuse the retained bootstrap version."}}
	if _, e := content.Save(ctx, owner, "legal", input); !errors.Is(e, sitecontent.ErrInvalid) {
		t.Fatal("replaced bootstrap agreement", e)
	}
	input.Label = "published-new-version"
	release, e := content.Save(ctx, owner, "legal", input)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = f.auth.service.VerifyEmail(ctx, challenge, code, f.auth.browser, "127.0.0.1", nil); !errors.Is(e, identity.ErrTerms) {
		t.Fatal("prepublication challenge accepted", e)
	}
	if _, e = f.auth.service.RequestEmail(ctx, identity.EmailRequest{Email: "stale-publication@example.test", Purpose: "login", Browser: f.auth.browser, IP: "127.0.0.1", AcceptTerms: true, TermsVersion: f.auth.cfg.TermsVersion}); !errors.Is(e, identity.ErrTerms) {
		t.Fatal("new challenge accepted stale terms", e)
	}
	challenge, e = f.auth.service.RequestEmail(ctx, identity.EmailRequest{Email: "current-publication@example.test", Purpose: "login", Browser: f.auth.browser, IP: "127.0.0.1", AcceptTerms: true, TermsVersion: release.Label})
	if e != nil {
		t.Fatal(e)
	}
	code = f.auth.deliver(t, "current-publication@example.test")
	if _, e = f.auth.service.VerifyEmail(ctx, challenge, code, f.auth.browser, "127.0.0.1", nil); e != nil {
		t.Fatal("current legal sign-in rejected", e)
	}
	historical, e := content.Version(ctx, "legal", release.Label)
	if e != nil || historical.ReleaseID != release.ReleaseID {
		t.Fatal("immutable agreement unavailable", e)
	}
}

func TestPrivacyConcurrentRequestsAndOrderCreationFence(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	owner := privacyOwner(t, f)
	now := func() time.Time { return time.Unix(f.auth.clock.Load(), 0) }
	content := sitecontent.New(f.auth.client, f.auth.service, now)
	policy, e := content.Save(ctx, owner, "retention", sitecontent.Input{Data: retentionData(), Label: "race-policy", Publish: true})
	if e != nil {
		t.Fatal(e)
	}
	s := privacy.New(f.auth.client, f.auth.service, now)
	results := make(chan privacy.View, 4)
	var wg sync.WaitGroup
	for range 4 {
		wg.Go(func() {
			v, err := s.Request(ctx, f.buyer, privacy.RequestInput{PolicyID: policy.ReleaseID, Accept: true})
			if err != nil {
				t.Error(err)
				return
			}
			results <- v
		})
	}
	wg.Wait()
	close(results)
	var row privacy.View
	count := 0
	for v := range results {
		if row.ID != "" && row.ID != v.ID {
			t.Fatal("concurrent duplicate requests")
		}
		row = v
		count++
	}
	if count != 4 {
		t.Fatal("concurrent request failed")
	}
	row, e = s.Update(ctx, owner, row.ID, true, privacy.Change{Version: row.Version, Action: "review", PolicyID: policy.ReleaseID})
	if e != nil {
		t.Fatal(e)
	}
	start := make(chan struct{})
	var orderErr, eraseErr error
	wg.Go(func() { <-start; _, orderErr = f.store.Create(ctx, f.buyer, f.input("custom")) })
	wg.Go(func() {
		<-start
		_, eraseErr = s.Update(ctx, owner, row.ID, true, privacy.Change{Version: row.Version, Action: "erase", PolicyID: policy.ReleaseID})
	})
	close(start)
	wg.Wait()
	if (orderErr == nil) == (eraseErr == nil) {
		t.Fatalf("exactly one concurrent action must succeed: order=%v erase=%v", orderErr, eraseErr)
	}
	target, e := f.auth.client.User.Get(ctx, f.buyer.User.ID)
	if e != nil {
		t.Fatal(e)
	}
	active, e := f.auth.client.Order.Query().Where(order.UserIDEQ(target.ID)).Exist(ctx)
	if e != nil || active && target.DeletedAt != nil {
		t.Fatal("active order erased", e)
	}
}
