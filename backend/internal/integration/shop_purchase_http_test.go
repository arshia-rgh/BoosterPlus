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
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
)

func TestShopPurchaseHTTPAuthorityStrictInputAndContract(t *testing.T) {
	f, store, product, input := shopPurchaseFixture(t)
	ctx := t.Context()
	token, buyer := f.base.auth.login(t, "shop-http-buyer@example.test")
	f.base.buyer = buyer
	handler := httpapi.New(f.base.auth.db.PingContext, slog.New(slog.DiscardHandler), false, f.base.auth.service.Register, store.Register)
	cookie := &http.Cookie{Name: "bp-customer-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
	boot := httptest.NewRecorder()
	r := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil)
	r.AddCookie(cookie)
	handler.ServeHTTP(boot, r)
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err := json.Unmarshal(boot.Body.Bytes(), &session); err != nil || session.CSRF == "" {
		t.Fatal("bootstrap", err)
	}
	response := boot.Result()
	cookies := response.Cookies()
	if err := response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	call := func(method, path, origin, csrf, content string, body []byte) *httptest.ResponseRecorder {
		q := httptest.NewRequestWithContext(ctx, method, path, bytes.NewReader(body))
		if cookie != nil {
			q.AddCookie(cookie)
		}
		for _, c := range cookies {
			q.AddCookie(c)
		}
		q.Header.Set("Origin", origin)
		q.Header.Set("X-Csrf-Token", csrf)
		q.Header.Set("Content-Type", content)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, q)
		return w
	}
	path := "/api/v1/games/" + f.base.game.Slug + "/shop/" + product.ID
	raw, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	for _, pair := range [][2]string{{"https://evil.test", session.CSRF}, {"http://localhost", ""}} {
		if w := call(http.MethodPost, path+"/reserve", pair[0], pair[1], "application/json", raw); w.Code != 403 {
			t.Fatal("csrf", w.Code)
		}
	}
	for _, body := range [][]byte{append(append([]byte{}, raw...), raw...), []byte(`{"extra":true}`), []byte("null"), []byte(strings.Repeat("x", 262145))} {
		if w := call(http.MethodPost, path+"/reserve", "http://localhost", session.CSRF, "application/json", body); w.Code != 422 {
			t.Fatal("strict input", w.Code)
		}
	}
	if w := call(http.MethodPost, path+"/reserve", "http://localhost", session.CSRF, "text/plain", raw); w.Code != 422 {
		t.Fatal("content type", w.Code)
	}
	reserved := call(http.MethodPost, path+"/reserve", "http://localhost", session.CSRF, "application/json", raw)
	if reserved.Code != 200 {
		t.Fatal("reserve", reserved.Code, reserved.Body.String())
	}
	var delivery shop.DeliveryView
	if err = json.Unmarshal(reserved.Body.Bytes(), &delivery); err != nil {
		t.Fatal(err)
	}
	detail := call(http.MethodGet, "/api/v1/orders/"+delivery.OrderID+"/shop", "", "", "", nil)
	recipient := call(http.MethodPost, "/api/v1/orders/"+delivery.OrderID+"/shop/recipient", "http://localhost", session.CSRF, "application/json", []byte(`{}`))
	public := call(http.MethodGet, path, "", "", "", nil)
	var contract any
	if err = json.Unmarshal(api.Contract, &contract); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err = compiler.AddResource("contract.json", contract); err != nil {
		t.Fatal(err)
	}
	for schemaName, w := range map[string]*httptest.ResponseRecorder{"ShopDelivery": detail, "ShopRecipient": recipient, "ShopPublicProduct": public} {
		if w.Code != 200 || w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("response", schemaName, w.Code)
		}
		schema, e := compiler.Compile("contract.json#/components/schemas/" + schemaName)
		if e != nil {
			t.Fatal(e)
		}
		var value any
		if e = json.Unmarshal(w.Body.Bytes(), &value); e != nil {
			t.Fatal(e)
		}
		if e = schema.Validate(value); e != nil {
			t.Fatal(schemaName, e)
		}
	}
	if strings.Contains(detail.Body.String(), "synthetic-destination") || strings.Contains(public.Body.String(), "synthetic-destination") {
		t.Fatal("recipient leaked")
	}
	if w := call(http.MethodPost, "/api/v1/orders/"+delivery.OrderID+"/shop/recipient", "http://localhost", session.CSRF, "application/json", []byte(`{"extra":true}`)); w.Code != 422 {
		t.Fatal("reveal strict input", w.Code)
	}
	if w := call(http.MethodPost, "/api/v1/admin/orders/"+delivery.OrderID+"/shop/claim", "http://localhost", session.CSRF, "application/json", []byte(`{}`)); w.Code != 403 {
		t.Fatal("customer entered staff portal", w.Code)
	}
	foreign, _ := f.base.auth.login(t, "shop-http-foreign@example.test")
	cookie = &http.Cookie{Name: "bp-customer-session", Value: foreign, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
	if w := call(http.MethodGet, "/api/v1/orders/"+delivery.OrderID+"/shop", "", "", "", nil); w.Code != 404 {
		t.Fatal("foreign order", w.Code)
	}
	cookie = nil
	if w := call(http.MethodGet, path, "", "", "", nil); w.Code != 200 {
		t.Fatal("anonymous public browse", w.Code)
	}
	if w := call(http.MethodGet, "/api/v1/orders/"+delivery.OrderID+"/shop", "", "", "", nil); w.Code != 401 {
		t.Fatal("anonymous private order", w.Code)
	}
}
