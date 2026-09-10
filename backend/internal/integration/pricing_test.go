//go:build integration

package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

func TestPricingReleaseAndTransport(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	p := catalogAdmin(t, f)
	store := catalog.New(f.client, f.service)
	c := catalogConfig()
	c.Services[0].Evaluator = "pricing-v1"
	c.Services[0].Pricing = &catalog.PricePlan{Currency: "USD", BaseMinor: "100.5", MinimumMinor: "1", MaximumMinor: "99999", Rules: []catalog.PriceRule{}, Cases: []catalog.PriceCase{{Key: "solo", Answers: catalog.Answers{"mode": json.RawMessage(`"solo"`)}, Outcome: "estimated", AmountMinor: "101"}}}
	d, err := store.Create(ctx, p, "priced", c)
	if err != nil {
		t.Fatal(err)
	}
	d, err = store.Mutate(ctx, p, d.ID, "publish", catalog.Change{Revision: d.Revision})
	if err != nil {
		t.Fatal(err)
	}
	release, err := store.Published(ctx, "priced")
	if err != nil {
		t.Fatal(err)
	}
	if len(release.Configuration.Services[0].Pricing.Cases) != 0 {
		t.Fatal("saved case inputs leaked publicly")
	}
	if got := catalog.Calculate(release, "boost", c.Services[0].Pricing.Cases[0].Answers, time.Now()); got.AmountMinor != "101" {
		t.Fatal(got)
	}
	mux := http.NewServeMux()
	f.service.Register(mux)
	store.Register(mux)
	bootstrap := httptest.NewRecorder()
	mux.ServeHTTP(bootstrap, httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil))
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err = json.Unmarshal(bootstrap.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	response := bootstrap.Result()
	cookies := response.Cookies()
	if err = response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	call := func(path, body, origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequestWithContext(ctx, http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", origin)
		req.Header.Set("X-Csrf-Token", session.CSRF)
		for _, cookie := range cookies {
			req.AddCookie(cookie)
		}
		res := httptest.NewRecorder()
		mux.ServeHTTP(res, req)
		return res
	}
	body := `{"release_id":"` + d.CurrentRelease + `","service":"boost","answers":{"mode":"solo"}}`
	endpoint := "/api/v1/catalog/games/priced/estimate"
	if res := call(endpoint, body, "http://localhost"); res.Code != 200 || !strings.Contains(res.Body.String(), `"amount_minor":"101"`) {
		t.Fatal(res.Code, res.Body.String())
	}
	if res := call(endpoint, body, "https://evil.test"); res.Code != 403 {
		t.Fatal("CSRF accepted", res.Code)
	}
	if res := call("/api/v1/admin/catalog/games/"+d.ID+"/estimate-preview", body, "http://localhost"); res.Code != 401 {
		t.Fatal("anonymous draft access", res.Code)
	}
	for _, bad := range []string{strings.Replace(body, d.CurrentRelease, "stale", 1), strings.Replace(body, `"service"`, `"amount_minor"`, 1), body + body, strings.Repeat("x", 262145)} {
		res := call(endpoint, bad, "http://localhost")
		if res.Code != 409 && res.Code != 422 {
			t.Fatal("bad input accepted", res.Code)
		}
	}
	c.Services[0].Pricing.BaseMinor = "200.5"
	d, err = store.Mutate(ctx, p, d.ID, "save", catalog.Change{Revision: d.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.Mutate(ctx, p, d.ID, "publish", catalog.Change{Revision: d.Revision}); err == nil {
		t.Fatal("stale expected price published")
	}
	if res := call(endpoint, body, "http://localhost"); res.Code != 200 || !strings.Contains(res.Body.String(), `"amount_minor":"101"`) {
		t.Fatal("draft price leaked", res.Code)
	}
	c.Services[0].Pricing.Cases[0].AmountMinor = "201"
	d, err = store.Mutate(ctx, p, d.ID, "save", catalog.Change{Revision: d.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	d, err = store.Mutate(ctx, p, d.ID, "publish", catalog.Change{Revision: d.Revision})
	if err != nil {
		t.Fatal(err)
	}
	if res := call(endpoint, body, "http://localhost"); res.Code != 409 {
		t.Fatal("old release accepted", res.Code)
	}
	if got := catalog.Calculate(release, "boost", c.Services[0].Pricing.Cases[0].Answers, time.Now()); got.AmountMinor != "101" {
		t.Fatal("historical snapshot changed", got)
	}
	body = strings.Replace(body, release.ID, d.CurrentRelease, 1)
	if res := call(endpoint, body, "http://localhost"); res.Code != 200 || !strings.Contains(res.Body.String(), `"amount_minor":"201"`) {
		t.Fatal("current price missing", res.Code)
	}
	if _, err = store.Mutate(ctx, p, d.ID, "pause", catalog.Change{Revision: d.Revision}); err != nil {
		t.Fatal(err)
	}
	if res := call(endpoint, body, "http://localhost"); res.Code != 409 {
		t.Fatal("paused estimate accepted", res.Code)
	}
}
