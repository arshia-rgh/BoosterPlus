//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
)

func TestChatFormsHTTPAndExportExcludeProtectedAnswers(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := chatForms(t, f)
	token, customer := f.auth.login(t, "chat-form-http@example.test")
	thread, err := store.Create(ctx, customer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Isolated HTTP fixture"})
	if err != nil {
		t.Fatal(err)
	}
	form, err := store.CreateForm(ctx, f.admin, thread.ID, chatRequest(f))
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	store.Register(mux)
	cookie := &http.Cookie{Name: "bp-customer-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
	boot := httptest.NewRecorder()
	req := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil)
	req.AddCookie(cookie)
	mux.ServeHTTP(boot, req)
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err = json.Unmarshal(boot.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	response := boot.Result()
	cookies := response.Cookies()
	if err = response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	call := func(method, path, body, origin string) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(ctx, method, path, strings.NewReader(body))
		r.AddCookie(cookie)
		for _, c := range cookies {
			r.AddCookie(c)
		}
		r.Header.Set("Origin", origin)
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-Csrf-Token", session.CSRF)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}
	path := "/api/v1/conversations/" + thread.ID + "/forms/" + form.ID
	body := `{"version":1,"request_key":"` + uuid.NewString() + `","answers":{"region":"safe region","access":"protected fixture value"}}`
	if got := call("POST", path+"/reply", body, "https://foreign.invalid"); got.Code != 403 {
		t.Fatal("CSRF", got.Code)
	}
	if got := call("POST", "/api/v1/admin/conversations/"+thread.ID+"/forms", `{}`, "http://localhost"); got.Code != 401 && got.Code != 403 {
		t.Fatal("cross portal", got.Code)
	}
	if got := call("POST", path+"/reply", strings.Replace(body, `"answers"`, `"owner_id"`, 1), "http://localhost"); got.Code != 422 {
		t.Fatal("unrecognized field", got.Code)
	}
	if got := call("POST", path+"/reply", body, "http://localhost"); got.Code != 200 || strings.Contains(got.Body.String(), "protected fixture value") {
		t.Fatal("reply response", got.Code)
	}
	if got := call("GET", path, "", "http://localhost"); got.Code != 200 || strings.Contains(got.Body.String(), "protected fixture value") {
		t.Fatal("read view", got.Code)
	}
	if got := call("POST", path+"/reveal", `{}`, "http://localhost"); got.Code != 200 || got.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("protected reveal", got.Code)
	}
	exports := privacy.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	data, err := exports.Export(ctx, customer, privacy.ExportInput{Section: "forms"})
	if err != nil || len(data.Records) != 1 {
		t.Fatal("forms export", err)
	}
	raw, err := json.Marshal(data)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), "protected fixture value") || !strings.Contains(string(raw), "safe region") {
		t.Fatal("export disclosure")
	}
	other, err := exports.Export(ctx, f.other, privacy.ExportInput{Section: "forms"})
	if err != nil || len(other.Records) != 0 {
		t.Fatal("foreign export", err)
	}
	f.auth.clock.Add(601)
	if _, err = store.RevealForm(ctx, customer, thread.ID, form.ID, false); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("stale action verification", err)
	}
}
