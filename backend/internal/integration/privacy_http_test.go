//go:build integration

package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

func TestPrivacyHTTPAuthorityCSRFAndPrivateExportContract(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	token, p := f.login(t, "privacy-http@example.test")
	now := func() time.Time { return time.Unix(f.clock.Load(), 0) }
	mux := http.NewServeMux()
	f.service.Register(mux)
	privacy.New(f.client, f.service, now).Register(mux)
	sitecontent.New(f.client, f.service, now).Register(mux)
	bootstrap := httptest.NewRecorder()
	r := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil)
	r.AddCookie(&http.Cookie{Name: "bp-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
	mux.ServeHTTP(bootstrap, r)
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if e := json.Unmarshal(bootstrap.Body.Bytes(), &session); e != nil {
		t.Fatal(e)
	}
	response := bootstrap.Result()
	cookies := response.Cookies()
	if e := response.Body.Close(); e != nil {
		t.Fatal(e)
	}
	call := func(method, path, body, origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequestWithContext(ctx, method, path, strings.NewReader(body))
		req.AddCookie(&http.Cookie{Name: "bp-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
		for _, cookie := range cookies {
			req.AddCookie(cookie)
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", origin)
		req.Header.Set("X-Csrf-Token", session.CSRF)
		result := httptest.NewRecorder()
		mux.ServeHTTP(result, req)
		return result
	}
	for _, path := range []string{"/api/v1/admin/privacy/requests", "/api/v1/admin/site/legal", "/api/v1/admin/users"} {
		if got := call(http.MethodGet, path, "", "http://localhost"); got.Code != http.StatusForbidden {
			t.Fatal("customer staff boundary", path, got.Code)
		}
	}
	if got := call(http.MethodPost, "/api/v1/privacy/export", `{"section":"profile","after":""}`, "https://foreign.test"); got.Code != http.StatusForbidden {
		t.Fatal("cross-origin export", got.Code)
	}
	for _, body := range []string{`{"section":"profile","user_id":"foreign"}`, `{} {}`, strings.Repeat("x", 262145)} {
		if got := call(http.MethodPost, "/api/v1/privacy/export", body, "http://localhost"); got.Code != http.StatusUnprocessableEntity {
			t.Fatal("strict export body", got.Code)
		}
	}
	export := call(http.MethodPost, "/api/v1/privacy/export", `{"section":"profile","after":""}`, "http://localhost")
	if export.Code != http.StatusOK || export.Header().Get("Cache-Control") != "no-store" || export.Header().Get("Content-Disposition") == "" || !strings.Contains(export.Body.String(), p.User.Email) {
		t.Fatal("private self export", export.Code)
	}
	public := call(http.MethodGet, "/api/v1/site/retention", "", "http://localhost")
	if public.Code != http.StatusOK {
		t.Fatal("unpublished public policy", public.Code)
	}
	var contract any
	if e := json.Unmarshal(api.Contract, &contract); e != nil {
		t.Fatal(e)
	}
	compiler := jsonschema.NewCompiler()
	if e := compiler.AddResource("contract.json", contract); e != nil {
		t.Fatal(e)
	}
	for name, value := range map[string]*httptest.ResponseRecorder{"PrivacyExport": export, "SiteContent": public} {
		schema, e := compiler.Compile("contract.json#/components/schemas/" + name)
		if e != nil {
			t.Fatal(e)
		}
		var decoded any
		if e = json.Unmarshal(value.Body.Bytes(), &decoded); e != nil {
			t.Fatal(e)
		}
		if e = schema.Validate(decoded); e != nil {
			t.Fatal(name, e)
		}
	}
	executeSQL(t, f.db, "UPDATE auth_sessions SET authenticated_at=? WHERE id=?", now().Add(-time.Hour), p.Session.ID)
	if got := call(http.MethodPost, "/api/v1/privacy/export", `{"section":"profile"}`, "http://localhost"); got.Code != http.StatusForbidden {
		t.Fatal("export without recent verification", got.Code)
	}
}
