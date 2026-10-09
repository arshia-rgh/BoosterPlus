//go:build integration

package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/pquerna/otp/totp"
	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reports"
)

func TestReportsHTTPAuthorityCSRFDownloadAndContract(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	_, p := f.staffLogin(t, "operations-http@example.test", identity.RoleAdmin)
	enrollment, err := f.service.EnrollMFA(ctx, p)
	if err != nil {
		t.Fatal(err)
	}
	code, err := totp.GenerateCode(enrollment.Secret, time.Unix(f.clock.Load(), 0))
	if err != nil {
		t.Fatal(err)
	}
	verified, err := f.service.VerifyMFA(ctx, p, code, "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	token := verified.Token
	p = f.principal(t, token, identity.PortalAdmin)
	buyerToken, _ := f.login(t, "operations-http-buyer@example.test")
	s := reports.New(f.service, nil)
	mux := http.NewServeMux()
	f.service.Register(mux)
	s.Register(mux)
	bootstrap := httptest.NewRecorder()
	request := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/portals/admin/session", nil)
	request.AddCookie(&http.Cookie{Name: "bp-admin-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
	mux.ServeHTTP(bootstrap, request)
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err = json.Unmarshal(bootstrap.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	response := bootstrap.Result()
	cookies := response.Cookies()
	if err = response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	call := func(method, path, body, origin, credential string) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(ctx, method, path, strings.NewReader(body))
		if credential != "" {
			r.AddCookie(&http.Cookie{Name: "bp-admin-session", Value: credential, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
		}
		for _, cookie := range cookies {
			r.AddCookie(cookie)
		}
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Origin", origin)
		r.Header.Set("X-Csrf-Token", session.CSRF)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}

	if got := call(http.MethodPost, "/api/v1/admin/reports/preview", `{}`, "http://localhost", buyerToken); got.Code != http.StatusForbidden {
		t.Fatal("customer reports", got.Code)
	}
	query := reportQuery("staff")
	query.Search = p.User.ID
	raw, err := json.Marshal(query)
	if err != nil {
		t.Fatal(err)
	}
	previewPath := "/api/v1/admin/reports/preview"
	exportPath := "/api/v1/admin/reports/export"
	if got := call(http.MethodPost, previewPath, string(raw), "https://evil.test", token); got.Code != http.StatusForbidden {
		t.Fatal("cross-origin reports", got.Code)
	}
	for _, bad := range []string{string(raw) + string(raw), `{"extra":true}`, strings.Repeat("x", 262145)} {
		if got := call(http.MethodPost, previewPath, bad, "http://localhost", token); got.Code != http.StatusUnprocessableEntity {
			t.Fatal("strict report request", got.Code)
		}
	}
	responsePreview := call(http.MethodPost, previewPath, string(raw), "http://localhost", token)
	if responsePreview.Code != http.StatusOK {
		t.Fatal("preview HTTP", responsePreview.Code)
	}
	var preview reports.Report
	if err = json.Unmarshal(responsePreview.Body.Bytes(), &preview); err != nil {
		t.Fatal(err)
	}
	input := reports.ExportInput{Query: query, Digest: preview.Digest, Reason: "Synthetic HTTP report validation"}
	raw, err = json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	result := call(http.MethodPost, exportPath, string(raw), "http://localhost", token)
	if result.Code != http.StatusOK || result.Header().Get("Cache-Control") != "no-store" || result.Header().Get("Content-Disposition") != `attachment; filename="boosterplus-staff-report.json"` {
		t.Fatal("private download headers", result.Code)
	}
	var export reports.Export
	if err = json.Unmarshal(result.Body.Bytes(), &export); err != nil {
		t.Fatal(err)
	}
	var contract any
	if err = json.Unmarshal(api.Contract, &contract); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err = compiler.AddResource("contract.json", contract); err != nil {
		t.Fatal(err)
	}
	for name, value := range map[string]any{"ReportQuery": query, "OperationalReport": preview, "ReportExportInput": input, "ReportExport": export} {
		schema, e := compiler.Compile("contract.json#/components/schemas/" + name)
		if e != nil {
			t.Fatal(e)
		}
		encoded, e := json.Marshal(value)
		if e != nil {
			t.Fatal(e)
		}
		var decoded any
		if e = json.Unmarshal(encoded, &decoded); e != nil {
			t.Fatal(e)
		}
		if e = schema.Validate(decoded); e != nil {
			t.Fatal(name, e)
		}
	}
	executeSQL(t, f.db, "DROP TABLE auth_audits")
	failure := call(http.MethodPost, exportPath, string(raw), "http://localhost", token)
	if failure.Code < 500 || failure.Header().Get("Content-Disposition") != "" || strings.Contains(failure.Body.String(), "rows") {
		t.Fatal("unaudited artifact returned", failure.Code)
	}
}
