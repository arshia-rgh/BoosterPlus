//go:build integration

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
)

func TestPaymentsHTTPStrictInputOwnershipCSRFAndDurableInbox(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	token, buyer := f.base.auth.login(t, "payment-http-buyer@example.test")
	f.base.buyer = buyer
	d := f.base.create(t, "package")
	handler := httpapi.New(f.base.auth.db.PingContext, slog.New(slog.DiscardHandler), false, f.base.auth.service.Register, f.store.Register)
	bootstrap := httptest.NewRecorder()
	request := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil)
	cookie := &http.Cookie{Name: "bp-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
	request.AddCookie(cookie)
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
	call := func(method, path, origin, content string, body []byte) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(ctx, method, path, bytes.NewReader(body))
		r.AddCookie(cookie)
		for _, c := range cookies {
			r.AddCookie(c)
		}
		r.Header.Set("Content-Type", content)
		r.Header.Set("Origin", origin)
		r.Header.Set("X-Csrf-Token", session.CSRF)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	input := payments.StartInput{ContractID: d.Contract.ID, PolicyID: f.policy.ID, Route: "usdttrc20", AcceptPolicy: true}
	raw, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	path := "/api/v1/orders/" + d.Order.ID + "/checkout"
	if w := call(http.MethodPost, path, "https://evil.test", "application/json", raw); w.Code != http.StatusForbidden {
		t.Fatal("cross-origin checkout", w.Code)
	}
	for _, bad := range [][]byte{append(append([]byte{}, raw...), raw...), []byte(`{"contract_id":"x","amount_minor":"1"}`), []byte(strings.Repeat("x", 262145))} {
		if w := call(http.MethodPost, path, "http://localhost", "application/json", bad); w.Code != http.StatusUnprocessableEntity {
			t.Fatal("invalid checkout accepted", w.Code)
		}
	}
	if w := call(http.MethodPost, path, "http://localhost", "text/plain", raw); w.Code != http.StatusUnprocessableEntity {
		t.Fatal("wrong content type accepted", w.Code)
	}
	result := call(http.MethodPost, path, "http://localhost", "application/json", raw)
	if result.Code != http.StatusOK {
		t.Fatal("valid checkout", result.Code)
	}
	history := call(http.MethodGet, "/api/v1/orders/"+d.Order.ID+"/payments", "", "", nil)
	if history.Code != http.StatusOK || history.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("private history cache", history.Code)
	}
	if w := call(http.MethodGet, "/api/v1/admin/finance", "", "", nil); w.Code != http.StatusForbidden {
		t.Fatal("customer finance access", w.Code)
	}
	var document any
	if err = json.Unmarshal(api.Contract, &document); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err = compiler.AddResource("contract.json", document); err != nil {
		t.Fatal(err)
	}
	for schemaName, value := range map[string][]byte{"PaymentAttempt": result.Body.Bytes(), "PaymentHistory": history.Body.Bytes()} {
		schema, e := compiler.Compile("contract.json#/components/schemas/" + schemaName)
		if e != nil {
			t.Fatal(e)
		}
		var decoded any
		if e = json.Unmarshal(value, &decoded); e != nil {
			t.Fatal(e)
		}
		if e = schema.Validate(decoded); e != nil {
			t.Fatal(schemaName, e)
		}
	}
	body, sig := paymentSignal(t, "100")
	webhook := func(signatures []string) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(ctx, http.MethodPost, "/api/v1/webhooks/payments/nowpayments", bytes.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		for _, value := range signatures {
			r.Header.Add("X-Nowpayments-Sig", value)
		}
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	if w := webhook([]string{sig, sig}); w.Code != http.StatusBadRequest {
		t.Fatal("ambiguous signature accepted", w.Code)
	}
	if w := webhook([]string{sig}); w.Code != http.StatusNoContent {
		t.Fatal("valid callback required customer identity", w.Code)
	}
	if _, err = f.base.auth.db.ExecContext(ctx, "RENAME TABLE payment_signals TO payment_signals_unavailable"); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, e := f.base.auth.db.ExecContext(context.WithoutCancel(ctx), "RENAME TABLE payment_signals_unavailable TO payment_signals"); e != nil {
			t.Error(e)
		}
	})
	if w := webhook([]string{sig}); w.Code != http.StatusServiceUnavailable {
		t.Fatal("unpersisted inbox acknowledged", w.Code)
	}
}
func TestPaymentsPolicyRevisionAndRecentFactors(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	input := payments.PolicyInput{Version: 2, Action: "publish", Data: f.policy.Data}
	if _, err := f.store.SavePolicy(ctx, f.base.buyer, input); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer policy publish", err)
	}
	changed := input
	changed.Data.Text = "Updated synthetic customer agreement for a later policy."
	next, err := f.store.SavePolicy(ctx, f.base.admin, changed)
	if err != nil || next.Published.ID == f.policy.ID {
		t.Fatal("policy overwrite", err)
	}
	if _, err = f.store.SavePolicy(ctx, f.base.admin, input); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("stale policy revision", err)
	}
	f.base.auth.clock.Add(int64((16 * time.Minute) / time.Second))
	input.Version = next.Version
	if _, err = f.store.SavePolicy(ctx, f.base.admin, input); err == nil {
		t.Fatal("stale staff factors published financial policy")
	}
}
