//go:build integration

package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/submissions"
)

func TestSubmissionHTTPBoundariesAndContract(t *testing.T) {
	f := submissionDB(t)
	ctx := t.Context()
	token, buyer := f.auth.login(t, "httporders@example.test")
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	f.intake.Register(mux)
	bootstrap := httptest.NewRecorder()
	req := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil)
	req.AddCookie(&http.Cookie{Name: "bp-customer-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
	mux.ServeHTTP(bootstrap, req)
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err := json.Unmarshal(bootstrap.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	response := bootstrap.Result()
	cookies := response.Cookies()
	if err := response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	call := func(path, body, origin string) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(ctx, http.MethodPost, path, strings.NewReader(body))
		r.AddCookie(&http.Cookie{Name: "bp-customer-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
		for _, c := range cookies {
			r.AddCookie(c)
		}
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Origin", origin)
		r.Header.Set("X-Csrf-Token", session.CSRF)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}
	raw, err := json.Marshal(f.input)
	if err != nil {
		t.Fatal(err)
	}
	body := string(raw)
	if res := call("/api/v1/submissions", body, "https://evil.test"); res.Code != http.StatusForbidden {
		t.Fatal("CSRF bypass", res.Code)
	}
	for _, bad := range []string{strings.Replace(body, `"title":`, `"paid":true,"title":`, 1), body + body, strings.Repeat("x", 262145)} {
		if res := call("/api/v1/submissions", bad, "http://localhost"); res.Code != http.StatusUnprocessableEntity {
			t.Fatal("malformed submission accepted", res.Code)
		}
	}
	result := call("/api/v1/submissions", body, "http://localhost")
	if result.Code != http.StatusOK {
		t.Fatal("valid submission failed", result.Code, result.Body.String())
	}
	var detail submissions.View
	if err = json.Unmarshal(result.Body.Bytes(), &detail); err != nil {
		t.Fatal(err)
	}
	if _, err = f.intake.Get(ctx, buyer, detail.Submission.ID, false); err != nil {
		t.Fatal(err)
	}
	if res := call("/api/v1/admin/submissions/"+detail.Submission.ID+"/approve_review", `{}`, "http://localhost"); res.Code != http.StatusForbidden {
		t.Fatal("customer review authority", res.Code)
	}
	var document any
	if err = json.Unmarshal(api.Contract, &document); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err = compiler.AddResource("contract.json", document); err != nil {
		t.Fatal(err)
	}
	for name, value := range map[string]any{"SubmissionView": detail, "SubmissionCreate": f.input, "SubmissionListing": submissions.Listing{Items: []submissions.Summary{detail.Submission}}, "SubmissionEdit": submissionEdit(detail), "SubmissionAction": submissions.Action{Version: 1, Note: ""}, "SubmissionHistory": map[string]any{"events": []submissions.Event{}}} {
		schema, compileErr := compiler.Compile("contract.json#/components/schemas/" + name)
		if compileErr != nil {
			t.Fatal(compileErr)
		}
		encoded, marshalErr := json.Marshal(value)
		if marshalErr != nil {
			t.Fatal(marshalErr)
		}
		var data any
		if err = json.Unmarshal(encoded, &data); err != nil {
			t.Fatal(err)
		}
		if err = schema.Validate(data); err != nil {
			t.Fatal(name, err)
		}
	}
}
