//go:build integration

package integration

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func TestNexusCheckoutHTTPContractCSRFAndRecentReveal(t *testing.T) {
	var token string
	f := nexusCheckoutFixtureWithSetup(t, true, func(p *paymentFixture) {
		token, p.base.buyer = p.base.auth.login(t, "supplier-http-checkout@example.test")
	})
	base, ctx := f.payment.base, t.Context()
	handler := httpapi.New(base.auth.db.PingContext, slog.New(slog.DiscardHandler), false, base.auth.service.Register, f.shop.Register)
	cookie := &http.Cookie{Name: "bp-customer-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
	boot := httptest.NewRecorder()
	request := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil)
	request.AddCookie(cookie)
	handler.ServeHTTP(boot, request)
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err := json.Unmarshal(boot.Body.Bytes(), &session); err != nil || session.CSRF == "" {
		t.Fatal("session bootstrap", err)
	}
	response := boot.Result()
	cookies := response.Cookies()
	if err := response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	call := func(method, path, origin, csrf string, body []byte) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(ctx, method, path, bytes.NewReader(body))
		if cookie != nil {
			r.AddCookie(cookie)
		}
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
	var contract any
	if err := json.Unmarshal(api.Contract, &contract); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("nexus-checkout.json", contract); err != nil {
		t.Fatal(err)
	}
	check := func(name string, w *httptest.ResponseRecorder) {
		t.Helper()
		if w.Code != http.StatusOK || w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal(name, w.Code, w.Body.String())
		}
		schema, err := compiler.Compile("nexus-checkout.json#/components/schemas/" + name)
		if err != nil {
			t.Fatal(err)
		}
		var value any
		if err = json.Unmarshal(w.Body.Bytes(), &value); err != nil {
			t.Fatal(err)
		}
		if err = schema.Validate(value); err != nil {
			t.Fatal(name, err)
		}
	}
	path := "/api/v1/games/" + base.game.Slug + "/shop/" + f.product.ID
	raw := []byte(`{"release_id":"` + f.product.CurrentRelease + `","quantity":"1"}`)
	if w := call(http.MethodPost, path+"/quote", "https://evil.test", session.CSRF, raw); w.Code != 403 {
		t.Fatal("foreign origin", w.Code)
	}
	if w := call(http.MethodPost, path+"/quote", "http://localhost", "", raw); w.Code != 403 {
		t.Fatal("missing CSRF", w.Code)
	}
	if w := call(http.MethodPost, path+"/quote", "http://localhost", session.CSRF, []byte(`{"extra":true}`)); w.Code != 422 {
		t.Fatal("unknown input", w.Code)
	}
	quote := call(http.MethodPost, path+"/quote", "http://localhost", session.CSRF, raw)
	check("ShopSupplierQuote", quote)
	var q shop.SupplierQuoteView
	if err := json.Unmarshal(quote.Body.Bytes(), &q); err != nil {
		t.Fatal(err)
	}
	accepted, err := json.Marshal(f.acceptance(q))
	if err != nil {
		t.Fatal(err)
	}
	reserved := call(http.MethodPost, path+"/supplier-reserve", "http://localhost", session.CSRF, accepted)
	check("ShopDelivery", reserved)
	var delivery shop.DeliveryView
	if err = json.Unmarshal(reserved.Body.Bytes(), &delivery); err != nil {
		t.Fatal(err)
	}
	check("ShopPublicProduct", call(http.MethodGet, path, "", "", nil))
	check("ShopPublicFilters", call(http.MethodGet, "/api/v1/games/"+base.game.Slug+"/shop/filters", "", "", nil))
	codePath := "/api/v1/orders/" + delivery.OrderID + "/shop/codes"
	if w := call(http.MethodPost, codePath, "http://localhost", session.CSRF, []byte(`{}`)); w.Code != 409 {
		t.Fatal("unpaid reveal", w.Code)
	}
	payPurchase(t, f.payment, delivery.OrderID)
	purchase, err := base.auth.client.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(delivery.OrderID)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	f.provider.result.Status = "completed"
	f.provider.result.Keys = []suppliers.DeliveredKey{{Code: "synthetic-http-private-code"}}
	if err = f.worker.Dispatch(ctx, purchase.ID); err != nil {
		t.Fatal(err)
	}
	check("ShopSupplierCodes", call(http.MethodPost, codePath, "http://localhost", session.CSRF, []byte(`{}`)))
	base.auth.clock.Add(601)
	w := call(http.MethodPost, codePath, "http://localhost", session.CSRF, []byte(`{}`))
	if w.Code != 403 || !strings.Contains(w.Body.String(), "recent_auth_required") || strings.Contains(w.Body.String(), "synthetic-http-private-code") {
		t.Fatal("recent verification", w.Code, w.Body.String())
	}
	cookie = nil
	cookies = nil
	if read := call(http.MethodGet, "/api/v1/orders/"+delivery.OrderID+"/shop", "", "", nil); read.Code != http.StatusUnauthorized {
		t.Fatal("anonymous private read", read.Code)
	}
	if w = call(http.MethodPost, codePath, "http://localhost", session.CSRF, []byte(`{}`)); w.Code != http.StatusForbidden || strings.Contains(w.Body.String(), "synthetic-http-private-code") {
		t.Fatal("anonymous reveal denied by CSRF", w.Code)
	}
}
