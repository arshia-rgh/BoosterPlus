//go:build integration

package integration

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/pquerna/otp/totp"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

type authFixture struct {
	db      *sql.DB
	client  *ent.Client
	service *identity.Service
	clock   atomic.Int64
	browser string
	cfg     identity.Config
}

func authDB(t *testing.T, provider identity.GoogleProvider) *authFixture {
	t.Helper()
	db := testDB(t)
	if err := runner(t, db).Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	f := &authFixture{db: db, client: ent.NewClient(ent.Driver(entsql.OpenDB(dialect.MySQL, db))), browser: rand.Text() + rand.Text()}
	f.clock.Store(time.Now().UTC().Unix())
	f.cfg = identity.Config{Key: []byte(rand.Text() + "123456"), ProxyKey: rand.Text() + rand.Text(), PublicOrigin: "http://localhost", TermsVersion: "test-v1", TermsURL: "http://localhost/terms"}
	var err error
	f.service, err = identity.New(f.client, f.cfg, func() time.Time { return time.Unix(f.clock.Load(), 0) }, provider)
	if err != nil {
		t.Fatal(err)
	}
	return f
}

type recordingSender struct{ messages []identity.Message }

func (s *recordingSender) Send(_ context.Context, m identity.Message) error {
	s.messages = append(s.messages, m)
	return nil
}
func testPortal(portals []identity.Portal) identity.Portal {
	if len(portals) == 1 {
		return portals[0]
	}
	if len(portals) != 0 {
		panic("test must select one portal")
	}
	return identity.PortalCustomer
}
func (f *authFixture) request(t *testing.T, email, purpose string, p *identity.Principal, portals ...identity.Portal) (string, string) {
	t.Helper()
	id, err := f.service.RequestEmail(t.Context(), identity.EmailRequest{Portal: testPortal(portals), Email: email, Purpose: purpose, Browser: f.browser, IP: "127.0.0.1", AcceptTerms: true, Principal: p})
	if err != nil {
		t.Fatal(err)
	}
	return id, f.deliver(t, email)
}
func (f *authFixture) deliver(t *testing.T, email string) string {
	t.Helper()
	store := jobs.New(f.db)
	sender := &recordingSender{}
	for {
		job, err := store.Claim(t.Context())
		if err != nil {
			t.Fatal(err)
		}
		if job == nil {
			break
		}
		if err = f.service.EmailHandler(sender)(t.Context(), *job); err != nil {
			t.Fatal(err)
		}
		if err = store.Complete(t.Context(), job); err != nil {
			t.Fatal(err)
		}
	}
	for i := len(sender.messages) - 1; i >= 0; i-- {
		m := sender.messages[i]
		if m.To == email {
			return regexp.MustCompile(`\b[0-9]{6}\b`).FindString(m.Body)
		}
	}
	t.Fatal("verification mail was not delivered")
	return ""
}
func (f *authFixture) login(t *testing.T, email string, portals ...identity.Portal) (string, *identity.Principal) {
	t.Helper()
	portal := testPortal(portals)
	id, code := f.request(t, email, "login", nil, portal)
	result, err := f.service.VerifyEmail(t.Context(), id, code, f.browser, "127.0.0.1", nil, portal)
	if err != nil {
		t.Fatal(err)
	}
	return result.Token, f.principal(t, result.Token, portal)
}
func (f *authFixture) principal(t *testing.T, token string, portals ...identity.Portal) *identity.Principal {
	t.Helper()
	p, err := f.service.Authenticate(t.Context(), token, testPortal(portals))
	if err != nil {
		t.Fatal(err)
	}
	return p
}

// staffLogin provisions a namespace-correct synthetic fixture without changing
// any customer identity. Production provisioning remains owner-authorized.
func (f *authFixture) staffLogin(t *testing.T, email, role string) (string, *identity.Principal) {
	t.Helper()
	portal := identity.PortalAdmin
	if role == identity.RoleBooster {
		portal = identity.PortalBooster
	}
	if _, err := f.client.User.Create().SetPortal(string(portal)).SetEmail(email).SetRole(role).Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	return f.login(t, email, portal)
}

func (f *authFixture) enroll(t *testing.T, p *identity.Principal) (string, []string, *identity.Principal) {
	t.Helper()
	secret, codes, _, current := f.enrollToken(t, p)
	return secret, codes, current
}
func (f *authFixture) enrollToken(t *testing.T, p *identity.Principal) (string, []string, string, *identity.Principal) {
	t.Helper()
	enrollment, err := f.service.EnrollMFA(t.Context(), p)
	if err != nil {
		t.Fatal(err)
	}
	code, err := totp.GenerateCode(enrollment.Secret, time.Unix(f.clock.Load(), 0))
	if err != nil {
		t.Fatal(err)
	}
	result, err := f.service.VerifyMFA(t.Context(), p, code, "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	if len(result.RecoveryCodes) != 10 {
		t.Fatal("missing one-time recovery codes")
	}
	return enrollment.Secret, result.RecoveryCodes, result.Token, f.principal(t, result.Token, identity.Portal(p.Session.Portal))
}
func TestIdentityEmailConsumptionAndPrivacy(t *testing.T) {
	f := authDB(t, nil)
	id, code := f.request(t, "person@example.test", "login", nil)
	if _, err := f.service.VerifyEmail(t.Context(), id, code, rand.Text()+rand.Text(), "127.0.0.1", nil, identity.PortalCustomer); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("cross-browser code accepted", err)
	}
	var wins atomic.Int64
	var wg sync.WaitGroup
	for range 6 {
		wg.Go(func() {
			result, err := f.service.VerifyEmail(t.Context(), id, code, f.browser, "127.0.0.1", nil, identity.PortalCustomer)
			if err == nil && result.Token != "" {
				wins.Add(1)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatalf("verification winners %d", wins.Load())
	}
	if _, err := f.service.VerifyEmail(t.Context(), id, code, f.browser, "127.0.0.1", nil, identity.PortalCustomer); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("replayed code accepted", err)
	}
	challenge, err := f.client.AuthChallenge.Get(t.Context(), id)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(challenge.CodeDigest, code) {
		t.Fatal("code stored without hashing")
	}
	messages, err := f.client.AuthMessage.Query().All(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	for _, message := range messages {
		if len(message.EncryptedPayload) != 0 || message.SentAt == nil {
			t.Fatal("delivered message not redacted")
		}
	}
	var payload string
	if err = f.db.QueryRowContext(t.Context(), "SELECT payload FROM jobs LIMIT 1").Scan(&payload); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(payload, code) || strings.Contains(payload, "person@") {
		t.Fatal("queue leaked credentials")
	}
	id, code = f.request(t, "attempts@example.test", "login", nil)
	wrong := "000000"
	if code == wrong {
		wrong = "111111"
	}
	for range 5 {
		if _, err = f.service.VerifyEmail(t.Context(), id, wrong, f.browser, "127.0.0.1", nil, identity.PortalCustomer); !errors.Is(err, identity.ErrInvalid) {
			t.Fatal(err)
		}
	}
	if _, err = f.service.VerifyEmail(t.Context(), id, code, f.browser, "127.0.0.1", nil, identity.PortalCustomer); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("attempt limit bypassed", err)
	}
	id, code = f.request(t, "expiry@example.test", "login", nil)
	f.clock.Add(601)
	if _, err = f.service.VerifyEmail(t.Context(), id, code, f.browser, "127.0.0.1", nil, identity.PortalCustomer); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("expired code accepted", err)
	}
	if err = f.service.Cleanup(t.Context()); err != nil {
		t.Fatal(err)
	}
	count, err := f.client.AuthMessage.Query().Where(authmessage.ExpiresAtLTE(time.Unix(f.clock.Load(), 0))).Count(t.Context())
	if err != nil || count != 0 {
		t.Fatal("expired mail retained", err)
	}
}
func TestIdentityCooldownTermsAndSessionBoundaries(t *testing.T) {
	f := authDB(t, nil)
	f.clock.Store(f.clock.Load()/60*60 + 59)
	id, code := f.request(t, "cooldown@example.test", "login", nil)
	f.clock.Add(2)
	ignored, err := f.service.RequestEmail(t.Context(), identity.EmailRequest{Portal: identity.PortalCustomer, Email: "cooldown@example.test", Purpose: "login", Browser: f.browser, IP: "127.0.0.1", AcceptTerms: true})
	if !errors.Is(err, identity.ErrLimited) || ignored != "" {
		t.Fatal("cooldown did not report that no new code was issued", err)
	}
	if _, err = f.client.AuthChallenge.Get(t.Context(), ignored); !ent.IsNotFound(err) {
		t.Fatal("minute boundary bypassed rolling cooldown", err)
	}
	verified, err := f.service.VerifyEmail(t.Context(), id, code, f.browser, "127.0.0.1", nil, identity.PortalCustomer)
	if err != nil {
		t.Fatal(err)
	}
	p := f.principal(t, verified.Token)
	victimToken, victim := f.login(t, "victim@example.test")
	if err = f.service.Revoke(t.Context(), p, victim.Session.ID, false); err != nil {
		t.Fatal(err)
	}
	f.principal(t, victimToken)
	if _, err = f.service.User(t.Context(), p, victim.User.ID); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer user lookup allowed", err)
	}
	f.clock.Add(121)
	reauthID, reauthCode := f.request(t, p.User.Email, "reauth", p)
	result, err := f.service.VerifyEmail(t.Context(), reauthID, reauthCode, f.browser, "127.0.0.1", p, identity.PortalCustomer)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.service.Authenticate(t.Context(), verified.Token, identity.PortalCustomer); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("rotated token remained valid", err)
	}
	p = f.principal(t, result.Token)
	if err = f.service.Revoke(t.Context(), p, "", true); err != nil {
		t.Fatal(err)
	}
	if _, err = f.service.Authenticate(t.Context(), result.Token, identity.PortalCustomer); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("logout-all failed", err)
	}
	f.clock.Add(1801)
	if _, err = f.service.Authenticate(t.Context(), victimToken, identity.PortalCustomer); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("idle expiry failed", err)
	}
	id, err = f.service.RequestEmail(t.Context(), identity.EmailRequest{Portal: identity.PortalCustomer, Email: "terms@example.test", Purpose: "login", Browser: f.browser, IP: "127.0.0.1"})
	if err != nil {
		t.Fatal(err)
	}
	code = f.deliver(t, "terms@example.test")
	if _, err = f.service.VerifyEmail(t.Context(), id, code, f.browser, "127.0.0.1", nil, identity.PortalCustomer); !errors.Is(err, identity.ErrTerms) {
		t.Fatal("signup without terms", err)
	}
}
func TestIdentityStaffMFAAndOwnerControls(t *testing.T) {
	f := authDB(t, nil)
	oldToken, customer := f.staffLogin(t, "owner@example.test", identity.RoleAdmin)
	if err := f.service.BootstrapOwner(t.Context(), customer.User.ID, "operator-1"); !errors.Is(err, identity.ErrMFA) {
		t.Fatal("bootstrap without MFA", err)
	}
	secret, codes, customer := f.enroll(t, customer)
	if _, err := f.service.Authenticate(t.Context(), oldToken, identity.PortalAdmin); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("enrollment did not revoke old session", err)
	}
	if err := f.service.BootstrapOwner(t.Context(), customer.User.ID, "operator-1"); err != nil {
		t.Fatal(err)
	}
	f.clock.Add(121)
	_, pending := f.login(t, customer.User.Email, identity.PortalAdmin)
	if err := identity.Require(pending, "owner"); !errors.Is(err, identity.ErrMFA) {
		t.Fatal("staff first factor granted privileges", err)
	}
	code, err := totp.GenerateCode(secret, time.Unix(f.clock.Load(), 0))
	if err != nil {
		t.Fatal(err)
	}
	result, err := f.service.VerifyMFA(t.Context(), pending, code, "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	owner := f.principal(t, result.Token, identity.PortalAdmin)
	if err = identity.Require(owner, "owner"); err != nil {
		t.Fatal(err)
	}
	if err = f.service.DisableMFA(t.Context(), owner); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("staff disabled MFA", err)
	}
	if _, err = f.service.VerifyMFA(t.Context(), owner, code, "127.0.0.1"); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("TOTP replay accepted", err)
	}
	if err = f.service.GrantRole(t.Context(), owner, owner.User.ID, identity.RoleAdmin); !errors.Is(err, identity.ErrConflict) {
		t.Fatal("last owner removed", err)
	}
	targetToken, customerTarget := f.login(t, "staff@example.test")
	target, inviteErr := f.service.InviteStaff(t.Context(), owner, identity.StaffInvitation{Email: customerTarget.User.Email, Portal: identity.PortalBooster, Role: identity.RoleBooster})
	if inviteErr != nil || target.ID == customerTarget.User.ID {
		t.Fatal("invitation reused customer identity", inviteErr)
	}
	if _, err = f.service.Authenticate(t.Context(), targetToken, identity.PortalCustomer); err != nil {
		t.Fatal("invitation affected customer session", err)
	}
	if err = f.service.Suspend(t.Context(), owner, target.ID, true); err != nil {
		t.Fatal(err)
	}
	if err = f.service.BootstrapOwner(t.Context(), target.ID, "operator-2"); !errors.Is(err, identity.ErrConflict) {
		t.Fatal("second bootstrap accepted", err)
	}
	entries, err := f.service.Audits(t.Context(), owner)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, entry := range entries {
		if entry.Action == "staff.invited" && entry.ActorID == owner.User.ID {
			found = true
		}
	}
	if !found {
		t.Fatal("role change lacks internal actor audit")
	}
	result, err = f.service.VerifyMFA(t.Context(), owner, codes[0], "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	owner = f.principal(t, result.Token, identity.PortalAdmin)
	if _, err = f.service.VerifyMFA(t.Context(), owner, codes[0], "127.0.0.1"); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("recovery code reused", err)
	}
	f.clock.Add(601)
	if err = f.service.Suspend(t.Context(), owner, target.ID, false); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("stale authentication changed suspension", err)
	}
}
func TestIdentityHTTPBoundary(t *testing.T) {
	f := authDB(t, nil)
	mux := http.NewServeMux()
	f.service.Register(mux)
	bootstrap := httptest.NewRecorder()
	mux.ServeHTTP(bootstrap, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/auth/session", nil))
	var state struct {
		CSRF string `json:"csrf_token"`
	}
	if err := json.Unmarshal(bootstrap.Body.Bytes(), &state); err != nil {
		t.Fatal(err)
	}
	response := bootstrap.Result()
	defer func() {
		if closeErr := response.Body.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	}()
	cookies := response.Cookies()
	if len(cookies) != 1 || !cookies[0].HttpOnly || cookies[0].SameSite != http.SameSiteLaxMode {
		t.Fatal("invalid browser cookie policy")
	}
	for _, tc := range []struct {
		name, origin, csrf, body string
		status                   int
	}{
		{"no csrf", "http://localhost", "", `{"email":"http@example.test","purpose":"login","accept_terms":true}`, 403},
		{"foreign origin", "https://evil.example", state.CSRF, `{}`, 403},
		{"unknown field", "http://localhost", state.CSRF, `{"email":"http@example.test","purpose":"login","role":"owner"}`, 400},
		{"multiple JSON", "http://localhost", state.CSRF, `{} {}`, 400},
		{"valid", "http://localhost", state.CSRF, `{"email":"http@example.test","purpose":"login","accept_terms":true}`, 202},
		{"resend cooldown", "http://localhost", state.CSRF, `{"email":"http@example.test","purpose":"login","accept_terms":true}`, 429},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/api/v1/auth/email/request", strings.NewReader(tc.body))
			req.AddCookie(cookies[0])
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Origin", tc.origin)
			req.Header.Set("X-Csrf-Token", tc.csrf)
			out := httptest.NewRecorder()
			mux.ServeHTTP(out, req)
			if out.Code != tc.status {
				t.Fatalf("status %d: %s", out.Code, out.Body.String())
			}
			if out.Code == http.StatusAccepted {
				var timing struct {
					ID      string `json:"challenge_id"`
					Retry   int    `json:"retry_after_seconds"`
					Expires int    `json:"expires_in_seconds"`
				}
				if err := json.Unmarshal(out.Body.Bytes(), &timing); err != nil {
					t.Fatal("invalid verification response", err)
				}
				if timing.ID == "" || timing.Retry != 120 || timing.Expires != 600 {
					t.Fatalf("verification timing: challenge present=%t, retry=%d, expiry=%d; want true, 120, 600", timing.ID != "", timing.Retry, timing.Expires)
				}
			}
			if out.Code == http.StatusTooManyRequests && out.Header().Get("Retry-After") != "120" {
				t.Fatal("resend rejection must expose the two-minute retry interval")
			}
		})
	}
	for _, path := range []string{"/api/v1/me", "/api/v1/me/sessions", "/api/v1/admin/users", "/api/v1/admin/audit", "/api/v1/admin/recoveries", "/api/v1/portal/booster"} {
		out := httptest.NewRecorder()
		mux.ServeHTTP(out, httptest.NewRequestWithContext(t.Context(), http.MethodGet, path, nil))
		if out.Code != 401 {
			t.Fatalf("anonymous access %s: %d", path, out.Code)
		}
	}
}

type googleStub struct{ assertion identity.GoogleIdentity }

func (*googleStub) AuthorizationURL(state, nonce, verifier string, _ identity.Portal) string {
	return "https://accounts.google.com/auth?" + url.Values{"state": {state}, "nonce": {nonce}, "code_challenge": {verifier}}.Encode()
}
func (g *googleStub) Exchange(context.Context, string, string, string, identity.Portal) (identity.GoogleIdentity, error) {
	return g.assertion, nil
}
func TestIdentityGoogleExplicitLinking(t *testing.T) {
	provider := &googleStub{assertion: identity.GoogleIdentity{Subject: "google-subject-1", Email: "existing@example.test"}}
	f := authDB(t, provider)
	_, p := f.login(t, provider.assertion.Email)
	start := func(purpose string, principal *identity.Principal) string {
		t.Helper()
		location, err := f.service.StartGoogle(t.Context(), principal, f.browser, "127.0.0.1", purpose, true, identity.PortalCustomer)
		if err != nil {
			t.Fatal(err)
		}
		parsed, err := url.Parse(location)
		if err != nil {
			t.Fatal(err)
		}
		return parsed.Query().Get("state")
	}
	state := start("login", nil)
	if _, err := f.service.FinishGoogle(t.Context(), nil, f.browser, state, "code", identity.PortalCustomer); !errors.Is(err, identity.ErrConflict) {
		t.Fatal("email silently merged identities", err)
	}
	state = start("link", p)
	if _, err := f.service.FinishGoogle(t.Context(), p, "wrong browser", state, "code", identity.PortalCustomer); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("OAuth browser mismatch accepted", err)
	}
	token, err := f.service.FinishGoogle(t.Context(), p, f.browser, state, "code", identity.PortalCustomer)
	if err != nil {
		t.Fatal(err)
	}
	p = f.principal(t, token)
	if _, err = f.service.FinishGoogle(t.Context(), p, f.browser, state, "code", identity.PortalCustomer); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("OAuth state replayed", err)
	}
	provider.assertion.Email = "renamed-at-provider@example.test"
	state = start("login", nil)
	token, err = f.service.FinishGoogle(t.Context(), nil, f.browser, state, "code", identity.PortalCustomer)
	if err != nil {
		t.Fatal(err)
	}
	linked := f.principal(t, token)
	if linked.User.ID != p.User.ID || linked.User.Email != "existing@example.test" {
		t.Fatal("provider email replaced stable subject identity")
	}
	if err = f.service.UnlinkGoogle(t.Context(), linked); err != nil {
		t.Fatal(err)
	}
	if _, err = f.service.Authenticate(t.Context(), token, identity.PortalCustomer); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("unlink failed to revoke sessions", err)
	}
}

func TestIdentityEmailChangeAndReviewedRecovery(t *testing.T) {
	f := authDB(t, nil)
	_, account := f.login(t, "recover@example.test")
	_, _, account = f.enroll(t, account)
	id, code := f.request(t, "changed@example.test", "email_change", account)
	result, err := f.service.VerifyEmail(t.Context(), id, code, f.browser, "127.0.0.1", account, identity.PortalCustomer)
	if err != nil || result.Token != "" || result.Purpose != "email_change" {
		t.Fatal("email change incorrectly granted a session", err)
	}
	changed, err := f.client.User.Get(t.Context(), account.User.ID)
	if err != nil || changed.Email != "changed@example.test" || !changed.MfaEnabled {
		t.Fatal("email change altered authenticator", err)
	}
	if _, err = f.service.Authenticate(t.Context(), "invalid", identity.PortalCustomer); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal(err)
	}
	_, owner := f.staffLogin(t, "reviewer@example.test", identity.RoleAdmin)
	secret, _, owner := f.enroll(t, owner)
	if err = f.service.BootstrapOwner(t.Context(), owner.User.ID, "test-operator"); err != nil {
		t.Fatal(err)
	}
	f.clock.Add(121)
	_, owner = f.login(t, owner.User.Email, identity.PortalAdmin)
	factor, factorErr := totp.GenerateCode(secret, time.Unix(f.clock.Load(), 0))
	if factorErr != nil {
		t.Fatal(factorErr)
	}
	mfa, mfaErr := f.service.VerifyMFA(t.Context(), owner, factor, "127.0.0.1")
	if mfaErr != nil {
		t.Fatal(mfaErr)
	}
	owner = f.principal(t, mfa.Token, identity.PortalAdmin)
	if _, createErr := f.client.AuthIdentity.Create().SetID(rand.Text()).SetUserID(changed.ID).SetProvider("google").SetSubject("recovery-subject").SetCreatedAt(time.Unix(f.clock.Load(), 0)).Save(t.Context()); createErr != nil {
		t.Fatal(createErr)
	}
	if err = f.service.Suspend(t.Context(), owner, changed.ID, true); err != nil {
		t.Fatal(err)
	}
	recoveryID, requestErr := f.service.RequestEmail(t.Context(), identity.EmailRequest{Portal: identity.PortalCustomer, Email: "new-destination@example.test", AccountEmail: changed.Email, Purpose: "recovery", Browser: f.browser, IP: "127.0.0.1"})
	if requestErr != nil {
		t.Fatal(requestErr)
	}
	recoveryCode := f.deliver(t, "new-destination@example.test")
	verified, verifyErr := f.service.VerifyEmail(t.Context(), recoveryID, recoveryCode, f.browser, "127.0.0.1", nil, identity.PortalCustomer)
	if verifyErr != nil || verified.Token != "" || verified.Purpose != "recovery" {
		t.Fatal("destination proof granted account access", verifyErr)
	}
	requests, listErr := f.service.Recoveries(t.Context(), owner)
	if listErr != nil || len(requests) != 1 {
		t.Fatal("missing reviewed recovery", listErr)
	}
	if err = f.service.ResolveRecovery(t.Context(), owner, requests[0].ID, "case-123", true); err != nil {
		t.Fatal(err)
	}
	recovered, loadErr := f.client.User.Get(t.Context(), changed.ID)
	if loadErr != nil || recovered.Email != "new-destination@example.test" || !recovered.MfaEnabled || !recovered.Suspended {
		t.Fatal("recovery weakened existing account controls", loadErr)
	}
	linked, linkedErr := f.client.AuthIdentity.Query().Count(t.Context())
	if linkedErr != nil || linked != 0 {
		t.Fatal("recovery kept Google identity", linkedErr)
	}
	if err = f.service.ResolveRecovery(t.Context(), owner, requests[0].ID, "case-123", true); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("recovery approval replayed", err)
	}
	if err = f.service.ResolveRecovery(t.Context(), owner, requests[0].ID, "contains private free text", true); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("invalid case reference accepted", err)
	}
}

func TestIdentitySharedLimitsAcrossInstances(t *testing.T) {
	f := authDB(t, nil)
	second, newErr := identity.New(f.client, f.cfg, func() time.Time { return time.Unix(f.clock.Load(), 0) }, nil)
	if newErr != nil {
		t.Fatal(newErr)
	}
	var allowed atomic.Int64
	var wait sync.WaitGroup
	problems := make(chan error, 12)
	for i := range 12 {
		wait.Go(func() {
			service := f.service
			if i%2 == 0 {
				service = second
			}
			ok, err := service.Throttle(t.Context(), "test.shared", "same-client", 5, time.Minute)
			if err != nil {
				problems <- err
			}
			if ok {
				allowed.Add(1)
			}
		})
	}
	wait.Wait()
	close(problems)
	for err := range problems {
		t.Error(err)
	}
	if allowed.Load() != 5 {
		t.Fatalf("shared limit winners %d", allowed.Load())
	}
}

func TestIdentityFailsClosedWhenSecurityMutexIsMissing(t *testing.T) {
	f := authDB(t, nil)
	_, p := f.login(t, "mutex@example.test")
	_, _, p = f.enroll(t, p)
	if _, err := f.db.ExecContext(t.Context(), "DELETE FROM auth_controls WHERE id=1"); err != nil {
		t.Fatal(err)
	}
	if err := f.service.BootstrapOwner(t.Context(), p.User.ID, "operator-test"); !errors.Is(err, identity.ErrUnavailable) {
		t.Fatal("missing control row allowed owner mutation", err)
	}
}

func TestIdentityConcurrentOwnersCannotRemoveLastOwner(t *testing.T) {
	f := authDB(t, nil)
	principals := make([]*identity.Principal, 2)
	for i, email := range []string{"first-owner@example.test", "second-owner@example.test"} {
		if _, err := f.client.User.Create().SetPortal(string(identity.PortalAdmin)).SetEmail(email).SetRole(identity.RoleOwner).SetEmailVerifiedAt(time.Unix(f.clock.Load(), 0)).SetTermsVersion("test-v1").Save(t.Context()); err != nil {
			t.Fatal(err)
		}
		_, p := f.login(t, email, identity.PortalAdmin)
		_, _, p = f.enroll(t, p)
		principals[i] = p
	}
	var wait sync.WaitGroup
	var succeeded atomic.Int64
	outcomes := make(chan error, 2)
	for _, p := range principals {
		wait.Go(func() {
			err := f.service.GrantRole(t.Context(), p, p.User.ID, identity.RoleAdmin)
			if err == nil {
				succeeded.Add(1)
			} else {
				outcomes <- err
			}
		})
	}
	wait.Wait()
	close(outcomes)
	for err := range outcomes {
		if !errors.Is(err, identity.ErrConflict) {
			t.Error(err)
		}
	}
	if succeeded.Load() != 1 {
		t.Fatalf("owner removal winners %d", succeeded.Load())
	}
	remaining, err := f.client.User.Query().Where(user.RoleEQ(identity.RoleOwner), user.SuspendedEQ(false)).Count(t.Context())
	if err != nil || remaining != 1 {
		t.Fatal("last-owner invariant lost under concurrent requests", err)
	}
}

func TestIdentityRecoveryRegenerationFencesOldCodes(t *testing.T) {
	f := authDB(t, nil)
	_, p := f.login(t, "regenerate@example.test")
	_, oldCodes, p := f.enroll(t, p)
	result, err := f.service.RegenerateRecoveryCodes(t.Context(), p)
	if err != nil || len(result.RecoveryCodes) != 10 {
		t.Fatal("recovery regeneration failed", err)
	}
	current := f.principal(t, result.Token)
	if _, err = f.service.VerifyMFA(t.Context(), current, oldCodes[0], "127.0.0.1"); !errors.Is(err, identity.ErrInvalid) {
		t.Fatal("regenerated recovery codes left an old code valid", err)
	}
	var wins atomic.Int64
	var wait sync.WaitGroup
	wait.Go(func() {
		if _, replaceErr := f.service.RegenerateRecoveryCodes(t.Context(), current); replaceErr == nil {
			wins.Add(1)
		}
	})
	wait.Go(func() {
		if _, useErr := f.service.VerifyMFA(t.Context(), current, result.RecoveryCodes[0], "127.0.0.1"); useErr == nil {
			wins.Add(1)
		}
	})
	wait.Wait()
	if wins.Load() != 1 {
		t.Fatalf("concurrent regeneration/code-use winners %d", wins.Load())
	}
}
