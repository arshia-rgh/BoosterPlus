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
	"github.com/arshia-rgh/BoosterPlus/backend/internal/operations"
)

func TestOperationsHTTPAuthorityStrictWritesAndContract(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	_, p := f.login(t, "operations-http@example.test")
	if _, err := f.client.User.UpdateOneID(p.User.ID).SetRole(identity.RoleAdmin).Save(ctx); err != nil {
		t.Fatal(err)
	}
	p = f.principalFromSession(t, p)
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
	p = f.principal(t, token)
	buyerToken, _ := f.login(t, "operations-http-buyer@example.test")
	s := operations.New(f.client, f.service, nil)
	mux := http.NewServeMux()
	f.service.Register(mux)
	s.Register(mux)
	bootstrap := httptest.NewRecorder()
	request := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil)
	request.AddCookie(&http.Cookie{Name: "bp-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
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
			r.AddCookie(&http.Cookie{Name: "bp-session", Value: credential, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
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
	if got := call(http.MethodGet, "/api/v1/admin/jobs", "", "http://localhost", buyerToken); got.Code != http.StatusForbidden {
		t.Fatal("customer task inspection", got.Code)
	}
	id := enqueue(t, f.db, "operations-http-task")
	executeSQL(t, f.db, "UPDATE jobs SET state='failed',attempts=max_attempts,last_error='handler_failed' WHERE id=?", id)
	path := "/api/v1/admin/jobs/" + id + "/retry"
	body := `{"generation":0,"reason":"Connectivity repaired and retry effects reviewed."}`
	if got := call(http.MethodPost, path, body, "https://evil.test", token); got.Code != http.StatusForbidden {
		t.Fatal("cross-origin retry", got.Code)
	}
	for _, bad := range []string{strings.Replace(body, `"generation":`, `"payload":{},"generation":`, 1), body + body, strings.Repeat("x", 262145)} {
		if got := call(http.MethodPost, path, bad, "http://localhost", token); got.Code != http.StatusUnprocessableEntity {
			t.Fatal("malformed task update", got.Code)
		}
	}
	result := call(http.MethodPost, path, body, "http://localhost", token)
	if result.Code != http.StatusOK {
		t.Fatal("valid retry", result.Code, result.Body.String())
	}
	if got := call(http.MethodPost, path, body, "http://localhost", token); got.Code != http.StatusConflict {
		t.Fatal("duplicate retry", got.Code)
	}
	if result.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("operational response cached")
	}
	var job operations.Job
	if err = json.Unmarshal(result.Body.Bytes(), &job); err != nil {
		t.Fatal(err)
	}
	overview, err := s.Overview(ctx, p)
	if err != nil {
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
	for name, value := range map[string]any{"OperationalJob": job, "OperationalJobs": operations.Listing{Items: []operations.Job{job}}, "OperationalOverview": overview, "OperationalJobRetry": operations.RetryInput{Generation: 0, Reason: "Reviewed failure"}} {
		schema, e := compiler.Compile("contract.json#/components/schemas/" + name)
		if e != nil {
			t.Fatal(e)
		}
		raw, e := json.Marshal(value)
		if e != nil {
			t.Fatal(e)
		}
		var data any
		if e = json.Unmarshal(raw, &data); e != nil {
			t.Fatal(e)
		}
		if e = schema.Validate(data); e != nil {
			t.Fatal(name, e)
		}
	}
}
