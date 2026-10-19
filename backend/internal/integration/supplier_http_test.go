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
	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestSupplierHTTPPortalCSRFAndPrivateContract(t *testing.T) {
	f := orderDB(t)
	// The auth fixture's mail-only queue drain must run before an import job is
	// enqueued. It is not a general worker and must not consume supplier jobs.
	customerToken, _ := f.auth.login(t, "supplier-customer@example.test")
	_, pending := f.auth.staffLogin(t, "supplier-http-admin@example.test", identity.RoleAdmin)
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
	store, reader := supplierFixture(t, f)
	reader.value.Products[0].Offers[0].Cost = "0.123456789123456789"
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
	call := func(method, path, body, origin, csrf string) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(t.Context(), method, path, strings.NewReader(body))
		r.AddCookie(cookie)
		for _, c := range cookies {
			r.AddCookie(c)
		}
		r.Header.Set("Origin", origin)
		r.Header.Set("X-Csrf-Token", csrf)
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	path := "/api/v1/admin/shop/suppliers/nexus-sandbox"
	body := `{"request_id":"` + uuid.NewString() + `"}`
	for _, pair := range [][2]string{{"https://evil.test", session.CSRF}, {"http://localhost", ""}} {
		if got := call(http.MethodPost, path+"/imports", body, pair[0], pair[1]); got.Code != http.StatusForbidden {
			t.Fatal("CSRF accepted", got.Code)
		}
	}
	for _, invalid := range []string{body + body, `{"request_id":"wrong"}`, "null", strings.Repeat("x", 17000)} {
		if got := call(http.MethodPost, path+"/imports", invalid, "http://localhost", session.CSRF); got.Code != http.StatusUnprocessableEntity {
			t.Fatal("invalid import accepted", got.Code)
		}
	}
	if got := call(http.MethodPost, path+"/markup", `{"version":1}`, "http://localhost", session.CSRF); got.Code != http.StatusUnprocessableEntity {
		t.Fatal("missing markup silently became zero", got.Code)
	}
	var doc any
	if err = json.Unmarshal(api.Contract, &doc); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err = compiler.AddResource("supplier-contract.json", doc); err != nil {
		t.Fatal(err)
	}
	check := func(name string, w *httptest.ResponseRecorder, status int) {
		t.Helper()
		if w.Code != status || w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("private status/cache", w.Code)
		}
		schema, e := compiler.Compile("supplier-contract.json#/components/schemas/" + name)
		if e != nil {
			t.Fatal(e)
		}
		var value any
		if e = json.Unmarshal(w.Body.Bytes(), &value); e != nil {
			t.Fatal(e)
		}
		if e = schema.Validate(value); e != nil {
			t.Fatal(name, e)
		}
	}
	check("SupplierLibrary", call(http.MethodGet, path+"/library", "", "", ""), 200)
	created := call(http.MethodPost, path+"/imports", body, "http://localhost", session.CSRF)
	check("SupplierImport", created, 202)
	var run struct {
		ID string `json:"id"`
	}
	if err = json.Unmarshal(created.Body.Bytes(), &run); err != nil {
		t.Fatal(err)
	}
	if err = store.ImportHandler()(t.Context(), supplierImportJob(t, run.ID)); err != nil {
		t.Fatal(err)
	}
	library := call(http.MethodGet, path+"/library", "", "", "")
	check("SupplierLibrary", library, 200)
	if !strings.Contains(library.Body.String(), `"cost_usd":"0.123456789123456789"`) {
		t.Fatal("database rounded supplier cost")
	}
	var storedType string
	if err = f.auth.db.QueryRowContext(t.Context(), `SELECT JSON_TYPE(JSON_EXTRACT(data,'$.offers[0].cost')) FROM supplier_items WHERE import_id=? AND product_id='test:coins:p1'`, run.ID).Scan(&storedType); err != nil || storedType != "STRING" {
		t.Fatal("supplier precision not protected in SQL JSON", storedType, err)
	}
	check("SupplierConnections", call(http.MethodGet, "/api/v1/admin/shop/suppliers", "", "", ""), 200)
	for _, token := range []string{customerToken, ""} {
		cookie = &http.Cookie{Name: "bp-admin-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
		if got := call(http.MethodGet, path+"/library", "", "", ""); got.Code != http.StatusUnauthorized {
			t.Fatal("customer read supplier library", got.Code)
		}
	}
}
