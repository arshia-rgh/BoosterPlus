//go:build integration

package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestPricingUnsavedPreviewIsolation(t *testing.T) {
	f := authDB(t, nil)
	_, pending := f.staffLogin(t, "pricing-preview@example.test", identity.RoleAdmin)
	_, _, token, principal := f.enrollToken(t, pending)
	store := catalog.New(f.client, f.service)
	draft, err := store.Create(t.Context(), principal, "price-preview", catalogConfig())
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	f.service.Register(mux)
	store.Register(mux)
	cookie := &http.Cookie{Name: "bp-admin-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
	working := catalogConfig()
	working.Services[0].Evaluator = "pricing-v1"
	working.Services[0].Pricing = &catalog.PricePlan{Currency: "USD", BaseMinor: "2500", MinimumMinor: "1", MaximumMinor: "99999", Rules: []catalog.PriceRule{}, Cases: []catalog.PriceCase{}}
	input := map[string]any{"release_id": strconv.Itoa(draft.Revision), "service": "boost", "answers": map[string]string{"mode": "solo"}, "configuration": working}
	path := "/api/v1/admin/catalog/games/" + draft.ID + "/estimate-preview"
	call := func(path, origin string, authenticated bool) *httptest.ResponseRecorder {
		sessionPath := "/api/v1/auth/portals/admin/session"
		if !strings.HasPrefix(path, "/api/v1/admin/") {
			sessionPath = "/api/v1/auth/session"
		}
		bootstrapRequest := httptest.NewRequestWithContext(t.Context(), http.MethodGet, sessionPath, nil)
		if authenticated {
			bootstrapRequest.AddCookie(cookie)
		}
		bootstrap := httptest.NewRecorder()
		mux.ServeHTTP(bootstrap, bootstrapRequest)
		var session struct {
			CSRF string `json:"csrf_token"`
		}
		if err = json.Unmarshal(bootstrap.Body.Bytes(), &session); err != nil || session.CSRF == "" {
			t.Fatal("bootstrap", err)
		}
		response := bootstrap.Result()
		cookies := response.Cookies()
		if err = response.Body.Close(); err != nil {
			t.Fatal(err)
		}
		body, marshalErr := json.Marshal(input)
		if marshalErr != nil {
			t.Fatal(marshalErr)
		}
		r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, path, strings.NewReader(string(body)))
		r.Header.Set("Origin", origin)
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-Csrf-Token", session.CSRF)
		if authenticated {
			r.AddCookie(cookie)
		}
		for _, c := range cookies {
			r.AddCookie(c)
		}
		out := httptest.NewRecorder()
		mux.ServeHTTP(out, r)
		return out
	}
	if got := call(path, "http://localhost", true); got.Code != http.StatusOK || !strings.Contains(got.Body.String(), `"amount_minor":"2500"`) {
		t.Fatal("working preview", got.Code, got.Body.String())
	}
	if got := call(path, "https://evil.test", true); got.Code != http.StatusForbidden {
		t.Fatal("CSRF", got.Code)
	}
	if got := call(path, "http://localhost", false); got.Code != http.StatusUnauthorized {
		t.Fatal("private preview", got.Code)
	}
	if got := call("/api/v1/catalog/games/price-preview/estimate", "http://localhost", false); got.Code != http.StatusUnprocessableEntity {
		t.Fatal("public configuration injection", got.Code)
	}
	input["release_id"] = "stale"
	if got := call(path, "http://localhost", true); got.Code != http.StatusConflict {
		t.Fatal("stale revision", got.Code)
	}
	input["release_id"] = strconv.Itoa(draft.Revision)
	working.Services[0].Pricing.BaseMinor = "not money"
	input["configuration"] = working
	if got := call(path, "http://localhost", true); got.Code != http.StatusUnprocessableEntity || !strings.Contains(got.Body.String(), "pricing.base_minor") {
		t.Fatal("invalid rules", got.Code, got.Body.String())
	}
	after, err := store.Draft(t.Context(), principal, draft.ID)
	if err != nil || after.Revision != draft.Revision || after.Published || after.Configuration.Services[0].Evaluator != "manual-review-v1" {
		t.Fatal("preview changed saved draft", err)
	}
}
