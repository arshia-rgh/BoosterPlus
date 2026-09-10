//go:build integration

package integration

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
)

func TestFulfillmentHTTPAndResponseContract(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	token, buyer := f.auth.login(t, "httpfulfillmentbuyer@example.test")
	f.buyer = buyer
	v := f.assign(t, f.paid(t, "duo"))
	handler := httpapi.New(f.auth.db.PingContext, slog.New(slog.DiscardHandler), false, f.auth.service.Register, f.work.Register)
	cookie := &http.Cookie{Name: "bp-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
	bootstrap := httptest.NewRecorder()
	r := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil)
	r.AddCookie(cookie)
	handler.ServeHTTP(bootstrap, r)
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
	call := func(method, path, content, origin string, body []byte) *httptest.ResponseRecorder {
		request := httptest.NewRequestWithContext(ctx, method, path, bytes.NewReader(body))
		request.AddCookie(cookie)
		for _, c := range cookies {
			request.AddCookie(c)
		}
		request.Header.Set("Content-Type", content)
		request.Header.Set("Origin", origin)
		request.Header.Set("X-Csrf-Token", session.CSRF)
		out := httptest.NewRecorder()
		handler.ServeHTTP(out, request)
		return out
	}
	path := "/api/v1/fulfillment/" + v.OrderID
	read := call(http.MethodGet, path, "", "", nil)
	if read.Code != http.StatusOK || read.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("private view", read.Code, read.Header().Get("Cache-Control"))
	}
	var contract any
	if err := json.Unmarshal(api.Contract, &contract); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("contract.json", contract); err != nil {
		t.Fatal(err)
	}
	schema, err := compiler.Compile("contract.json#/components/schemas/FulfillmentView")
	if err != nil {
		t.Fatal(err)
	}
	var view any
	if err = json.Unmarshal(read.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if err = schema.Validate(view); err != nil {
		t.Fatal(err)
	}
	if out := call(http.MethodGet, "/api/v1/booster/fulfillment/"+v.OrderID, "", "", nil); out.Code != http.StatusForbidden {
		t.Fatal("customer entered staff view", out.Code)
	}
	body, err := json.Marshal(map[string]any{"version": v.Version, "order_version": v.OrderVersion, "answers": map[string]string{"player": "synthetic-player"}})
	if err != nil {
		t.Fatal(err)
	}
	if out := call(http.MethodPost, path+"/handoff", "application/json", "https://evil.test", body); out.Code != http.StatusForbidden {
		t.Fatal("forged origin", out.Code)
	}
	for _, scenario := range []struct {
		content string
		body    []byte
	}{{"text/plain", body}, {"application/json", []byte(`{"unexpected":true}`)}, {"application/json", append(bytes.Clone(body), []byte(` {}`)...)}, {"application/json", bytes.Repeat([]byte("x"), 262145)}} {
		out := call(http.MethodPost, path+"/handoff", scenario.content, "http://localhost", scenario.body)
		if out.Code != http.StatusUnprocessableEntity {
			t.Fatal("bad handoff", out.Code)
		}
	}
	out := call(http.MethodPost, path+"/handoff", "application/json", "http://localhost", body)
	if out.Code != http.StatusOK {
		t.Fatal("valid handoff", out.Code)
	}
	if out = call(http.MethodPost, path+"/handoff", "application/json", "http://localhost", body); out.Code != http.StatusConflict {
		t.Fatal("stale handoff", out.Code)
	}
	window, start := f.availability(t)
	current, err := f.work.Get(ctx, f.buyer, v.OrderID, "account")
	if err != nil {
		t.Fatal(err)
	}
	proposalBody, err := json.Marshal(fulfillment.BookingInput{WorkVersion: current.Version, RequestKey: uuid.NewString(), AvailabilityID: window.ID, Start: localInstant(start), End: localInstant(start.Add(time.Hour)), Note: "HTTP session proposal"})
	if err != nil {
		t.Fatal(err)
	}
	for _, suffix := range []string{"/bookings", "/slots"} {
		if out = call(http.MethodGet, path+suffix, "", "", nil); out.Code != http.StatusOK {
			t.Fatal("calendar read", suffix, out.Code)
		}
	}
	if out = call(http.MethodGet, path+"/slots?week=13", "", "", nil); out.Code != http.StatusUnprocessableEntity {
		t.Fatal("invalid week", out.Code)
	}
	if out = call(http.MethodGet, "/api/v1/booster/calendar", "", "", nil); out.Code != http.StatusForbidden {
		t.Fatal("customer calendar access", out.Code)
	}
	if out = call(http.MethodPost, path+"/bookings", "application/json", "https://evil.test", proposalBody); out.Code != http.StatusForbidden {
		t.Fatal("booking CSRF", out.Code)
	}
	for _, invalid := range [][]byte{[]byte(`{"unexpected":true}`), bytes.Repeat([]byte("x"), 262145)} {
		if out = call(http.MethodPost, path+"/bookings", "application/json", "http://localhost", invalid); out.Code != http.StatusUnprocessableEntity {
			t.Fatal("invalid booking body", out.Code)
		}
	}
	if out = call(http.MethodPost, path+"/bookings", "application/json", "http://localhost", proposalBody); out.Code != http.StatusOK {
		t.Fatal("booking HTTP", out.Code)
	}
	bookingSchema, err := compiler.Compile("contract.json#/components/schemas/BookingView")
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(out.Body.Bytes(), &view); err != nil {
		t.Fatal(err)
	}
	if err = bookingSchema.Validate(view); err != nil {
		t.Fatal(err)
	}

}
