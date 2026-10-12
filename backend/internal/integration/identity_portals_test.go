//go:build integration

package integration

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

func TestPortalSessionsCoexistAndNeverGrantAnotherAudience(t *testing.T) {
	f := authDB(t, nil)
	tokens := map[identity.Portal]string{}
	principals := map[identity.Portal]*identity.Principal{}
	ids := map[string]bool{}
	for _, portal := range []identity.Portal{identity.PortalCustomer, identity.PortalAdmin, identity.PortalBooster} {
		f.clock.Add(121)
		var token string
		var pending *identity.Principal
		if portal == identity.PortalCustomer {
			token, pending = f.login(t, "portal-owner@example.test")
		} else {
			role := identity.RoleAdmin
			if portal == identity.PortalBooster {
				role = identity.RoleBooster
			}
			token, pending = f.staffLogin(t, "portal-owner@example.test", role)
			if err := identity.Require(pending, "self"); !errors.Is(err, identity.ErrMFA) {
				t.Fatal("pending staff granted authority", err)
			}
		}
		_, _, tokens[portal], principals[portal] = f.enrollToken(t, pending)
		if _, err := f.service.Authenticate(t.Context(), token, portal); !errors.Is(err, identity.ErrUnauthenticated) {
			t.Fatal("enrollment retained old token", err)
		}
		ids[principals[portal].User.ID] = true
	}
	if len(ids) != 3 {
		t.Fatal("portal accounts reused a user ID")
	}
	for portal, token := range tokens {
		for _, target := range []identity.Portal{identity.PortalCustomer, identity.PortalAdmin, identity.PortalBooster} {
			p, err := f.service.Authenticate(t.Context(), token, target)
			if target == portal {
				if err != nil || p.Session.Portal != string(portal) {
					t.Fatal("own portal lost", err)
				}
			} else if !errors.Is(err, identity.ErrUnauthenticated) {
				t.Fatal("token crossed portal", err)
			}
		}
	}
	for _, target := range []string{"admin", "booster", "owner"} {
		if err := identity.Require(principals[identity.PortalCustomer], target); !errors.Is(err, identity.ErrForbidden) {
			t.Fatal("customer session inherited staff authority", target, err)
		}
	}
	mux := http.NewServeMux()
	f.service.Register(mux)
	for _, tc := range []struct {
		path   string
		cookie identity.Portal
		token  identity.Portal
		status int
	}{
		{"/api/v1/portal/admin", identity.PortalCustomer, identity.PortalCustomer, 401},
		{"/api/v1/portal/admin", identity.PortalAdmin, identity.PortalCustomer, 401},
		{"/api/v1/portal/admin", identity.PortalAdmin, identity.PortalAdmin, 200},
		{"/api/v1/portal/booster", identity.PortalAdmin, identity.PortalAdmin, 401},
		{"/api/v1/portal/booster", identity.PortalBooster, identity.PortalBooster, 200},
	} {
		r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, tc.path, nil)
		r.AddCookie(&http.Cookie{Name: "bp-" + string(tc.cookie) + "-session", Value: tokens[tc.token], Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != tc.status {
			t.Fatalf("%s cookie=%s token=%s: %d", tc.path, tc.cookie, tc.token, w.Code)
		}
	}
	admin := principals[identity.PortalAdmin]
	assertPortalNotifications(t, f, principals)
	if err := f.service.Revoke(t.Context(), admin, admin.Session.ID, false); err != nil {
		t.Fatal(err)
	}
	if _, err := f.service.Authenticate(t.Context(), tokens[identity.PortalAdmin], identity.PortalAdmin); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("local logout failed", err)
	}
	f.principal(t, tokens[identity.PortalCustomer], identity.PortalCustomer)
	f.principal(t, tokens[identity.PortalBooster], identity.PortalBooster)
	// A stale principal cannot revoke still-live sessions in another portal.
	if err := f.service.Revoke(t.Context(), admin, "", true); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("stale principal revoked sessions", err)
	}
	if err := f.service.Revoke(t.Context(), principals[identity.PortalCustomer], "", true); err != nil {
		t.Fatal(err)
	}
	for portal, token := range tokens {
		_, err := f.service.Authenticate(t.Context(), token, portal)
		if portal == identity.PortalBooster {
			if err != nil {
				t.Fatal("customer revoke-all touched independent booster", err)
			}
		} else if !errors.Is(err, identity.ErrUnauthenticated) {
			t.Fatal("own revocation failed", portal, err)
		}
	}
}

func assertPortalNotifications(t *testing.T, f *authFixture, principals map[identity.Portal]*identity.Principal) {
	t.Helper()
	ctx := t.Context()
	store, err := notifications.New(f.client, f.service, f.cfg.PublicOrigin)
	if err != nil {
		t.Fatal(err)
	}
	ids := map[identity.Portal]string{}
	for portal, kind := range map[identity.Portal]string{identity.PortalCustomer: "order_customer", identity.PortalAdmin: "conversation_staff", identity.PortalBooster: "coordination_booster"} {
		count := 1
		if portal == identity.PortalBooster {
			count = 52
		}
		for range count {
			id := uuid.NewString()
			_, err = f.client.Notification.Create().SetID(id).SetUserID(principals[portal].User.ID).SetResourceID(uuid.NewString()).SetMessageID(uuid.NewString()).SetKind(kind).Save(ctx)
			if err != nil {
				t.Fatal(err)
			}
			ids[portal] = id
		}
	}
	for portal, p := range principals {
		page, e := store.List(ctx, p, "")
		if e != nil {
			t.Fatal(e)
		}
		if portal == identity.PortalBooster {
			if len(page.Notifications) != 50 || page.Next == "" {
				t.Fatal("booster pagination missing")
			}
			next, nextErr := store.List(ctx, p, page.Next)
			if nextErr != nil || len(next.Notifications) != 2 || next.Next != "" {
				t.Fatal("booster pagination leaked another audience", nextErr)
			}
		} else if len(page.Notifications) != 1 || page.Notifications[0].ID != ids[portal] || page.Next != "" {
			t.Fatal("another portal polluted notification pagination", portal)
		}
		for other, id := range ids {
			if other == portal {
				continue
			}
			if e = store.Read(ctx, p, id); e != nil {
				t.Fatal(e)
			}
			row, readErr := f.client.Notification.Get(ctx, id)
			if readErr != nil || row.ReadAt != nil {
				t.Fatal("cross-portal notification read mutation", readErr)
			}
		}
	}
	if err = store.Read(ctx, principals[identity.PortalCustomer], ids[identity.PortalCustomer]); err != nil {
		t.Fatal(err)
	}
	row, err := f.client.Notification.Get(ctx, ids[identity.PortalCustomer])
	if err != nil || row.ReadAt == nil {
		t.Fatal("own portal could not mark notice read", err)
	}
}

func TestPortalEmailChallengeIsolationAndNoStaffSignup(t *testing.T) {
	f := authDB(t, nil)
	_, customer := f.login(t, "portal-buyer@example.test")
	for _, portal := range []identity.Portal{identity.PortalAdmin, identity.PortalBooster} {
		for _, email := range []string{"unprovisioned-" + string(portal) + "@example.test", customer.User.Email} {
			f.clock.Add(121)
			id, err := f.service.RequestEmail(t.Context(), identity.EmailRequest{Portal: portal, Email: email, Purpose: "login", Browser: f.browser, IP: "127.0.0.1", AcceptTerms: true})
			if !errors.Is(err, identity.ErrStaffAccess) {
				t.Fatal("missing staff invitation did not explain unavailable access", err)
			}
			if _, err = f.client.AuthChallenge.Get(t.Context(), id); !ent.IsNotFound(err) {
				t.Fatal("ineligible staff challenge created", err)
			}
		}
	}
	if count, err := f.client.User.Query().Count(t.Context()); err != nil || count != 1 {
		t.Fatal("staff signup created account", count, err)
	}
	if _, err := f.client.User.Create().SetPortal(string(identity.PortalAdmin)).SetEmail("portal-staff@example.test").SetRole(identity.RoleAdmin).SetTermsVersion("test-v1").Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	adminID, adminCode := f.request(t, "portal-staff@example.test", "login", nil, identity.PortalAdmin)
	f.clock.Add(121)
	customerID, customerCode := f.request(t, "portal-staff@example.test", "login", nil, identity.PortalCustomer)
	if _, err := f.service.VerifyEmail(t.Context(), adminID, adminCode, f.browser, "127.0.0.1", nil, identity.PortalCustomer); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("challenge swapped", err)
	}
	row, err := f.client.AuthChallenge.Get(t.Context(), adminID)
	if err != nil || row.Consumed || row.Attempts != 0 {
		t.Fatal("wrong portal consumed rightful challenge", err)
	}
	for _, tc := range []struct {
		id, code string
		portal   identity.Portal
	}{{adminID, adminCode, identity.PortalAdmin}, {customerID, customerCode, identity.PortalCustomer}} {
		result, e := f.service.VerifyEmail(t.Context(), tc.id, tc.code, f.browser, "127.0.0.1", nil, tc.portal)
		if e != nil {
			t.Fatal(e)
		}
		p := f.principal(t, result.Token, tc.portal)
		if p.NeedsMFA() != (tc.portal != identity.PortalCustomer) {
			t.Fatal("portal-specific MFA policy not applied")
		}
	}
}

func TestPortalGoogleStateAndRecentFirstFactor(t *testing.T) {
	provider := &googleStub{assertion: identity.GoogleIdentity{Subject: "portal-linked-google", Email: "portal-google@example.test"}}
	f := authDB(t, provider)
	account, err := f.client.User.Create().SetPortal(string(identity.PortalAdmin)).SetEmail(provider.assertion.Email).SetEmailVerifiedAt(time.Unix(f.clock.Load(), 0)).SetRole(identity.RoleAdmin).SetTermsVersion("test-v1").Save(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.client.AuthIdentity.Create().SetID("portal-google-link").SetUserID(account.ID).SetPortal(account.Portal).SetProvider("google").SetSubject(provider.assertion.Subject).SetCreatedAt(time.Unix(f.clock.Load(), 0)).Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	start := func() string {
		t.Helper()
		location, e := f.service.StartGoogle(t.Context(), nil, f.browser, "127.0.0.1", "login", true, identity.PortalAdmin)
		if e != nil {
			t.Fatal(e)
		}
		u, e := url.Parse(location)
		if e != nil {
			t.Fatal(e)
		}
		return u.Query().Get("state")
	}
	state := start()
	if _, err = f.service.FinishGoogle(t.Context(), nil, f.browser, state, "code", identity.PortalCustomer); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("Google state swapped", err)
	}
	provider.assertion.IssuedAt = time.Unix(f.clock.Load(), 0).Add(-identity.RecentTTL - time.Second)
	if _, err = f.service.FinishGoogle(t.Context(), nil, f.browser, state, "code", identity.PortalAdmin); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("stale provider assertion accepted", err)
	}
	provider.assertion.IssuedAt = time.Unix(f.clock.Load(), 0)
	provider.assertion.AuthenticatedAt = time.Unix(f.clock.Load(), 0)
	state = start()
	token, err := f.service.FinishGoogle(t.Context(), nil, f.browser, state, "code", identity.PortalAdmin)
	if err != nil {
		t.Fatal(err)
	}
	if !f.principal(t, token, identity.PortalAdmin).NeedsMFA() {
		t.Fatal("Google bypassed staff MFA")
	}
	if _, err = f.service.FinishGoogle(t.Context(), nil, f.browser, state, "code", identity.PortalAdmin); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("Google state replayed", err)
	}
	provider.assertion.Subject = "unlinked-staff-subject"
	conflictingState := start()
	if token, err = f.service.FinishGoogle(t.Context(), nil, f.browser, conflictingState, "code", identity.PortalAdmin); !errors.Is(err, identity.ErrConflict) || token != "" {
		t.Fatal("conflicting Google subject was not rejected without a session", err)
	}
	links, err := f.client.AuthIdentity.Query().All(t.Context())
	if err != nil || len(links) != 1 || links[0].UserID != account.ID || links[0].Subject != "portal-linked-google" {
		t.Fatal("conflicting Google subject changed the existing staff link", err)
	}
	if count, countErr := f.client.AuthSession.Query().Count(t.Context()); countErr != nil || count != 1 {
		t.Fatal("conflicting Google subject created another session", count, countErr)
	}
	if _, err = f.service.FinishGoogle(t.Context(), nil, f.browser, conflictingState, "code", identity.PortalAdmin); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("rejected Google flow could be replayed", err)
	}
}

func TestPortalMigrationInvalidatesLegacyStateAndPreservesFactors(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	ctx := t.Context()
	if err := r.Apply(ctx, 25); err != nil {
		t.Fatal(err)
	}
	// Explicit SQL seeds the old schema, including an enrolled factor and identity.
	statements := []string{
		"INSERT INTO users(id,email,display_name,created_at,role,mfa_enabled,mfa_secret,mfa_recovery_hashes) VALUES ('legacy','legacy@example.test','Legacy',UTC_TIMESTAMP(6),'owner',TRUE,'encrypted-test-factor','[\"test-recovery-hash\"]')",
		"INSERT INTO auth_identities(id,user_id,provider,subject,created_at) VALUES ('legacy','legacy','google','test-subject',UTC_TIMESTAMP(6))",
		"INSERT INTO auth_sessions(id,user_id,token_hash,auth_version,authenticated_at,created_at,last_seen_at,expires_at) VALUES ('legacy','legacy',REPEAT('a',64),1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)+INTERVAL 1 DAY)",
		"INSERT INTO auth_challenges(id,email,purpose,browser_hash,code_digest,created_at,expires_at) VALUES ('legacy','legacy@example.test','login',REPEAT('b',64),REPEAT('c',64),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)+INTERVAL 1 DAY)",
		"INSERT INTO auth_flows(id,browser_hash,purpose,nonce,verifier,expires_at) VALUES ('legacy',REPEAT('d',64),'login','test-nonce','test-verifier',UTC_TIMESTAMP(6)+INTERVAL 1 DAY)",
	}
	for _, sql := range statements {
		if _, err := db.ExecContext(ctx, sql); err != nil {
			t.Fatal(err)
		}
	}
	if err := r.Apply(ctx, 26); err != nil {
		t.Fatal(err)
	}
	var invalidated int
	check := func() {
		t.Helper()
		if err := db.QueryRowContext(ctx, "SELECT (SELECT COUNT(*) FROM auth_sessions WHERE revoked_at IS NOT NULL)+(SELECT COUNT(*) FROM auth_challenges WHERE consumed=TRUE)+(SELECT COUNT(*) FROM auth_flows WHERE consumed=TRUE)").Scan(&invalidated); err != nil || invalidated != 3 {
			t.Fatal("legacy state remains usable", invalidated, err)
		}
	}
	check()
	var enabled bool
	var factor, recovery string
	if err := db.QueryRowContext(ctx, "SELECT mfa_enabled,mfa_secret,mfa_recovery_hashes FROM users WHERE id='legacy'").Scan(&enabled, &factor, &recovery); err != nil || !enabled || factor != "encrypted-test-factor" || !strings.Contains(recovery, "test-recovery-hash") {
		t.Fatal("factor lost", err)
	}
	var linked int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM auth_identities WHERE user_id='legacy'").Scan(&linked); err != nil || linked != 1 {
		t.Fatal("Google link lost", err)
	}
	// Old writers must fail instead of silently creating a customer session.
	if _, err := db.ExecContext(ctx, strings.ReplaceAll(strings.ReplaceAll(statements[2], "'legacy'", "'old-writer'"), "REPEAT('a',64)", "REPEAT('e',64)")); err == nil {
		t.Fatal("unscoped legacy writer accepted")
	}
	if err := r.Down(ctx, 1); err != nil {
		t.Fatal(err)
	}
	check()
	if err := r.Apply(ctx, 26); err != nil {
		t.Fatal(err)
	}
	check()
}

func TestPortalGoogleOptionalAuthTimePreservesSensitiveStepUp(t *testing.T) {
	provider := &googleStub{assertion: identity.GoogleIdentity{Subject: "optional-auth-time", Email: "optional-time@example.test"}}
	f := authDB(t, provider)
	for _, portal := range []identity.Portal{identity.PortalAdmin, identity.PortalBooster} {
		f.clock.Add(3601)
		role := identity.RoleAdmin
		if portal == identity.PortalBooster {
			role = identity.RoleBooster
		}
		_, account := f.staffLogin(t, provider.assertion.Email, role)
		secret, _, account := f.enroll(t, account)
		if _, err := f.client.AuthIdentity.Create().SetID("optional-auth-time-link-" + string(portal)).SetUserID(account.User.ID).SetPortal(string(portal)).SetProvider("google").SetSubject(provider.assertion.Subject).SetCreatedAt(time.Unix(f.clock.Load(), 0)).Save(t.Context()); err != nil {
			t.Fatal(err)
		}
		for _, scenario := range []string{"missing", "old", "recent"} {
			t.Run(string(portal)+"/"+scenario, func(t *testing.T) {
				f.clock.Add(121)
				now := time.Unix(f.clock.Load(), 0)
				provider.assertion.IssuedAt = now
				provider.assertion.AuthenticatedAt = time.Time{}
				switch scenario {
				case "old":
					provider.assertion.AuthenticatedAt = now.Add(-24 * time.Hour)
				case "recent":
					provider.assertion.AuthenticatedAt = now.Add(-time.Minute)
				}
				location, err := f.service.StartGoogle(t.Context(), nil, f.browser, "127.0.0.1", "login", true, portal)
				if err != nil {
					t.Fatal(err)
				}
				u, err := url.Parse(location)
				if err != nil {
					t.Fatal(err)
				}
				token, err := f.service.FinishGoogle(t.Context(), nil, f.browser, u.Query().Get("state"), "fixture-code", portal)
				if err != nil {
					t.Fatal("fresh Google sign-in rejected because of account-session age", err)
				}
				p := f.principal(t, token, portal)
				if err = identity.Require(p, string(portal)); !errors.Is(err, identity.ErrMFA) {
					t.Fatal("staff capability granted before MFA", err)
				}
				code, err := totp.GenerateCode(secret, now)
				if err != nil {
					t.Fatal(err)
				}
				verified, err := f.service.VerifyMFA(t.Context(), p, code, "127.0.0.1")
				if err != nil {
					t.Fatal(err)
				}
				p = f.principal(t, verified.Token, portal)
				if err = identity.Require(p, string(portal)); err != nil {
					t.Fatal("verified staff sign-in rejected", err)
				}
				called := false
				mutation := func(*ent.Tx, *identity.Principal) error { called = true; return nil }
				err = f.service.AuthorizedTransaction(t.Context(), p, string(portal), true, mutation)
				if err != nil || !called {
					t.Fatal("fresh authenticator did not authorize action", err)
				}
				if scenario == "recent" && !p.Session.AuthenticatedAt.Equal(provider.assertion.AuthenticatedAt) {
					t.Fatal("actual Google credential freshness not preserved")
				}
				if scenario != "recent" && p.Session.AuthenticatedAt.Add(identity.RecentTTL).After(now) {
					t.Fatal("provider ID token fabricated primary credential freshness")
				}
				mfaAt := *p.Session.MfaVerifiedAt
				f.clock.Add(int64(identity.RecentTTL.Seconds()) + 1)
				called = false
				if err = f.service.AuthorizedTransaction(t.Context(), p, string(portal), true, mutation); !errors.Is(err, identity.ErrRecent) || called {
					t.Fatal("two stale factors authorized an action", err)
				}
				challenge, emailCode := f.request(t, p.User.Email, "reauth", p, portal)
				result, err := f.service.VerifyEmail(t.Context(), challenge, emailCode, f.browser, "127.0.0.1", p, portal)
				if err != nil {
					t.Fatal(err)
				}
				p = f.principal(t, result.Token, portal)
				if p.NeedsMFA() || p.Session.MfaVerifiedAt == nil || !p.Session.MfaVerifiedAt.Equal(mfaAt) {
					t.Fatal("email renewal changed completed sign-in MFA proof")
				}
				if err = f.service.AuthorizedTransaction(t.Context(), p, string(portal), true, mutation); err != nil || !called {
					t.Fatal("email renewal alone did not unlock the action", err)
				}

			})
		}
	}
}
