//go:build integration

package integration

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

func TestManualPayoutHTTPOwnerCSRFStrictInputAndContract(t *testing.T) {
	f := resaleDB(t, "buy_first")
	row := manualObligation(t, f, true)
	owner := manualHTTPOwner(t, f)
	_, _, token, _ := f.base.auth.enrollToken(t, owner)
	handler := httpapi.New(f.base.auth.db.PingContext, slog.New(slog.DiscardHandler), false, f.base.auth.service.Register, f.store.Register)
	cookie := &http.Cookie{Name: "bp-admin-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
	request := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/auth/portals/admin/session", nil)
	request.AddCookie(cookie)
	bootstrap := httptest.NewRecorder()
	handler.ServeHTTP(bootstrap, request)
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err := json.Unmarshal(bootstrap.Body.Bytes(), &session); err != nil || len(session.CSRF) < 40 {
		t.Fatal("staff session bootstrap", bootstrap.Code, err)
	}
	response := bootstrap.Result()
	cookies := response.Cookies()
	if err := response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	call := func(body, origin, csrf string, authenticated bool) *httptest.ResponseRecorder {
		request := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/api/v1/admin/payouts/"+row.ID+"/manual", strings.NewReader(body))
		if authenticated {
			request.AddCookie(cookie)
			for _, c := range cookies {
				request.AddCookie(c)
			}
		}
		request.Header.Set("Content-Type", "application/json")
		request.Header.Set("Origin", origin)
		request.Header.Set("X-Csrf-Token", csrf)
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, request)
		return recorder
	}
	input, err := json.Marshal(manualInput(f, row))
	if err != nil {
		t.Fatal(err)
	}
	body := string(input)
	for _, c := range []struct {
		body, origin, csrf string
		auth               bool
		want               int
	}{
		{body, "http://localhost", session.CSRF, false, http.StatusForbidden},
		{body, "https://evil.test", session.CSRF, true, http.StatusForbidden},
		{body, "http://localhost", "", true, http.StatusForbidden},
		{body + body, "http://localhost", session.CSRF, true, http.StatusUnprocessableEntity},
		{strings.TrimSuffix(body, "}") + `,"send":true}`, "http://localhost", session.CSRF, true, http.StatusUnprocessableEntity},
	} {
		if got := call(c.body, c.origin, c.csrf, c.auth); got.Code != c.want {
			t.Fatalf("HTTP boundary: want %d got %d", c.want, got.Code)
		}
	}
	got := call(body, "http://localhost", session.CSRF, true)
	if got.Code != http.StatusOK || got.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("manual record HTTP", got.Code, got.Body.String())
	}
	var contract, decoded any
	if err = json.Unmarshal(api.Contract, &contract); err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(got.Body.Bytes(), &decoded); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err = compiler.AddResource("contract.json", contract); err != nil {
		t.Fatal(err)
	}
	schema, err := compiler.Compile("contract.json#/components/schemas/RefundTransfer")
	if err != nil {
		t.Fatal(err)
	}
	if err = schema.Validate(decoded); err != nil {
		t.Fatal(err)
	}
}

// Deliver only this identity challenge; do not send pending commerce jobs to the email handler.
func manualHTTPOwner(t *testing.T, f *resaleFixture) *identity.Principal {
	t.Helper()
	ctx := t.Context()
	const email = "manual-owner@example.test"
	if _, err := f.base.auth.client.User.Create().SetPortal(string(identity.PortalAdmin)).SetEmail(email).SetRole(identity.RoleOwner).Save(ctx); err != nil {
		t.Fatal(err)
	}
	id, err := f.base.auth.service.RequestEmail(ctx, identity.EmailRequest{Portal: identity.PortalAdmin, Email: email, Purpose: "login", Browser: f.base.auth.browser, IP: "127.0.0.1", AcceptTerms: true})
	if err != nil {
		t.Fatal(err)
	}
	message, err := f.base.auth.client.AuthMessage.Query().Where(authmessage.ChallengeIDEQ(id)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(map[string]string{"message_id": message.ID})
	if err != nil {
		t.Fatal(err)
	}
	sender := &recordingSender{}
	if err = f.base.auth.service.EmailHandler(sender)(ctx, jobs.Job{Payload: raw}); err != nil {
		t.Fatal(err)
	}
	if len(sender.messages) != 1 {
		t.Fatal("missing isolated challenge")
	}
	code := regexp.MustCompile(`\b[0-9]{6}\b`).FindString(sender.messages[0].Body)
	result, err := f.base.auth.service.VerifyEmail(ctx, id, code, f.base.auth.browser, "127.0.0.1", nil, identity.PortalAdmin)
	if err != nil {
		t.Fatal(err)
	}
	return f.base.auth.principal(t, result.Token, identity.PortalAdmin)
}
