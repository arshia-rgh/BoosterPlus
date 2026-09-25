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
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reviews"
)

func TestReviewsHTTPBoundariesAndContract(t *testing.T) {
	f := reviewDB(t)
	ctx := t.Context()
	token, buyer := f.auth.login(t, "reviewhttp@example.test")
	f.buyer = buyer
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	f.reviews.Register(mux)
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
	paid := f.completed(t)
	input := f.feedback()
	path := "/api/v1/orders/" + paid.Order.ID + "/review"
	raw, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	body := string(raw)
	if res := call(path, body, "https://evil.test"); res.Code != http.StatusForbidden {
		t.Fatal("CSRF bypass", res.Code)
	}
	for _, bad := range []string{strings.Replace(body, `"rating":`, `"published":true,"rating":`, 1), body + body, strings.Repeat("x", 262145)} {
		if res := call(path, bad, "http://localhost"); res.Code != http.StatusUnprocessableEntity {
			t.Fatal("malformed submission accepted", res.Code)
		}
	}
	result := call(path, body, "http://localhost")
	if result.Code != http.StatusOK {
		t.Fatal("valid submission failed", result.Code, result.Body.String())
	}
	var detail reviews.View
	if err = json.Unmarshal(result.Body.Bytes(), &detail); err != nil {
		t.Fatal(err)
	}
	if _, err = f.reviews.Get(ctx, buyer, detail.Review.ID, false); err != nil {
		t.Fatal(err)
	}
	if res := call("/api/v1/admin/reviews/"+detail.Review.ID+"/publish", `{}`, "http://localhost"); res.Code != http.StatusForbidden {
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
	published := f.publish(t, detail)
	feed, err := f.reviews.Public(ctx, f.game.Slug, "", "", "")
	if err != nil {
		t.Fatal(err)
	}
	eligibility, err := f.reviews.ForOrder(ctx, buyer, paid.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	history, err := f.reviews.History(ctx, f.admin, detail.Review.ID, true, 0)
	if err != nil {
		t.Fatal(err)
	}
	if result.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("private review cache enabled")
	}
	for name, value := range map[string]any{"PurchaseReview": published, "ReviewWrite": input, "ReviewListing": reviews.Listing{Items: []reviews.Summary{detail.Review}}, "OrderReview": eligibility, "ReviewAction": reviews.Action{Version: 1, Note: "", Response: "", ReasonCode: "", PolicyChecked: true}, "ReviewHistory": map[string]any{"revisions": history}, "ReviewFeed": feed, "PublicPurchaseReview": feed.Items[0]} {
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
