package identity

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"sync/atomic"
	"testing"
	"time"

	jose "github.com/go-jose/go-jose/v4"
	"golang.org/x/oauth2"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

func TestCapabilityMatrixAndPendingMFA(t *testing.T) {
	// Explicit grants ensure adding a portal or role cannot silently expand access.
	grants := map[Portal]map[string][]string{
		PortalCustomer: {
			RoleCustomer: {"self", "account"},
		},
		PortalBooster: {RoleBooster: {"self", "booster"}},
		PortalAdmin:   {RoleAdmin: {"self", "admin", "users.read"}, RoleOwner: {"self", "admin", "users.read", "owner", "audit", "staff.manage", "recovery"}},
	}
	for _, portal := range []Portal{PortalCustomer, PortalBooster, PortalAdmin, "", "unknown"} {
		for _, role := range []string{RoleCustomer, RoleBooster, RoleAdmin, RoleOwner, "unknown"} {
			for _, verified := range []bool{false, true} {
				for _, capability := range []string{"self", "account", "booster", "admin", "users.read", "owner", "audit", "staff.manage", "recovery", "unknown"} {
					p := &Principal{User: &ent.User{Portal: string(portal), Role: role}, Session: &ent.AuthSession{Portal: string(portal)}}
					if verified {
						now := time.Now()
						p.Session.MfaVerifiedAt = &now
					}
					expected := (role == RoleCustomer || verified) && slices.Contains(grants[portal][role], capability)
					if (Require(p, capability) == nil) != expected {
						t.Fatalf("portal=%s role=%s MFA=%v capability=%s", portal, role, verified, capability)
					}
				}
			}
		}
	}
	for _, p := range []*Principal{nil, {}, {User: &ent.User{}}, {Session: &ent.AuthSession{}}} {
		if err := Require(p, "self"); !errors.Is(err, ErrUnauthenticated) {
			t.Fatal(err)
		}
	}
	p := &Principal{User: &ent.User{Portal: string(PortalCustomer), Role: RoleCustomer, MfaEnabled: true}, Session: &ent.AuthSession{Portal: string(PortalCustomer)}}
	if err := Require(p, "self"); !errors.Is(err, ErrMFA) {
		t.Fatal("enrolled customer bypassed MFA", err)
	}
}
func TestCryptographicDomainSeparationAndProxyBoundary(t *testing.T) {
	s := &Service{config: Config{Key: []byte(rand.Text() + "123456")}}
	ciphertext, err := s.seal("one", []byte("private"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.open("two", ciphertext); err == nil {
		t.Fatal("AAD substitution accepted")
	}
	ciphertext[len(ciphertext)-1] ^= 1
	if _, err = s.open("one", ciphertext); err == nil {
		t.Fatal("tampering accepted")
	}
	if s.digest("one", "token") == s.digest("two", "token") {
		t.Fatal("digest domains collide")
	}
	key := rand.Text() + rand.Text()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil)
	req.RemoteAddr = "192.0.2.1:5000"
	req.Header.Set("X-Forwarded-For", "198.51.100.2")
	req.Header.Set("X-Booster-Client-Ip", "198.51.100.2")
	req.Header.Set("X-Booster-Proxy-Key", "invalid")
	if clientIP(req, key) != "192.0.2.1" {
		t.Fatal("spoofed proxy accepted")
	}
	req.Header.Set("X-Booster-Proxy-Key", key)
	if clientIP(req, key) != "198.51.100.2" {
		t.Fatal("trusted proxy ignored")
	}
	for _, email := range []string{"A <a@example.test>", "a@example.test\r\nBCC:x@example.test", "no-at", "a@localhost", "a@@example.test", "é@example.test"} {
		if _, err = NormalizeEmail(email); err == nil {
			t.Fatalf("invalid email accepted %q", email)
		}
	}
	normalized, err := NormalizeEmail(" Person@Example.Test ")
	if err != nil || normalized != "person@example.test" {
		t.Fatal("normalization failed")
	}
}
func TestGoogleOIDCValidatesSignedProtocol(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	signer, err := jose.NewSigner(jose.SigningKey{Algorithm: jose.RS256, Key: key}, (&jose.SignerOptions{}).WithHeader("kid", "test-key"))
	if err != nil {
		t.Fatal(err)
	}
	var token atomic.Value
	token.Store("")
	var issuer string
	verifier := oauth2.GenerateVerifier()
	var badVerifier atomic.Bool
	var badRedirect atomic.Bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var payload any
		switch r.URL.Path {
		case "/.well-known/openid-configuration":
			payload = map[string]any{"issuer": issuer, "authorization_endpoint": issuer + "/authorize", "token_endpoint": issuer + "/token", "jwks_uri": issuer + "/keys", "id_token_signing_alg_values_supported": []string{"RS256"}}
		case "/keys":
			payload = jose.JSONWebKeySet{Keys: []jose.JSONWebKey{{Key: &key.PublicKey, KeyID: "test-key", Algorithm: "RS256", Use: "sig"}}}
		case "/token":
			if parseErr := r.ParseForm(); parseErr != nil {
				t.Error(parseErr)
			}
			if r.Form.Get("code_verifier") != verifier {
				badVerifier.Store(true)
			}
			if r.Form.Get("redirect_uri") != "https://admin.booster.example/api/v1/auth/portals/admin/google/callback" {
				badRedirect.Store(true)
			}
			payload = map[string]any{"access_token": "test-access", "token_type": "Bearer", "id_token": token.Load()}
		default:
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if encodeErr := json.NewEncoder(w).Encode(payload); encodeErr != nil {
			t.Error(encodeErr)
		}
	}))
	defer server.Close()
	issuer = server.URL
	provider, err := newOIDC(t.Context(), issuer, Config{GoogleClientID: "test-client", GoogleClientSecret: "test-secret", PublicOrigin: "https://booster.example", AdminPublicOrigin: "https://admin.booster.example", BoosterPublicOrigin: "https://boost.booster.example"}, server.Client())
	if err != nil {
		t.Fatal(err)
	}
	location, err := url.Parse(provider.AuthorizationURL("state", "nonce", verifier, PortalCustomer))
	if err != nil {
		t.Fatal(err)
	}
	query := location.Query()
	if query.Get("claims") != `{"id_token":{"auth_time":{"essential":true}}}` || query.Get("max_age") != "" || query.Get("prompt") != "select_account" || query.Get("state") != "state" || query.Get("nonce") != "nonce" || query.Get("code_challenge") != oauth2.S256ChallengeFromVerifier(verifier) || query.Get("code_challenge_method") != "S256" || query.Get("redirect_uri") != "https://booster.example/api/v1/auth/portals/customer/google/callback" {
		t.Fatal("invalid OAuth binding")
	}
	for _, scenario := range []string{"valid", "old Google session", "fresh Google session", "missing issued at", "stale issued at", "future issued at", "wrong issuer", "wrong audience", "wrong nonce", "expired", "unverified email", "empty subject", "wrong authorized party", "multi audience without authorized party", "tampered signature"} {
		t.Run(scenario, func(t *testing.T) {
			claims := map[string]any{"iss": issuer, "sub": "stable-subject", "aud": "test-client", "exp": time.Now().Add(time.Hour).Unix(), "iat": time.Now().Unix(), "nonce": "nonce", "email": "person@example.test", "email_verified": true}
			switch scenario {
			case "old Google session":
				claims["auth_time"] = time.Now().Add(-24 * time.Hour).Unix()
			case "fresh Google session":
				claims["auth_time"] = time.Now().Unix()
			case "missing issued at":
				delete(claims, "iat")
			case "stale issued at":
				claims["iat"] = time.Now().Add(-RecentTTL - time.Minute).Unix()
			case "future issued at":
				claims["iat"] = time.Now().Add(2 * time.Minute).Unix()
			case "wrong issuer":
				claims["iss"] = "https://evil.example"
			case "wrong audience":
				claims["aud"] = "different-client"
			case "wrong nonce":
				claims["nonce"] = "different-nonce"
			case "expired":
				claims["exp"] = time.Now().Add(-time.Hour).Unix()
			case "unverified email":
				claims["email_verified"] = false
			case "empty subject":
				claims["sub"] = ""
			case "wrong authorized party":
				claims["azp"] = "other-client"
			case "multi audience without authorized party":
				claims["aud"] = []string{"test-client", "other-client"}
			}
			payload, marshalErr := json.Marshal(claims)
			if marshalErr != nil {
				t.Fatal(marshalErr)
			}
			signed, signErr := signer.Sign(payload)
			if signErr != nil {
				t.Fatal(signErr)
			}
			raw, serializeErr := signed.CompactSerialize()
			if serializeErr != nil {
				t.Fatal(serializeErr)
			}
			if scenario == "tampered signature" {
				raw = raw[:len(raw)-10] + "AAAAAAAAAA"
			}
			token.Store(raw)
			assertion, exchangeErr := provider.Exchange(t.Context(), "code", verifier, "nonce", PortalAdmin)
			if scenario == "valid" || scenario == "old Google session" || scenario == "fresh Google session" {
				if exchangeErr != nil || assertion.Subject != "stable-subject" || !recentGoogleTime(assertion.IssuedAt, time.Now()) {
					t.Fatal("valid token rejected", exchangeErr)
				}
				if scenario != "fresh Google session" && recentGoogleTime(assertion.AuthenticatedAt, time.Now()) {
					t.Fatal("token issuance fabricated recent Google credential proof")
				}
			} else if !errors.Is(exchangeErr, ErrInvalid) {
				t.Fatal("invalid token accepted", exchangeErr)
			}
		})
	}
	if badVerifier.Load() || badRedirect.Load() {
		t.Fatal("PKCE verifier or exact portal redirect missing at token endpoint")
	}
}
