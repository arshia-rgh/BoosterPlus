//go:build integration

package integration

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
)

var winRateOrderFields = []string{"requested_win_rate", "win_rate_preference"}

func winRateOrderDB(t *testing.T) *orderFixture {
	t.Helper()
	f := orderDB(t)
	c := f.game.Configuration
	c.Services[0].Fields = append(c.Services[0].Fields,
		catalog.Field{Key: "requested_win_rate", Label: "Legacy declared win rate", Type: "decimal", Stage: "estimate", Unit: "%", Min: "0", Max: "100", Step: "0.1"},
		catalog.Field{Key: "win_rate_preference", Label: "Win rate preference", Type: "win_rate", Stage: "estimate"},
	)
	c.Packages[0].Variants[0].ExcludedFields = append(c.Packages[0].Variants[0].ExcludedFields, winRateOrderFields...)
	var err error
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "publish", catalog.Change{Revision: f.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	return f
}

func hasWinRateIssue(issues []catalog.Issue, field string) bool {
	for _, issue := range issues {
		if issue.Path == field {
			return true
		}
	}
	return false
}

func requireWinRateOrderError(t *testing.T, err error, field string) {
	t.Helper()
	var invalid *orders.Invalid
	if !errors.As(err, &invalid) || !hasWinRateIssue(invalid.Issues, field) {
		t.Fatalf("new numeric win rate did not return its field error: %s: %v", field, err)
	}
}

func TestWinRateNewOrdersRevisionsAndReorder(t *testing.T) {
	f := winRateOrderDB(t)
	ctx := t.Context()
	for _, kind := range []string{"custom", "package"} {
		for _, field := range winRateOrderFields {
			for _, raw := range []string{`"85"`, `"100"`, `85`, `100`} {
				input := f.input(kind)
				input.Answers[field] = json.RawMessage(raw)
				_, err := f.store.Create(ctx, f.buyer, input)
				requireWinRateOrderError(t, err, field)
			}
		}
	}
	for _, query := range []string{"SELECT COUNT(*) FROM orders", "SELECT COUNT(*) FROM order_contracts", "SELECT COUNT(*) FROM order_events", "SELECT COUNT(*) FROM coupon_claims"} {
		var count int
		if err := f.auth.db.QueryRowContext(ctx, query).Scan(&count); err != nil || count != 0 {
			t.Fatal("rejected new selections left an order or commercial side effect", query, count, err)
		}
	}
	// These fields are optional: absence must not silently become an exact target.
	for _, kind := range []string{"custom", "package"} {
		detail, err := f.store.Create(ctx, f.buyer, f.input(kind))
		if err != nil {
			t.Fatal("omitted optional preferences rejected", kind, err)
		}
		for _, field := range winRateOrderFields {
			if _, exists := detail.Answers[field]; exists {
				t.Fatal("optional win rate was invented", field)
			}
		}
	}
	for _, preference := range []string{"any", "range:65:80", "below:75", "above:85", "exact:100"} {
		input := f.input("custom")
		encoded, err := json.Marshal(preference)
		if err != nil {
			t.Fatal(err)
		}
		for _, field := range winRateOrderFields {
			input.Answers[field] = encoded
		}
		detail, err := f.store.Create(ctx, f.buyer, input)
		if err != nil {
			t.Fatal("rich preference rejected", preference, err)
		}
		draft, err := f.store.Reorder(ctx, f.buyer, detail.Order.ID)
		if err != nil || len(draft.Issues) != 0 || draft.Offer.ID != f.game.CurrentRelease || draft.Answers["note"] != nil {
			t.Fatal("rich reorder did not preserve only safe current selections", err, draft.Issues)
		}
		for _, field := range winRateOrderFields {
			if !bytes.Equal(detail.Answers[field], encoded) || !bytes.Equal(draft.Answers[field], encoded) {
				t.Fatal("rich win rate was changed or discarded", preference, field)
			}
		}
		if preference == "any" {
			assertWinRateInvalidRevisionPreservesQuote(t, f, detail)
		}
		if preference == "exact:100" {
			fixed := f.input("package")
			fixed.Answers = input.Answers
			_, createErr := f.store.Create(ctx, f.buyer, fixed)
			requireWinRateOrderError(t, createErr, "requested_win_rate")
		}
	}
}

func assertWinRateInvalidRevisionPreservesQuote(t *testing.T, f *orderFixture, detail orders.Detail) {
	t.Helper()
	ctx := t.Context()
	quoted, err := f.store.IssueQuote(ctx, f.admin, detail.Order.ID, f.quote(detail))
	if err != nil || quoted.Quote == nil {
		t.Fatal("quote fixture", err)
	}
	projections := []string{
		"SELECT id,version,state,answers,estimate,current_quote,current_contract,updated_at FROM orders ORDER BY id",
		"SELECT id,state,data FROM order_quotes ORDER BY id",
		"SELECT id,order_id,version,action FROM order_events ORDER BY id",
	}
	before := make([]string, len(projections))
	for i, query := range projections {
		before[i] = upgradeDigest(t, f.auth.db, query)
	}
	for _, field := range winRateOrderFields {
		for _, raw := range []string{`"85"`, `"100"`, `85`, `100`} {
			answers := f.input("custom").Answers
			answers[field] = json.RawMessage(raw)
			_, reviseErr := f.store.Revise(ctx, f.buyer, quoted.Order.ID, orders.Revision{Version: quoted.Order.Version, Answers: answers})
			requireWinRateOrderError(t, reviseErr, field)
		}
	}
	for i, query := range projections {
		if upgradeDigest(t, f.auth.db, query) != before[i] {
			t.Fatal("invalid revision changed order, quote or history", i)
		}
	}
	loaded, err := f.store.Get(ctx, f.buyer, quoted.Order.ID, false)
	if err != nil || loaded.Order.Version != quoted.Order.Version || loaded.Quote == nil || loaded.Quote.ID != quoted.Quote.ID || loaded.Quote.State != quoted.Quote.State {
		t.Fatal("invalid revision replaced the current quote", err)
	}
}

func winRateDocument(t *testing.T, value any) map[string]any {
	t.Helper()
	data, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	var result map[string]any
	if err = json.Unmarshal(data, &result); err != nil {
		t.Fatal(err)
	}
	return result
}

func TestWinRateHistoricalNumericOrdersRemainReadableAndReplayable(t *testing.T) {
	f := winRateOrderDB(t)
	ctx := t.Context()
	release, err := f.catalog.Published(ctx, f.game.Slug)
	if err != nil {
		t.Fatal(err)
	}
	// An isolated persisted release models the historical numeric surcharge. The
	// current published form remains unchanged; there is no runtime bypass.
	release.Configuration.Services[0].Evaluator = "pricing-v1"
	release.Configuration.Services[0].Pricing = &catalog.PricePlan{Currency: "USD", BaseMinor: "1000", MinimumMinor: "1", MaximumMinor: "100000", Rules: []catalog.PriceRule{{Key: "win-rate", Label: "Historical target", Kind: "fixed", Value: "500", When: &catalog.Condition{Op: "gte", Field: "requested_win_rate", Values: []string{"80"}}}}}
	for _, raw := range []string{`"85"`, `"100"`} {
		input := f.input("custom")
		input.Answers["requested_win_rate"] = json.RawMessage(raw)
		validated := catalog.ValidateAnswers(release.Configuration, input.Service, "order", input.Answers, nil)
		if len(validated.Issues) != 0 {
			t.Fatal("historical answer validation changed", validated.Issues)
		}
		estimateAnswers := catalog.Answers{"mode": input.Answers["mode"], "requested_win_rate": input.Answers["requested_win_rate"]}
		now := time.Unix(f.auth.clock.Load(), 0)
		estimate := catalog.Calculate(release, input.Service, estimateAnswers, now)
		if estimate.Outcome != "estimated" || estimate.AmountMinor != "1500" || len(estimate.Issues) != 0 {
			t.Fatal("historical numeric calculation lost its surcharge", estimate)
		}
		request, marshalErr := json.Marshal(input)
		if marshalErr != nil {
			t.Fatal(marshalErr)
		}
		row, createErr := f.auth.client.Order.Create().SetUserID(f.buyer.User.ID).SetGameID(release.GameID).SetGameName(release.Configuration.Name).SetSlug(input.Slug).SetService(input.Service).SetKind(order.KindCustom).SetRequestKey(input.RequestKey).SetRequestHash(f.auth.service.RequestDigest("order-create", request)).SetState(order.StateSubmitted).SetAnswers(winRateDocument(t, validated.Answers)).SetSnapshot(winRateDocument(t, release)).SetEstimate(winRateDocument(t, estimate)).SetTermsVersion(input.TermsVersion).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		if createErr != nil {
			t.Fatal(createErr)
		}
		before := upgradeDigest(t, f.auth.db, "SELECT id,version,state,answers,snapshot,estimate,request_hash FROM orders ORDER BY id")
		loaded, readErr := f.store.Get(ctx, f.buyer, row.ID, false)
		if readErr != nil || string(loaded.Answers["requested_win_rate"]) != raw || loaded.Estimate.AmountMinor != "1500" {
			t.Fatal("historical order became unreadable", readErr)
		}
		replayed, replayErr := f.store.Create(ctx, f.buyer, input)
		if replayErr != nil || replayed.Order.ID != row.ID || replayed.Estimate.AmountMinor != "1500" {
			t.Fatal("exact historical request replay failed", replayErr)
		}
		if upgradeDigest(t, f.auth.db, "SELECT id,version,state,answers,snapshot,estimate,request_hash FROM orders ORDER BY id") != before {
			t.Fatal("historical read/replay changed persisted evidence")
		}
		draft, reorderErr := f.store.Reorder(ctx, f.buyer, row.ID)
		if reorderErr != nil || draft.Answers["requested_win_rate"] != nil || !hasWinRateIssue(draft.Issues, "requested_win_rate") || string(draft.Answers["mode"]) != `"solo"` {
			t.Fatal("historical numeric target became a new reorder default", reorderErr, draft)
		}
		// A new idempotency key is a new purchase, even for the same old answers.
		input.RequestKey = uuid.NewString()
		_, newErr := f.store.Create(ctx, f.buyer, input)
		requireWinRateOrderError(t, newErr, "requested_win_rate")
	}
}

func TestWinRatePublicValidationEstimateAndCouponBoundaries(t *testing.T) {
	f := winRateOrderDB(t)
	ctx := t.Context()
	policy := couponPolicy()
	if _, err := f.catalog.SaveCoupon(ctx, f.admin, "", 0, policy); err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	f.catalog.Register(mux)
	bootstrap := httptest.NewRecorder()
	mux.ServeHTTP(bootstrap, httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil))
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err := json.Unmarshal(bootstrap.Body.Bytes(), &session); err != nil || session.CSRF == "" {
		t.Fatal("public CSRF bootstrap", err)
	}
	response := bootstrap.Result()
	cookies := response.Cookies()
	if err := response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	for _, boundary := range []string{"validate", "estimate", "discount", "custom_discount"} {
		endpoint := boundary
		if boundary == "custom_discount" {
			endpoint = "discount"
		}
		for _, field := range winRateOrderFields {
			for _, raw := range []string{`"85"`, `"100"`, `85`, `100`} {
				body := map[string]any{"release_id": f.game.CurrentRelease, "service": "boost", "answers": catalog.Answers{"mode": json.RawMessage(`"solo"`), field: json.RawMessage(raw)}}
				if endpoint == "validate" {
					body["stage"] = "estimate"
				}
				if endpoint == "discount" {
					body["code"], body["stage"] = policy.Code, "order"
					if boundary == "discount" {
						body["package"], body["variant"] = "pack", "basic"
					}
				}
				encoded, err := json.Marshal(body)
				if err != nil {
					t.Fatal(err)
				}
				req := httptest.NewRequestWithContext(ctx, http.MethodPost, "/api/v1/catalog/games/"+f.game.Slug+"/"+endpoint, bytes.NewReader(encoded))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("Origin", f.auth.cfg.PublicOrigin)
				req.Header.Set("X-Csrf-Token", session.CSRF)
				for _, cookie := range cookies {
					req.AddCookie(cookie)
				}
				res := httptest.NewRecorder()
				mux.ServeHTTP(res, req)
				var result catalog.Estimate
				if err = json.Unmarshal(res.Body.Bytes(), &result); err != nil || res.Code != http.StatusOK || !hasWinRateIssue(result.Issues, field) {
					t.Fatal("public boundary accepted a new numeric selection", boundary, field, raw, res.Code, err)
				}
				if endpoint != "validate" && (result.Outcome != "invalid" || result.AmountMinor != "" || result.Discount != nil || len(result.Lines) != 0) {
					t.Fatal("invalid selection received a price or discount", endpoint, result)
				}
			}
		}
	}
	valid := catalog.CouponCheck{ReleaseID: f.game.CurrentRelease, Service: "boost", Package: "pack", Variant: "basic", Code: policy.Code, Stage: "order", Answers: f.input("package").Answers}
	discounted, err := f.catalog.CheckCoupon(ctx, f.buyer, f.game.Slug, valid)
	if err != nil || len(discounted.Issues) != 0 || discounted.Outcome != "estimated" || discounted.AmountMinor != "617" || discounted.Discount == nil || discounted.Discount.AmountMinor != "617" {
		t.Fatal("fixed contents could not receive the published package discount", err, discounted)
	}
	if count, err := f.auth.client.CouponClaim.Query().Count(ctx); err != nil || count != 0 {
		t.Fatal("public preview reserved a coupon", count, err)
	}
}
