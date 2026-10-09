package identity

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"golang.org/x/oauth2"
)

func splitPortalConfig() Config {
	return Config{Key: []byte("isolated-test-key-for-portals-123"), ProxyKey: strings.Repeat("synthetic-proxy", 4), PublicOrigin: "https://playora.example", AdminPublicOrigin: "https://admin.playora.example", BoosterPublicOrigin: "https://booster.playora.example", SecureCookies: true}
}

func TestPortalOriginsBindEveryAuthenticatedAudience(t *testing.T) {
	s := &Service{config: splitPortalConfig()}
	browser := "synthetic-browser-binding-with-at-least-forty-characters"
	for _, target := range []Portal{PortalCustomer, PortalAdmin, PortalBooster} {
		for _, source := range []Portal{PortalCustomer, PortalAdmin, PortalBooster} {
			for _, method := range []string{http.MethodGet, http.MethodPost} {
				t.Run(string(source)+"/"+string(target)+"/"+method, func(t *testing.T) {
					r := httptest.NewRequestWithContext(t.Context(), method, "/api/v1/auth/portals/"+string(target)+"/session", nil)
					r.Header.Set("X-Booster-Proxy-Key", s.config.ProxyKey)
					r.Header.Set("X-Playora-Request-Origin", s.config.portalOrigin(source))
					r.Header.Set("Origin", s.config.portalOrigin(target))
					r.Header.Set("X-Csrf-Token", s.csrf(target, browser, ""))
					r.AddCookie(&http.Cookie{Name: s.cookieName(target, "browser"), Value: browser, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode})
					w := httptest.NewRecorder()
					s.handle(func(w http.ResponseWriter, _ *http.Request, state requestState) error {
						if state.portal != target {
							t.Fatal("incorrect portal")
						}
						w.WriteHeader(http.StatusNoContent)
						return nil
					})(w, r)
					want := http.StatusForbidden
					if target == source {
						want = http.StatusNoContent
					}
					if w.Code != want {
						t.Fatalf("got %d want %d", w.Code, want)
					}
					if source != target && w.Header().Get("Set-Cookie") != "" {
						t.Fatal("wrong origin changed browser state")
					}
				})
			}
			if s.config.mutationOriginMatches(s.config.portalOrigin(source), target) != (source == target) {
				t.Fatal("sibling portal passed mutation Origin boundary")
			}
		}
	}
}

func TestPortalProxyHeaderCannotBeSpoofedOrAmbiguous(t *testing.T) {
	cfg := splitPortalConfig()
	for _, scenario := range []string{"valid", "missing origin", "untrusted key", "missing key", "two origins", "two keys", "unknown origin", "trailing slash", "comma origins", "customer host"} {
		t.Run(scenario, func(t *testing.T) {
			r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/auth/portals/admin/google/callback", nil)
			r.Header.Set("X-Booster-Proxy-Key", cfg.ProxyKey)
			r.Header.Set("X-Playora-Request-Origin", cfg.AdminPublicOrigin)
			r.Header.Set("X-Forwarded-Host", "admin.playora.example")
			r.Header.Set("Origin", cfg.AdminPublicOrigin)
			switch scenario {
			case "missing origin":
				r.Header.Del("X-Playora-Request-Origin")
			case "untrusted key":
				r.Header.Set("X-Booster-Proxy-Key", "untrusted")
			case "missing key":
				r.Header.Del("X-Booster-Proxy-Key")
			case "two origins":
				r.Header.Add("X-Playora-Request-Origin", cfg.AdminPublicOrigin)
			case "two keys":
				r.Header.Add("X-Booster-Proxy-Key", cfg.ProxyKey)
			case "unknown origin":
				r.Header.Set("X-Playora-Request-Origin", "https://evil.example")
			case "trailing slash":
				r.Header.Set("X-Playora-Request-Origin", cfg.AdminPublicOrigin+"/")
			case "comma origins":
				r.Header.Set("X-Playora-Request-Origin", cfg.AdminPublicOrigin+", "+cfg.PublicOrigin)
			case "customer host":
				r.Header.Set("X-Playora-Request-Origin", cfg.PublicOrigin)
			}
			if cfg.requestOriginMatches(r, PortalAdmin, false) != (scenario == "valid") {
				t.Fatal("unsafe proxy origin accepted or valid request rejected")
			}
		})
	}
}

func TestPortalPublicReadExceptionNeverGrantsCrossHostAuthOrMutations(t *testing.T) {
	cfg := splitPortalConfig()
	for _, method := range []string{http.MethodGet, http.MethodHead, http.MethodPost, http.MethodPut, http.MethodDelete} {
		for _, origin := range []string{cfg.AdminPublicOrigin, cfg.BoosterPublicOrigin, "https://unknown.example"} {
			r := httptest.NewRequestWithContext(t.Context(), method, "/api/v1/site/legal", nil)
			r.Header.Set("X-Booster-Proxy-Key", cfg.ProxyKey)
			r.Header.Set("X-Playora-Request-Origin", origin)
			want := origin != "https://unknown.example" && (method == http.MethodGet || method == http.MethodHead)
			if cfg.requestOriginMatches(r, PortalCustomer, true) != want || cfg.requestOriginMatches(r, PortalCustomer, false) {
				t.Fatal("public exception broadened authenticated/mutation authority")
			}
		}
	}
	cfg.AllowedOrigins = []string{"https://dev.example"}
	if cfg.mutationOriginMatches("https://dev.example", PortalAdmin) || cfg.mutationOriginMatches("null", PortalAdmin) || cfg.mutationOriginMatches("", PortalAdmin) {
		t.Fatal("split portals accepted legacy/wildcard origins")
	}
	cfg.AdminPublicOrigin, cfg.BoosterPublicOrigin = "", ""
	if !cfg.mutationOriginMatches("https://dev.example", PortalAdmin) {
		t.Fatal("local path-mode origin compatibility removed")
	}
}

func TestPortalRedirectAndNotificationDestinations(t *testing.T) {
	for _, split := range []bool{false, true} {
		cfg := splitPortalConfig()
		if !split {
			cfg.AdminPublicOrigin, cfg.BoosterPublicOrigin = "", ""
		}
		s := &Service{config: cfg}
		for _, portal := range []Portal{PortalCustomer, PortalAdmin, PortalBooster} {
			origin, home, login := cfg.portalOrigin(portal), portal.home(), portal.login()
			if split && portal != PortalCustomer {
				home, login = "/", "/login"
			}
			if cfg.portalHomeURL(portal) != origin+home || cfg.portalLoginURL(portal) != origin+login {
				t.Fatal("portal redirects leave configured workspace")
			}
			path := "/orders/id?view=messages#latest"
			if portal != PortalCustomer {
				path = "/" + string(portal) + path
			}
			wantPath := path
			if split && portal != PortalCustomer {
				wantPath = strings.TrimPrefix(path, "/"+string(portal))
			}
			got, err := s.PortalLink(portal, path)
			if err != nil || got != origin+wantPath {
				t.Fatal("incorrect notification destination", got, err)
			}
		}
	}
	s := &Service{config: splitPortalConfig()}
	for _, path := range []string{"https://evil.example", "//evil.example", "/\\evil.example", "/admin/../../outside", "/admin/%2e%2e/outside", "/admin%2F%2Fevil.example", "/admin//evil.example", "/booster/orders/id", "/admin/%5cevil", "/admin/%0d%0aLocation:evil"} {
		if _, err := s.PortalLink(PortalAdmin, path); !errors.Is(err, ErrInvalid) {
			t.Fatal("unsafe portal link accepted", path)
		}
	}
	for _, path := range []string{"/admin", "/admin/orders/id", "/booster/login", "/%61dmin/orders/id"} {
		if _, err := s.PortalLink(PortalCustomer, path); !errors.Is(err, ErrInvalid) {
			t.Fatal("customer link crossed audience", path)
		}
	}
}

func TestGoogleAuthorizationUsesExactPortalCallbackOrigin(t *testing.T) {
	cfg := splitPortalConfig()
	provider := &oidcGoogle{origins: cfg, oauth: oauth2.Config{ClientID: "synthetic-client", Endpoint: oauth2.Endpoint{AuthURL: "https://provider.example/authorize"}}}
	for _, portal := range []Portal{PortalCustomer, PortalAdmin, PortalBooster} {
		location, err := url.Parse(provider.AuthorizationURL("state", "nonce", "verifier", portal))
		if err != nil || location.Query().Get("redirect_uri") != cfg.portalOrigin(portal)+"/api/v1/auth/portals/"+string(portal)+"/google/callback" {
			t.Fatal("OAuth callback is not bound to configured portal", err)
		}
	}
	if provider.AuthorizationURL("state", "nonce", "verifier", "unknown") != "" {
		t.Fatal("unknown portal accepted")
	}
}
