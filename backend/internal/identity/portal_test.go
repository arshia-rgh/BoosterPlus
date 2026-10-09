package identity

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPortalSelection(t *testing.T) {
	for _, c := range []struct {
		method, path, header string
		want                 Portal
		failure              error
	}{
		{"GET", "/api/v1/auth/session", "", PortalCustomer, nil},
		{"GET", "/api/v1/auth/session", "admin", "", ErrForbidden},
		{"GET", "/api/v1/auth/portals/booster/session", "", PortalBooster, nil},
		{"GET", "/api/v1/auth/portals/admin/session", "customer", "", ErrForbidden},
		{"GET", "/api/v1/auth/portals/owner/session", "", "", ErrInvalid},
		{"GET", "/api/v1/admin/orders", "", PortalAdmin, nil},
		{"GET", "/api/v1/admin/orders?portal=customer", "", "", ErrInvalid},
		{"GET", "/api/v1/booster/fulfillment", "", PortalBooster, nil},
		{"GET", "/api/v1/orders", "admin", "", ErrForbidden},
		{"GET", "/api/v1/me/overview", "booster", "", ErrForbidden},
		{"GET", "/api/v1/me/favorites", "admin", "", ErrForbidden},
		{"GET", "/api/v1/me", "booster", PortalBooster, nil},
		{"POST", "/api/v1/me/profile", "admin", PortalAdmin, nil},
		{"GET", "/api/v1/conversations/id/stream?portal=booster", "", PortalBooster, nil},
		{"GET", "/api/v1/media/id/content?portal=booster", "", PortalBooster, nil},
		{"POST", "/api/v1/conversations/id/messages?portal=booster", "", "", ErrInvalid},
		{"GET", "/api/v1/me?portal=admin", "booster", "", ErrInvalid},
		{"GET", "/api/v1/me?portal=admin&portal=admin", "", "", ErrInvalid},
		{"GET", "/api/v1/me?portal=", "", "", ErrInvalid},
		{"GET", "/api/v1/me", "admin,booster", "", ErrInvalid},
	} {
		t.Run(c.method+c.path+c.header, func(t *testing.T) {
			r := httptest.NewRequestWithContext(t.Context(), c.method, c.path, nil)
			if c.header != "" {
				r.Header.Set("X-Playora-Portal", c.header)
			}
			got, err := requestPortal(r)
			if got != c.want || !errors.Is(err, c.failure) {
				t.Fatalf("got %q / %v; want %q / %v", got, err, c.want, c.failure)
			}
		})
	}
	r := httptest.NewRequestWithContext(t.Context(), "GET", "/api/v1/me", nil)
	r.Header.Add("X-Playora-Portal", "admin")
	r.Header.Add("X-Playora-Portal", "admin")
	if _, err := requestPortal(r); !errors.Is(err, ErrInvalid) {
		t.Fatal("duplicate context accepted")
	}
}
func TestPortalRoleEligibility(t *testing.T) {
	for _, portal := range []Portal{PortalCustomer, PortalAdmin, PortalBooster, "", "owner"} {
		for _, role := range []string{RoleCustomer, RoleBooster, RoleAdmin, RoleOwner, ""} {
			want := portal == PortalCustomer && role == RoleCustomer || portal == PortalAdmin && (role == RoleAdmin || role == RoleOwner) || portal == PortalBooster && role == RoleBooster
			if portal.permitsRole(role) != want {
				t.Fatalf("unexpected %s / %s eligibility", portal, role)
			}
		}
	}
}

func TestPortalCookiesCSRFAndDigestDomains(t *testing.T) {
	for _, secure := range []bool{false, true} {
		s := &Service{config: Config{Key: []byte("isolated-test-key-for-portals-123"), SecureCookies: secure, PublicOrigin: "https://playora.example"}}
		browser := "synthetic-browser-binding-with-at-least-forty-characters"
		for _, portal := range []Portal{PortalCustomer, PortalAdmin, PortalBooster} {
			w := httptest.NewRecorder()
			s.cookie(w, portal, "browser", browser, 3600)
			response := w.Result()
			cookies := response.Cookies()
			if err := response.Body.Close(); err != nil {
				t.Fatal(err)
			}
			if len(cookies) != 1 || !cookies[0].HttpOnly || cookies[0].Secure != secure || cookies[0].SameSite != http.SameSiteLaxMode || cookies[0].Path != "/" || cookies[0].Domain != "" {
				t.Fatal("portal cookie policy weakened")
			}
			want := "bp-" + string(portal) + "-browser"
			if secure {
				want = "__Host-" + want
			}
			if cookies[0].Name != want {
				t.Fatal("unscoped cookie", cookies[0].Name)
			}
			for _, source := range []Portal{PortalCustomer, PortalAdmin, PortalBooster} {
				r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/api/v1/auth/portals/"+string(portal)+"/logout", nil)
				r.AddCookie(cookies[0])
				r.Header.Set("Origin", s.config.PublicOrigin)
				r.Header.Set("X-Csrf-Token", s.csrf(source, browser, ""))
				out := httptest.NewRecorder()
				s.handle(func(w http.ResponseWriter, _ *http.Request, state requestState) error {
					if state.portal != portal {
						t.Fatal("wrong selected context")
					}
					w.WriteHeader(http.StatusNoContent)
					return nil
				})(out, r)
				expected := http.StatusForbidden
				if source == portal {
					expected = http.StatusNoContent
				}
				if out.Code != expected {
					t.Fatalf("CSRF %s into %s: %d", source, portal, out.Code)
				}
				if source != portal && (s.sessionDigest(source, "same-token") == s.sessionDigest(portal, "same-token") || s.browserDigest(source, browser) == s.browserDigest(portal, browser)) {
					t.Fatal("cross-portal digest collision")
				}
			}
		}
	}
}

func TestLegacyCookiesNeverAuthenticateOrBindNewPortal(t *testing.T) {
	s := &Service{config: Config{Key: []byte("isolated-test-key-for-portals-123")}}
	r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/auth/portals/admin/session", nil)
	for _, name := range []string{"bp-session", "bp-browser", "bp-customer-session", "bp-customer-browser"} {
		r.AddCookie(&http.Cookie{Name: name, Value: "synthetic-legacy-cookie-with-at-least-forty-characters", Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
	}
	out := httptest.NewRecorder()
	s.handle(func(w http.ResponseWriter, _ *http.Request, state requestState) error {
		if state.principal != nil || state.token != "" || state.browser == "synthetic-legacy-cookie-with-at-least-forty-characters" {
			t.Fatal("legacy/cross-portal cookie used")
		}
		w.WriteHeader(http.StatusNoContent)
		return nil
	})(out, r)
	if out.Code != http.StatusNoContent {
		t.Fatal(out.Code)
	}
}
