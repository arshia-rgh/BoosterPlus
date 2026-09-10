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
	"github.com/arshia-rgh/BoosterPlus/backend/internal/availability"
)

func TestAvailabilityHTTPAnonymousLinksCSRFAndContract(t *testing.T) {
	f := availabilityDB(t)
	ctx := t.Context()
	f.capacity(t, 0)
	v := f.subscribe(t)
	f.capacity(t, 1)
	sender := &recordingSender{}
	if e := f.alerts.EmailHandler(sender)(ctx, f.delivery(t)); e != nil {
		t.Fatal(e)
	}
	link := linkFromMessage(t, sender.messages[0])
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	f.alerts.Register(mux)
	bootstrap := httptest.NewRecorder()
	mux.ServeHTTP(bootstrap, httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil))
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
	raw, e := json.Marshal(link)
	if e != nil {
		t.Fatal(e)
	}
	call := func(method, path, body, origin, csrf string) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(ctx, method, path, strings.NewReader(body))
		for _, c := range cookies {
			r.AddCookie(c)
		}
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Origin", origin)
		r.Header.Set("X-Csrf-Token", csrf)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}
	path := "/api/v1/availability-link/confirm"
	for _, pair := range [][2]string{{"https://evil.test", session.CSRF}, {"http://localhost", ""}} {
		if got := call(http.MethodPost, path, string(raw), pair[0], pair[1]); got.Code != http.StatusForbidden {
			t.Fatal("anonymous unsubscribe CSRF", got.Code)
		}
	}
	if got := call(http.MethodGet, path, "", "http://localhost", session.CSRF); got.Code != http.StatusMethodNotAllowed {
		t.Fatal("GET unsubscribe mutation", got.Code)
	}
	if got := call(http.MethodGet, "/api/v1/availability", "", "http://localhost", session.CSRF); got.Code != http.StatusUnauthorized {
		t.Fatal("anonymous subscription data", got.Code)
	}
	for _, body := range []string{string(raw) + string(raw), `{"extra":true}`, strings.Repeat("x", 262145)} {
		if got := call(http.MethodPost, path, body, "http://localhost", session.CSRF); got.Code != http.StatusUnprocessableEntity {
			t.Fatal("strict input", got.Code)
		}
	}
	got := call(http.MethodPost, path, string(raw), "http://localhost", session.CSRF)
	if got.Code != http.StatusOK || got.Body.String() != "{\"current\":true}\n" || got.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("scoped confirm response", got.Code)
	}
	replay := call(http.MethodPost, path, string(raw), "http://localhost", session.CSRF)
	if replay.Code != http.StatusOK || replay.Body.String() != "{\"current\":false}\n" {
		t.Fatal("replayed link", replay.Code)
	}
	var contract any
	if e = json.Unmarshal(api.Contract, &contract); e != nil {
		t.Fatal(e)
	}
	compiler := jsonschema.NewCompiler()
	if e = compiler.AddResource("contract.json", contract); e != nil {
		t.Fatal(e)
	}
	for name, value := range map[string]any{"AvailabilitySubscription": v, "AvailabilityListing": availability.Listing{Subscriptions: []availability.View{v}}, "AvailabilityLink": link, "AvailabilityLinkView": availability.LinkView{Current: true}} {
		schema, compileErr := compiler.Compile("contract.json#/components/schemas/" + name)
		if compileErr != nil {
			t.Fatal(compileErr)
		}
		data, encodeErr := json.Marshal(value)
		if encodeErr != nil {
			t.Fatal(encodeErr)
		}
		var decoded any
		if decodeErr := json.Unmarshal(data, &decoded); decodeErr != nil {
			t.Fatal(decodeErr)
		}
		if validateErr := schema.Validate(decoded); validateErr != nil {
			t.Fatal(name, validateErr)
		}
	}
}
