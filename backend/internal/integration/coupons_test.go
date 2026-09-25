//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/couponclaim"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func couponPolicy() catalog.CouponDefinition {
	now := time.Now()
	return catalog.CouponDefinition{Code: "SAVE50", Name: "Synthetic test discount", Enabled: true, Kind: "percentage", Value: "50", Currency: "USD", StartsAt: now.Add(-time.Hour), EndsAt: now.Add(time.Hour), MinimumSubtotal: "0", GlobalLimit: 3, CustomerLimit: 1, Categories: []string{"boosting"}}
}
func couponGame(t *testing.T, store *catalog.Store, p *identity.Principal) catalog.Draft {
	t.Helper()
	c := catalogConfig()
	c.Services[0].Evaluator = "pricing-v1"
	c.Services[0].Pricing = &catalog.PricePlan{Currency: "USD", BaseMinor: "100.5", MinimumMinor: "1", MaximumMinor: "99999", Cases: []catalog.PriceCase{{Key: "solo", Answers: catalog.Answers{"mode": json.RawMessage(`"solo"`)}, Outcome: "estimated", AmountMinor: "101"}}}
	d, err := store.Create(t.Context(), p, "coupon-game", c)
	if err != nil {
		t.Fatal(err)
	}
	d, err = store.Mutate(t.Context(), p, d.ID, "publish", catalog.Change{Revision: d.Revision})
	if err != nil {
		t.Fatal(err)
	}
	return d
}
func TestCouponPoliciesClaimsAndAtomicity(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	p := catalogAdmin(t, f)
	store := catalog.New(f.client, f.service)
	_, buyer := f.login(t, "couponbuyer@example.test")
	for _, principal := range []*identity.Principal{nil, buyer} {
		if _, err := store.SaveCoupon(ctx, principal, "", 0, couponPolicy()); err == nil {
			t.Fatal("nonstaff created coupon")
		}
		if _, err := store.ListCoupons(ctx, principal, ""); err == nil {
			t.Fatal("coupon listing exposed")
		}
	}
	d := couponGame(t, store, p)
	policy := couponPolicy()
	view, err := store.SaveCoupon(ctx, p, "", 0, policy)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.SaveCoupon(ctx, p, "", 0, policy); !errors.Is(err, catalog.ErrConflict) {
		t.Fatal("code reused", err)
	}
	input := catalog.CouponCheck{ReleaseID: d.CurrentRelease, Service: "boost", Code: " save50 ", Answers: catalog.Answers{"mode": json.RawMessage(`"solo"`)}}
	result, err := store.CheckCoupon(ctx, buyer, d.Slug, input)
	if err != nil || result.AmountMinor != "50" || result.Discount == nil || result.Discount.AmountMinor != "51" {
		t.Fatal("discount rounded before calculation", result, err)
	}
	if count, countErr := f.client.CouponClaim.Query().Count(ctx); countErr != nil || count != 0 {
		t.Fatal("preview reserved usage", count, countErr)
	}
	// Exact package pricing is derived from the release, not the custom estimate.
	packageInput := input
	packageInput.Package = "pack"
	packageInput.Variant = "basic"
	result, err = store.CheckCoupon(ctx, buyer, d.Slug, packageInput)
	if err != nil || result.AmountMinor != "617" || result.Evaluator != "fixed-package-v1" {
		t.Fatal(result, err)
	}
	claims := []struct {
		user  string
		state couponclaim.State
	}{{buyer.User.ID, couponclaim.StateHeld}, {uuid.NewString(), couponclaim.StateRedeemed}, {uuid.NewString(), couponclaim.StateReleased}}
	for _, claim := range claims {
		if _, err = f.client.CouponClaim.Create().SetCouponID(view.ID).SetCouponVersion(view.Version).SetUserID(claim.user).SetContractID(uuid.NewString()).SetState(claim.state).Save(ctx); err != nil {
			t.Fatal(err)
		}
	}

	claim, err := f.client.CouponClaim.Query().Where(couponclaim.UserIDEQ(buyer.User.ID)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.client.CouponClaim.Create().SetCouponID(view.ID).SetCouponVersion(view.Version).SetUserID(buyer.User.ID).SetContractID(claim.ContractID).SetState(couponclaim.StateHeld).Save(ctx); !ent.IsConstraintError(err) {
		t.Fatal("duplicate contract claim accepted", err)
	}
	if _, err = store.CheckCoupon(ctx, buyer, d.Slug, input); err == nil {
		t.Fatal("personal held use ignored")
	}
	if _, err = store.CheckCoupon(ctx, nil, d.Slug, input); err != nil {
		t.Fatal("anonymous check incorrectly applies another customer's personal limit", err)
	}
	var winners atomic.Int64
	var wg sync.WaitGroup
	policy.Value = "25"
	for range 5 {
		wg.Go(func() {
			_, saveErr := store.SaveCoupon(ctx, p, view.ID, view.Version, policy)
			if saveErr == nil {
				winners.Add(1)
			} else if !errors.Is(saveErr, catalog.ErrConflict) {
				t.Error(saveErr)
			}
		})
	}
	wg.Wait()
	if winners.Load() != 1 {
		t.Fatal("concurrent policy winners", winners.Load())
	}
	history, err := store.CouponHistory(ctx, p, view.ID, 0)
	if err != nil || len(history) != 2 || history[0].Definition.Value != "25" || history[1].Definition.Value != "50" {
		t.Fatal(history, err)
	}
	if _, err = store.CheckCoupon(ctx, buyer, d.Slug, input); err == nil {
		t.Fatal("editing policy reset lifetime personal use")
	}
	policy.GlobalLimit = 2
	view, err = store.SaveCoupon(ctx, p, view.ID, 2, policy)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.CheckCoupon(ctx, nil, d.Slug, input); err == nil {
		t.Fatal("held and redeemed global uses not counted")
	}
	policy.Code = "RENAMED"
	if _, err = store.SaveCoupon(ctx, p, view.ID, view.Version, policy); !errors.Is(err, catalog.ErrConflict) {
		t.Fatal("stable code renamed", err)
	}
	policy.Code = "SAVE50"
	if err = database.Ready(ctx, f.db); err != nil {
		t.Fatal(err)
	}
	// Failed auditing must roll back both the current policy and revision history.
	if _, err = f.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	policy.Value = "10"
	if _, err = store.SaveCoupon(ctx, p, view.ID, view.Version, policy); err == nil {
		t.Fatal("unaudited policy committed")
	}
	history, err = store.CouponHistory(ctx, p, view.ID, 0)
	if err != nil || len(history) != 3 || history[0].Definition.Value != "25" {
		t.Fatal("partial update", history, err)
	}
}
func TestCouponHTTPAndAbuseLimits(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	p := catalogAdmin(t, f)
	store := catalog.New(f.client, f.service)
	d := couponGame(t, store, p)
	if _, err := store.SaveCoupon(ctx, p, "", 0, couponPolicy()); err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	f.service.Register(mux)
	store.Register(mux)
	bootstrap := httptest.NewRecorder()
	mux.ServeHTTP(bootstrap, httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil))
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
		req := httptest.NewRequestWithContext(ctx, http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", origin)
		req.Header.Set("X-Csrf-Token", session.CSRF)
		req.Header.Set("X-Forwarded-For", uuid.NewString())
		for _, cookie := range cookies {
			req.AddCookie(cookie)
		}
		res := httptest.NewRecorder()
		mux.ServeHTTP(res, req)
		return res
	}
	body := `{"release_id":"` + d.CurrentRelease + `","service":"boost","package":"","variant":"","code":"SAVE50","answers":{"mode":"solo"}}`
	endpoint := "/api/v1/catalog/games/coupon-game/discount"
	if res := call(endpoint, body, "https://evil.test"); res.Code != 403 {
		t.Fatal("CSRF accepted", res.Code)
	}
	if res := call("/api/v1/admin/catalog/coupons", `{}`, "http://localhost"); res.Code != 403 {
		t.Fatal("anonymous administration", res.Code)
	}
	if res := call(endpoint, body, "http://localhost"); res.Code != 200 || !strings.Contains(res.Body.String(), `"amount_minor":"50"`) {
		t.Fatal(res.Code, res.Body.String())
	}
	for _, bad := range []string{strings.Replace(body, d.CurrentRelease, "stale", 1), strings.Replace(body, `"code"`, `"amount_minor"`, 1), strings.Replace(body, `"SAVE50"`, `"UNKNOWN"`, 1), strings.Repeat("x", 262145)} {
		res := call(endpoint, bad, "http://localhost")
		if res.Code != 409 && res.Code != 422 {
			t.Fatal("invalid check accepted", res.Code)
		}
	}
	for range 25 {
		if res := call(endpoint, body, "http://localhost"); res.Code != 200 {
			t.Fatal("limit fired early", res.Code)
		}
	}
	if res := call(endpoint, body, "http://localhost"); res.Code != 429 {
		t.Fatal("forged forwarding bypassed shared limit", res.Code)
	}
	f.clock.Add(601)
	if _, err := store.SaveCoupon(ctx, p, "", 0, catalog.CouponDefinition{Code: "OTHER"}); err == nil {
		t.Fatal("invalid policy accepted")
	}
	policy := couponPolicy()
	policy.Code = "OTHER"
	if _, err := store.SaveCoupon(ctx, p, "", 0, policy); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("old staff factors changed financial policy", err)
	}
}
