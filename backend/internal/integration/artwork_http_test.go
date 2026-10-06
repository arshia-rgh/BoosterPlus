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

	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

func TestArtworkHTTPPortalCSRFAndLimits(t *testing.T) {
	f := orderDB(t)
	_, first := f.auth.login(t, "artwork-http-admin@example.test")
	if _, err := f.auth.client.User.UpdateOneID(first.User.ID).SetRole("administrator").Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	pending := f.auth.enterPortal(t, first, identity.PortalAdmin)
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
	store, _ := artworkStore(t, f)
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

	path := "/api/v1/admin/artwork/" + uuid.NewString() + "/bytes?purpose=game&focus_x=50&focus_y=50"
	body := string(imageBytes(t))
	for _, pair := range [][2]string{{"https://evil.test", session.CSRF}, {"http://localhost", ""}} {
		if got := call(http.MethodPut, path, body, pair[0], pair[1], "image/png"); got.Code != http.StatusForbidden {
			t.Fatal("artwork CSRF", got.Code)
		}
	}
	if got := call(http.MethodPut, path, strings.Repeat("x", media.MaxBytes+1), "http://localhost", session.CSRF, "image/png"); got.Code != http.StatusUnprocessableEntity {
		t.Fatal("oversized upload", got.Code)
	}
	if got := call(http.MethodPut, path, body, "http://localhost", session.CSRF, "image/svg+xml"); got.Code != http.StatusUnprocessableEntity {
		t.Fatal("invalid kind", got.Code)
	}
	// Invalid requests are pinned to their options; use a fresh ID for a new payload.
	path = "/api/v1/admin/artwork/" + uuid.NewString() + "/bytes?purpose=game&focus_x=50&focus_y=50"
	uploaded := call(http.MethodPut, path, body, "http://localhost", session.CSRF, "image/png")
	if uploaded.Code != http.StatusOK {
		t.Fatal("valid upload", uploaded.Code, uploaded.Body.String())
	}
	var value struct {
		ID    string `json:"id"`
		Asset string `json:"asset"`
	}
	if err = json.Unmarshal(uploaded.Body.Bytes(), &value); err != nil || value.ID == "" {
		t.Fatal("upload response", err)
	}
	preview := call(http.MethodGet, "/api/v1/admin/artwork/"+value.ID+"/wide", "", "", "", "")
	if preview.Code != http.StatusOK || preview.Header().Get("X-Content-Type-Options") != "nosniff" || preview.Header().Get("Content-Type") != "image/png" {
		t.Fatal("private preview", preview.Code)
	}
	anonymous := httptest.NewRecorder()
	handler.ServeHTTP(anonymous, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/admin/artwork/"+value.ID+"/wide", nil))
	if anonymous.Code != http.StatusUnauthorized {
		t.Fatal("anonymous preview", anonymous.Code)
	}
	public := call(http.MethodGet, value.Asset, "", "", "", "")
	if public.Code != http.StatusNotFound {
		t.Fatal("unpublished public image", public.Code)
	}
}
