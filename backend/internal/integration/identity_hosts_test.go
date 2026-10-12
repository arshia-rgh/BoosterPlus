//go:build integration

package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestStaffPortalHostsBindCallbacksSessionsAndCSRF(t *testing.T) {
	provider := &googleStub{assertion: identity.GoogleIdentity{Subject: "host-bound-google", Email: "host-bound@example.test"}}
	f := authDB(t, provider)
	f.cfg.PublicOrigin = "https://playora.example"
	f.cfg.AdminPublicOrigin = "https://admin.playora.example"
	f.cfg.BoosterPublicOrigin = "https://booster.playora.example"
	f.cfg.SecureCookies = true
	var err error
	f.service, err = identity.New(f.client, f.cfg, func() time.Time { return time.Unix(f.clock.Load(), 0) }, provider)
	if err != nil {
		t.Fatal(err)
	}
	for _, portal := range []identity.Portal{identity.PortalAdmin, identity.PortalBooster} {
		role := identity.RoleAdmin
		if portal == identity.PortalBooster {
			role = identity.RoleBooster
		}
		account, err := f.client.User.Create().SetPortal(string(portal)).SetEmail(provider.assertion.Email).SetEmailVerifiedAt(time.Unix(f.clock.Load(), 0)).SetRole(role).SetTermsVersion("test-v1").Save(t.Context())
		if err != nil {
			t.Fatal(err)
		}
		if _, err = f.client.AuthIdentity.Create().SetID("host-bound-link-" + string(portal)).SetUserID(account.ID).SetPortal(account.Portal).SetProvider("google").SetSubject(provider.assertion.Subject).SetCreatedAt(time.Unix(f.clock.Load(), 0)).Save(t.Context()); err != nil {
			t.Fatal(err)
		}
	}
	mux := http.NewServeMux()
	f.service.Register(mux)
	for portal, origin := range map[identity.Portal]string{identity.PortalAdmin: f.cfg.AdminPublicOrigin, identity.PortalBooster: f.cfg.BoosterPublicOrigin} {
		t.Run(string(portal), func(t *testing.T) {
			f.clock.Add(61)
			provider.assertion.IssuedAt, provider.assertion.AuthenticatedAt = time.Unix(f.clock.Load(), 0), time.Unix(f.clock.Load(), 0)
			location, e := f.service.StartGoogle(t.Context(), nil, f.browser, "127.0.0.1", "login", true, portal)
			if e != nil {
				t.Fatal(e)
			}
			startURL, e := url.Parse(location)
			if e != nil {
				t.Fatal(e)
			}
			prefix := "/api/v1/auth/portals/" + string(portal)
			callback := prefix + "/google/callback?state=" + url.QueryEscape(startURL.Query().Get("state")) + "&code=fixture-code&return_to=https://evil.example"
			browser := &http.Cookie{Name: "__Host-bp-" + string(portal) + "-browser", Value: f.browser, Path: "/", Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
			for _, wrongOrigin := range []string{f.cfg.PublicOrigin, "https://evil.example"} {
				r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, callback, nil)
				r.Header.Set("X-Booster-Proxy-Key", f.cfg.ProxyKey)
				r.Header.Set("X-Playora-Request-Origin", wrongOrigin)
				r.AddCookie(browser)
				w := httptest.NewRecorder()
				mux.ServeHTTP(w, r)
				if w.Code != http.StatusForbidden || w.Header().Get("Set-Cookie") != "" || w.Header().Get("Location") != "" {
					t.Fatal("wrong host callback affected authentication", w.Code)
				}
			}
			r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, callback, nil)
			r.Header.Set("X-Booster-Proxy-Key", f.cfg.ProxyKey)
			r.Header.Set("X-Playora-Request-Origin", origin)
			r.AddCookie(browser)
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, r)
			if w.Code != http.StatusSeeOther || w.Header().Get("Location") != origin+"/" {
				t.Fatal("valid host callback failed or trusted return_to", w.Code, w.Header().Get("Location"))
			}
			response := w.Result()
			cookies := response.Cookies()
			if e = response.Body.Close(); e != nil {
				t.Fatal(e)
			}
			if len(cookies) != 1 || cookies[0].Name != "__Host-bp-"+string(portal)+"-session" || cookies[0].Domain != "" || !cookies[0].Secure || !cookies[0].HttpOnly || cookies[0].Path != "/" {
				t.Fatal("portal callback cookie lost host isolation")
			}
			if !f.principal(t, cookies[0].Value, portal).NeedsMFA() {
				t.Fatal("portal-host migration bypassed staff MFA")
			}
			assertHostBoundSession(t, mux, f.cfg, portal, origin, browser, cookies[0])
			w = httptest.NewRecorder()
			mux.ServeHTTP(w, r)
			if w.Code != http.StatusSeeOther || w.Header().Get("Location") != origin+"/login?error=verification" {
				t.Fatal("replayed callback failed to stay in same portal", w.Code)
			}
		})
	}
}

func assertHostBoundSession(t *testing.T, mux *http.ServeMux, cfg identity.Config, portal identity.Portal, origin string, browser, session *http.Cookie) {
	t.Helper()
	request := func(method, path, hostOrigin, browserOrigin, csrf string) *httptest.ResponseRecorder {
		t.Helper()
		r := httptest.NewRequestWithContext(t.Context(), method, path, strings.NewReader("{}"))
		r.Header.Set("X-Booster-Proxy-Key", cfg.ProxyKey)
		r.Header.Set("X-Playora-Request-Origin", hostOrigin)
		r.Header.Set("Origin", browserOrigin)
		r.Header.Set("X-Csrf-Token", csrf)
		r.Header.Set("Content-Type", "application/json")
		r.AddCookie(browser)
		r.AddCookie(session)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}
	prefix := "/api/v1/auth/portals/" + string(portal)
	if w := request(http.MethodGet, prefix+"/session", cfg.PublicOrigin, "", ""); w.Code != http.StatusForbidden {
		t.Fatal("staff session bootstrapped on customer host", w.Code)
	}
	w := request(http.MethodGet, prefix+"/session", origin, "", "")
	var bootstrap struct {
		CSRF string `json:"csrf_token"`
	}
	if w.Code != http.StatusOK || json.Unmarshal(w.Body.Bytes(), &bootstrap) != nil || bootstrap.CSRF == "" {
		t.Fatal("same-host bootstrap failed", w.Code)
	}
	if w = request(http.MethodGet, "/api/v1/portal/"+string(portal), origin, "", ""); w.Code != http.StatusForbidden || !strings.Contains(w.Body.String(), "mfa_required") {
		t.Fatal("host-bound first factor bypassed MFA", w.Code)
	}
	if w = request(http.MethodPost, prefix+"/logout", origin, cfg.PublicOrigin, bootstrap.CSRF); w.Code != http.StatusForbidden {
		t.Fatal("sibling origin mutated staff session", w.Code)
	}
	if w = request(http.MethodPost, prefix+"/logout", origin, origin, bootstrap.CSRF); w.Code != http.StatusNoContent {
		t.Fatal("same-origin session logout failed", w.Code)
	}
}

func TestAuthenticatedPortalHostsRejectSiblingSessions(t *testing.T) {
	f := authDB(t, nil)

	f.cfg.PublicOrigin = "https://playora.example"
	f.cfg.AdminPublicOrigin = "https://admin.playora.example"
	f.cfg.BoosterPublicOrigin = "https://pro.playora.example"
	f.cfg.SecureCookies = true
	var err error
	f.service, err = identity.New(f.client, f.cfg, func() time.Time { return time.Unix(f.clock.Load(), 0) }, nil)
	if err != nil {
		t.Fatal(err)
	}
	origins := map[identity.Portal]string{identity.PortalCustomer: f.cfg.PublicOrigin, identity.PortalAdmin: f.cfg.AdminPublicOrigin, identity.PortalBooster: f.cfg.BoosterPublicOrigin}
	tokens := map[identity.Portal]string{}
	for portal := range origins {
		f.clock.Add(121)
		var pending *identity.Principal
		if portal == identity.PortalCustomer {
			_, pending = f.login(t, "host-isolated-owner@example.test")
		} else {
			role := identity.RoleAdmin
			if portal == identity.PortalBooster {
				role = identity.RoleBooster
			}
			_, pending = f.staffLogin(t, "host-isolated-owner@example.test", role)
		}
		_, _, tokens[portal], _ = f.enrollToken(t, pending)
	}
	mux := http.NewServeMux()
	f.service.Register(mux)
	for hostPortal, origin := range origins {
		for requestedPortal := range origins {
			for cookiePortal, token := range tokens {
				r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/me", nil)
				r.Header.Set("X-Booster-Proxy-Key", f.cfg.ProxyKey)
				r.Header.Set("X-Playora-Request-Origin", origin)
				r.Header.Set("X-Playora-Portal", string(requestedPortal))
				// Even renaming a valid fully verified sibling token cannot grant
				// authority in the requested audience or on the wrong host.
				r.AddCookie(&http.Cookie{Name: "__Host-bp-" + string(requestedPortal) + "-session", Value: token, Path: "/", Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
				w := httptest.NewRecorder()
				mux.ServeHTTP(w, r)
				want := http.StatusOK
				if hostPortal != requestedPortal {
					want = http.StatusForbidden
				} else if cookiePortal != requestedPortal {
					want = http.StatusUnauthorized
				}
				if w.Code != want {
					t.Fatalf("host=%s audience=%s token=%s: got %d want %d", hostPortal, requestedPortal, cookiePortal, w.Code, want)
				}
				if hostPortal != requestedPortal && w.Header().Get("Set-Cookie") != "" {
					t.Fatal("sibling host altered authenticated cookie state")
				}
			}
		}
	}
	for hostPortal, origin := range origins {
		for _, portal := range []identity.Portal{identity.PortalAdmin, identity.PortalBooster} {
			r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/portal/"+string(portal), nil)
			r.Header.Set("X-Booster-Proxy-Key", f.cfg.ProxyKey)
			r.Header.Set("X-Playora-Request-Origin", origin)
			r.AddCookie(&http.Cookie{Name: "__Host-bp-" + string(portal) + "-session", Value: tokens[portal], Path: "/", Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, r)
			want := http.StatusForbidden
			if hostPortal == portal {
				want = http.StatusOK
			}
			if w.Code != want {
				t.Fatalf("host=%s privileged audience=%s: got %d want %d", hostPortal, portal, w.Code, want)
			}
		}
	}
}
