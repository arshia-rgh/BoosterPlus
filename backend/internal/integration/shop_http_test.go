//go:build integration

package integration

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/pquerna/otp/totp"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestShopCatalogHTTPPortalCSRFAndStrictInput(t *testing.T) {
	f := orderDB(t)
	_, pending := f.auth.staffLogin(t, "shop-http-admin@example.test", identity.RoleAdmin)
	enrollment, err := f.auth.service.EnrollMFA(t.Context(), pending)
	if err != nil {
		t.Fatal(err)
	}
	code, err := totp.GenerateCode(enrollment.Secret, time.Unix(f.auth.clock.Load(), 0))
	if err != nil {
		t.Fatal(err)
	}
	verified, err := f.auth.service.VerifyMFA(t.Context(), pending, code, "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	store := shopStore(f)
	handler := httpapi.New(f.auth.db.PingContext, slog.New(slog.DiscardHandler), false, f.auth.service.Register, store.Register)
	cookie := &http.Cookie{Name: "bp-admin-session", Value: verified.Token, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode}
	request := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/auth/portals/admin/session", nil)
	request.AddCookie(cookie)
	bootstrap := httptest.NewRecorder()
	handler.ServeHTTP(bootstrap, request)
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err = json.Unmarshal(bootstrap.Body.Bytes(), &session); err != nil || session.CSRF == "" {
		t.Fatal("session bootstrap", err)
	}
	response := bootstrap.Result()
	cookies := response.Cookies()
	if err = response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	call := func(method, path, body, origin, csrf, content string) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(t.Context(), method, path, strings.NewReader(body))
		r.AddCookie(cookie)
		for _, c := range cookies {
			r.AddCookie(c)
		}
		r.Header.Set("Origin", origin)
		r.Header.Set("X-Csrf-Token", csrf)
		r.Header.Set("Content-Type", content)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	path := "/api/v1/admin/shop/products"
	raw, err := json.Marshal(map[string]any{"game_id": f.game.ID, "definition": shopDefinition()})
	if err != nil {
		t.Fatal(err)
	}
	body := string(raw)
	for _, pair := range [][2]string{{"https://evil.test", session.CSRF}, {"http://localhost", ""}} {
		if got := call(http.MethodPost, path, body, pair[0], pair[1], "application/json"); got.Code != http.StatusForbidden {
			t.Fatal("CSRF accepted", got.Code)
		}
	}
	for _, invalid := range []string{body + body, `{"game_id":"` + f.game.ID + `","extra":true}`, "null", strings.Repeat("x", 262145)} {
		if got := call(http.MethodPost, path, invalid, "http://localhost", session.CSRF, "application/json"); got.Code != http.StatusUnprocessableEntity {
			t.Fatal("invalid body accepted", got.Code)
		}
	}
	if got := call(http.MethodPost, path, body, "http://localhost", session.CSRF, "text/plain"); got.Code != http.StatusUnprocessableEntity {
		t.Fatal("content type accepted", got.Code)
	}
	created := call(http.MethodPost, path, body, "http://localhost", session.CSRF, "application/json")
	if created.Code != http.StatusOK || created.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("creation failed or cacheable", created.Code)
	}
	var row struct {
		ID string `json:"id"`
	}
	if err = json.Unmarshal(created.Body.Bytes(), &row); err != nil || row.ID == "" {
		t.Fatal("missing product", err)
	}
	for _, suffix := range []string{"", "/preview", "/releases"} {
		got := call(http.MethodGet, path+"/"+row.ID+suffix, "", "", "", "")
		if got.Code != http.StatusOK || got.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("private read failed or cacheable", got.Code)
		}
	}
	if got := call(http.MethodPost, path+"/"+row.ID+"/publish", `{"version":1,"amount":"1"}`, "http://localhost", session.CSRF, "application/json"); got.Code != http.StatusUnprocessableEntity {
		t.Fatal("publication extra field accepted", got.Code)
	}
	customerToken, _ := f.auth.login(t, "shop-http-customer@example.test")
	for _, token := range []string{customerToken, ""} {
		cookie = &http.Cookie{Name: "bp-admin-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
		for _, suffix := range []string{"", "/" + row.ID, "/" + row.ID + "/preview", "/" + row.ID + "/releases"} {
			if got := call(http.MethodGet, path+suffix, "", "", "", ""); got.Code != http.StatusUnauthorized {
				t.Fatal("wrong portal read accepted", got.Code)
			}
		}
	}
}
