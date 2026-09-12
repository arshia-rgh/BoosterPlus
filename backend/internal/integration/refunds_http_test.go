//go:build integration

package integration

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
)

func TestRefundHTTPPrivateHistoryCSRFAndStrictRecipient(t *testing.T) {
	base := paymentDB(t)
	token, buyer := base.base.auth.login(t, "refund-http-buyer@example.test")
	base.base.buyer = buyer
	f := refundFromPayment(t, base)
	v := f.proposal(t, "1")
	handler := httpapi.New(f.base.auth.db.PingContext, slog.New(slog.DiscardHandler), false, f.base.auth.service.Register, f.store.Register)
	request := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/v1/auth/session", nil)
	cookie := &http.Cookie{Name: "bp-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
	request.AddCookie(cookie)
	bootstrap := httptest.NewRecorder()
	handler.ServeHTTP(bootstrap, request)
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
	call := func(method, path, body, origin, csrf string) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(t.Context(), method, path, strings.NewReader(body))
		r.AddCookie(cookie)
		for _, c := range cookies {
			r.AddCookie(c)
		}
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Origin", origin)
		r.Header.Set("X-Csrf-Token", csrf)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	path := "/api/v1/refunds/" + v.ID + "/recipient"
	body := `{"version":1,"address":"synthetic-confirmed-destination","memo":"","accept":true}`
	for _, pair := range [][2]string{{"https://evil.test", session.CSRF}, {"http://localhost", ""}} {
		if got := call(http.MethodPost, path, body, pair[0], pair[1]); got.Code != http.StatusForbidden {
			t.Fatal("recipient CSRF accepted", got.Code)
		}
	}
	for _, invalid := range []string{body + body, `{"version":1,"address":"synthetic-destination","accept":true,"amount":"100"}`, strings.Repeat("x", 262145)} {
		if got := call(http.MethodPost, path, invalid, "http://localhost", session.CSRF); got.Code != http.StatusUnprocessableEntity {
			t.Fatal("invalid recipient input accepted", got.Code)
		}
	}
	for _, path := range []string{"/api/v1/admin/cases", "/api/v1/admin/finance/outgoing", "/api/v1/admin/orders/" + f.orderID + "/refunds"} {
		if got := call(http.MethodGet, path, "", "", ""); got.Code != http.StatusForbidden {
			t.Fatal("customer accessed staff financial data", got.Code)
		}
	}
	if got := call(http.MethodPost, "/api/v1/admin/refunds/"+v.ID+"/approve", `{"version":1,"reason":"Customer must not release funds"}`, "http://localhost", session.CSRF); got.Code != http.StatusForbidden {
		t.Fatal("customer approved outgoing funds over HTTP", got.Code)
	}
	var contract any
	if err := json.Unmarshal(api.Contract, &contract); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("contract.json", contract); err != nil {
		t.Fatal(err)
	}
	for schema, path := range map[string]string{
		"ServiceCaseDetail":  "/api/v1/cases/" + f.caseID,
		"ServiceCaseHistory": "/api/v1/orders/" + f.orderID + "/cases",
		"RefundHistory":      "/api/v1/orders/" + f.orderID + "/refunds",
	} {
		got := call(http.MethodGet, path, "", "", "")
		if got.Code != http.StatusOK || got.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("private history unavailable or cacheable", got.Code)
		}
		var decoded any
		if err := json.Unmarshal(got.Body.Bytes(), &decoded); err != nil {
			t.Fatal(err)
		}
		compiled, err := compiler.Compile("contract.json#/components/schemas/" + schema)
		if err != nil {
			t.Fatal(err)
		}
		if err = compiled.Validate(decoded); err != nil {
			t.Fatal(schema, err)
		}
	}
}
