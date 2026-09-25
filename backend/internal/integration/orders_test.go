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

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/couponclaim"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
)

type orderFixture struct {
	auth                *authFixture
	admin, buyer, other *identity.Principal
	store               *orders.Store
	catalog             *catalog.Store
	game                catalog.Draft
}

func orderDB(t *testing.T) *orderFixture {
	t.Helper()
	f := authDB(t, nil)
	p := catalogAdmin(t, f)
	_, buyer := f.login(t, "orderbuyer@example.test")
	_, other := f.login(t, "otherbuyer@example.test")
	cat := catalog.New(f.client, f.service)
	c := catalogConfig()
	c.Services[0].Fields = append(c.Services[0].Fields, catalog.Field{Key: "note", Label: "Ordinary instructions", Type: "short_text", Stage: "order", MaxLength: 100})
	capacity := 2
	c.Packages[0].Variants[0].Capacity = &capacity
	d, err := cat.Create(t.Context(), p, "orders-game", c)
	if err != nil {
		t.Fatal(err)
	}
	d, err = cat.Mutate(t.Context(), p, d.ID, "publish", catalog.Change{Revision: d.Revision})
	if err != nil {
		t.Fatal(err)
	}
	return &orderFixture{f, p, buyer, other, orders.New(f.client, f.service, func() time.Time { return time.Unix(f.clock.Load(), 0) }), cat, d}
}
func (f *orderFixture) input(kind string) orders.CreateInput {
	input := orders.CreateInput{RequestKey: uuid.NewString(), ReleaseID: f.game.CurrentRelease, Slug: f.game.Slug, Service: "boost", Kind: kind, Answers: catalog.Answers{"mode": json.RawMessage(`"solo"`), "note": json.RawMessage(`"ordinary customer note"`)}, AcceptTerms: true, TermsVersion: f.auth.cfg.TermsVersion}
	if kind == "package" {
		input.Package = "pack"
		input.Variant = "basic"
		input.ExpectedAmount = "1234"
	}
	return input
}
func (f *orderFixture) quote(detail orders.Detail) orders.QuoteInput {
	return orders.QuoteInput{Version: detail.Order.Version, Lines: []catalog.PriceLine{}, AmountMinor: "2000", Currency: "USD", Scope: "The requested synthetic boost", Reason: "Reviewed the requested scope", DeliveryMinHours: 1, DeliveryMaxHours: 24, ExpiresAt: time.Unix(f.auth.clock.Load(), 0).Add(48 * time.Hour)}
}
func (f *orderFixture) create(t *testing.T, kind string) orders.Detail {
	t.Helper()
	result, err := f.store.Create(t.Context(), f.buyer, f.input(kind))
	if err != nil {
		t.Fatal(err)
	}
	return result
}
func TestOrdersOwnershipIdempotencyAndQuoteJourney(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	input := f.input("custom")
	var successes atomic.Int64
	var ids sync.Map
	var wg sync.WaitGroup
	for range 5 {
		wg.Go(func() {
			result, err := f.store.Create(ctx, f.buyer, input)
			if err != nil {
				t.Error(err)
				return
			}
			successes.Add(1)
			ids.Store(result.Order.ID, true)
		})
	}
	wg.Wait()
	count := 0
	ids.Range(func(_, _ any) bool { count++; return true })
	if successes.Load() != 5 || count != 1 {
		t.Fatal("duplicate requests created multiple orders", count, successes.Load())
	}
	detail, err := f.store.Create(ctx, f.buyer, input)
	if err != nil {
		t.Fatal(err)
	}
	different := input
	different.CouponCode = "OTHER"
	if _, err = f.store.Create(ctx, f.buyer, different); !errors.Is(err, orders.ErrConflict) {
		t.Fatal("key reuse accepted", err)
	}
	if _, err = f.store.Get(ctx, f.other, detail.Order.ID, false); !ent.IsNotFound(err) {
		t.Fatal("other buyer read order", err)
	}
	if _, err = f.store.Get(ctx, f.other, detail.Order.ID, true); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer entered admin view", err)
	}
	if _, err = f.store.Get(ctx, f.admin, detail.Order.ID, true); err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.Transition(ctx, f.buyer, detail.Order.ID, "accept", false, orders.Action{Version: 1, AcceptTerms: true, TermsVersion: input.TermsVersion}); err == nil {
		t.Fatal("estimate became payable")
	}
	detail, err = f.store.Transition(ctx, f.admin, detail.Order.ID, "clarify", true, orders.Action{Version: detail.Order.Version, Message: "Please confirm the chosen mode."})
	if err != nil || detail.Order.State != "needs_information" {
		t.Fatal(detail, err)
	}
	if _, err = f.store.IssueQuote(ctx, f.admin, detail.Order.ID, f.quote(detail)); err == nil {
		t.Fatal("unanswered clarification quoted")
	}
	detail, err = f.store.Revise(ctx, f.buyer, detail.Order.ID, orders.Revision{Version: detail.Order.Version, Answers: input.Answers})
	if err != nil {
		t.Fatal(err)
	}
	detail, err = f.store.IssueQuote(ctx, f.admin, detail.Order.ID, f.quote(detail))
	if err != nil || detail.Quote == nil {
		t.Fatal(detail, err)
	}
	firstQuote := detail.Quote.ID
	next := f.quote(detail)
	next.AmountMinor = "2200"
	next.Reason = "Additional work confirmed"
	detail, err = f.store.IssueQuote(ctx, f.admin, detail.Order.ID, next)
	if err != nil {
		t.Fatal(err)
	}
	history, err := f.store.Quotes(ctx, f.buyer, detail.Order.ID, false, 0)
	if err != nil || len(history) != 2 || history[1].ID != firstQuote || history[1].State != "superseded" || history[1].Data.AmountMinor != "2000" {
		t.Fatal(history, err)
	}
	if _, err = f.store.Transition(ctx, f.buyer, detail.Order.ID, "accept", false, orders.Action{Version: detail.Order.Version, QuoteID: firstQuote, AcceptTerms: true, TermsVersion: input.TermsVersion}); !errors.Is(err, orders.ErrConflict) {
		t.Fatal("superseded quote accepted", err)
	}
	detail, err = f.store.Transition(ctx, f.buyer, detail.Order.ID, "accept", false, orders.Action{Version: detail.Order.Version, QuoteID: detail.Quote.ID, AcceptTerms: true, TermsVersion: input.TermsVersion})
	if err != nil || detail.Contract == nil || detail.Contract.Data.AmountMinor != "2200" || detail.Order.State != "awaiting_payment" {
		t.Fatal(detail, err)
	}
	if _, err = f.store.IssueQuote(ctx, f.admin, detail.Order.ID, f.quote(detail)); err == nil {
		t.Fatal("accepted contract repriced")
	}
	if _, err = f.store.Transition(ctx, f.admin, detail.Order.ID, "queued", true, orders.Action{Version: detail.Order.Version, Message: "pretend paid"}); err == nil {
		t.Fatal("staff manually marked payment")
	}
	if _, err = f.auth.client.OrderContract.UpdateOneID(detail.Contract.ID).SetPaymentState(ordercontract.PaymentStateInvoicePending).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.Transition(ctx, f.buyer, detail.Order.ID, "cancel", false, orders.Action{Version: detail.Order.Version}); !errors.Is(err, orders.ErrConflict) {
		t.Fatal("invoice-pending contract retired without reconciliation", err)
	}
	events, err := f.store.Events(ctx, f.buyer, detail.Order.ID, false, 0)
	if err != nil || len(events) != 6 {
		t.Fatal("timeline is incomplete", len(events), err)
	}
	if _, err = f.store.Events(ctx, f.other, detail.Order.ID, false, 0); !ent.IsNotFound(err) {
		t.Fatal("other customer read timeline", err)
	}
	list, err := f.store.List(ctx, f.other, false, "", "", "")
	if err != nil || len(list.Orders) != 0 {
		t.Fatal("private history leaked", err)
	}
}

func TestPackageCapacityAndCouponReservations(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	policy := couponPolicy()
	policy.CustomerLimit = 0
	policy.GlobalLimit = 2
	coupon, err := f.catalog.SaveCoupon(ctx, f.admin, "", 0, policy)
	if err != nil {
		t.Fatal(err)
	}
	var wins atomic.Int64
	var winnerIDs sync.Map
	var wg sync.WaitGroup
	for range 5 {
		wg.Go(func() {
			input := f.input("package")
			input.CouponCode = policy.Code
			input.ExpectedAmount = "617"
			input.ExpectedCouponVersion = coupon.Version
			result, createErr := f.store.Create(ctx, f.buyer, input)
			if createErr == nil {
				wins.Add(1)
				winnerIDs.Store(result.Order.ID, true)
			} else {
				var invalidCoupon *catalog.Invalid
				if !errors.Is(createErr, orders.ErrConflict) && !errors.As(createErr, &invalidCoupon) {
					t.Error(createErr)
				}
			}
		})
	}
	wg.Wait()
	if wins.Load() != 2 {
		t.Fatal("capacity or coupon oversold", wins.Load())
	}
	claims, err := f.auth.client.CouponClaim.Query().Where(couponclaim.CouponIDEQ(coupon.ID), couponclaim.StateEQ(couponclaim.StateHeld)).Count(ctx)
	if err != nil || claims != 2 {
		t.Fatal("claims not atomic", claims, err)
	}
	var id string
	winnerIDs.Range(func(key, _ any) bool {
		value, ok := key.(string)
		if !ok {
			t.Error("invalid key")
		}
		id = value
		return false
	})
	detail, err := f.store.Get(ctx, f.buyer, id, false)
	if err != nil {
		t.Fatal(err)
	}
	detail, err = f.store.Transition(ctx, f.buyer, id, "cancel", false, orders.Action{Version: detail.Order.Version})
	if err != nil || detail.Contract.PaymentState != "retired" {
		t.Fatal(detail, err)
	}
	input := f.input("package")
	input.CouponCode = policy.Code
	input.ExpectedAmount = "617"
	input.ExpectedCouponVersion = coupon.Version
	detail, err = f.store.Create(ctx, f.buyer, input)
	if err != nil {
		t.Fatal("unissued cancellation did not safely release resources", err)
	}
	if _, err = f.catalog.Mutate(ctx, f.admin, f.game.ID, "pause", catalog.Change{Revision: f.game.Revision}); err != nil {
		t.Fatal(err)
	}
	replay, err := f.store.Create(ctx, f.buyer, input)
	if err != nil || replay.Order.ID != detail.Order.ID {
		t.Fatal("idempotent replay failed after availability changed", err)
	}
	input.RequestKey = uuid.NewString()
	if _, err = f.store.Create(ctx, f.buyer, input); !errors.Is(err, orders.ErrConflict) {
		t.Fatal("paused offer bought", err)
	}
}

func TestOrderSnapshotsFavoritesAndReorder(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	detail := f.create(t, "package")
	saved, err := f.store.SaveFavorite(ctx, f.buyer, orders.FavoriteInput{Kind: "package", Slug: f.game.Slug, Package: "pack"})
	if err != nil {
		t.Fatal(err)
	}
	repeated, err := f.store.SaveFavorite(ctx, f.buyer, orders.FavoriteInput{Kind: "package", Slug: f.game.Slug, Package: "pack"})
	if err != nil || saved.ID != repeated.ID {
		t.Fatal("favorite duplicate", err)
	}
	if err = f.store.RemoveFavorite(ctx, f.other, saved.ID); err != nil {
		t.Fatal(err)
	}
	list, err := f.store.Favorites(ctx, f.buyer, "")
	if err != nil || len(list.Favorites) != 1 {
		t.Fatal("other customer removed favorite", err)
	}
	c := f.game.Configuration
	c.Name = "New catalog"
	c.Packages[0].Variants[0].AmountMinor = "9999"
	c.Services[0].Fields[0].Options = []catalog.Option{{Key: "duo", Label: "Duo"}}
	d, err := f.catalog.Mutate(ctx, f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	d, err = f.catalog.Mutate(ctx, f.admin, d.ID, "publish", catalog.Change{Revision: d.Revision})
	if err != nil {
		t.Fatal(err)
	}
	original, err := f.store.Get(ctx, f.buyer, detail.Order.ID, false)
	if err != nil || original.Offer.Configuration.Name != "Synthetic game" || original.Contract.Data.AmountMinor != "1234" {
		t.Fatal("catalog changed accepted contract", err)
	}
	reorder, err := f.store.Reorder(ctx, f.buyer, detail.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if reorder.Offer.ID != d.CurrentRelease || len(reorder.Issues) == 0 || reorder.Answers["note"] != nil || reorder.Answers["mode"] != nil {
		t.Fatal("unsafe or stale reorder", reorder)
	}
	if _, err = f.store.Reorder(ctx, f.other, detail.Order.ID); !ent.IsNotFound(err) {
		t.Fatal("other buyer reordered", err)
	}
	if _, err = f.catalog.Mutate(ctx, f.admin, d.ID, "archive", catalog.Change{Revision: d.Revision}); err != nil {
		t.Fatal(err)
	}
	list, err = f.store.Favorites(ctx, f.buyer, "")
	if err != nil || len(list.Favorites) != 1 || list.Favorites[0].Available {
		t.Fatal("archived favorite available", err)
	}
	if err = f.store.RemoveFavorite(ctx, f.buyer, saved.ID); err != nil {
		t.Fatal(err)
	}
}
func TestOrderQuoteExpiryAndAuthority(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	detail := f.create(t, "custom")
	if _, err := f.store.IssueQuote(ctx, f.buyer, detail.Order.ID, f.quote(detail)); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer quoted", err)
	}
	quoted, err := f.store.IssueQuote(ctx, f.admin, detail.Order.ID, f.quote(detail))
	if err != nil {
		t.Fatal(err)
	}
	action := orders.Action{Version: quoted.Order.Version, QuoteID: quoted.Quote.ID, AcceptTerms: true, TermsVersion: "obsolete"}
	if _, err = f.store.Transition(ctx, f.buyer, detail.Order.ID, "accept", false, action); err == nil {
		t.Fatal("old terms accepted")
	}
	action.TermsVersion = f.auth.cfg.TermsVersion
	f.auth.clock.Add(48 * 3600)
	if _, err = f.store.Transition(ctx, f.buyer, detail.Order.ID, "accept", false, action); err == nil {
		t.Fatal("expired quote accepted")
	}
	f.auth.clock.Add(-48*3600 + 601)
	if _, err = f.store.IssueQuote(ctx, f.admin, detail.Order.ID, f.quote(quoted)); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("old staff factors quoted", err)
	}
	if _, err = f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.Transition(ctx, f.buyer, detail.Order.ID, "decline", false, action); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("stale customer authority mutated order", err)
	}
}
func TestOrderContractRollsBackWithTimeline(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	policy := couponPolicy()
	coupon, err := f.catalog.SaveCoupon(ctx, f.admin, "", 0, policy)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "DROP TABLE order_events"); err != nil {
		t.Fatal(err)
	}
	input := f.input("package")
	input.CouponCode = policy.Code
	input.ExpectedAmount = "617"
	input.ExpectedCouponVersion = coupon.Version
	if _, err = f.store.Create(ctx, f.buyer, input); err == nil {
		t.Fatal("order without timeline committed")
	}
	count, err := f.auth.client.Order.Query().Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("partial order", count, err)
	}
	count, err = f.auth.client.OrderContract.Query().Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("partial contract", count, err)
	}
	count, err = f.auth.client.CouponClaim.Query().Count(ctx)
	if err != nil || count != 0 {
		t.Fatal("partial coupon reservation", count, err)
	}
}
func TestQuoteAcceptanceRechecksCouponAndSerializes(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	policy := couponPolicy()
	policy.GlobalLimit = 1
	policy.CustomerLimit = 0
	coupon, err := f.catalog.SaveCoupon(ctx, f.admin, "", 0, policy)
	if err != nil {
		t.Fatal(err)
	}
	input := f.input("custom")
	input.CouponCode = policy.Code
	first, err := f.store.Create(ctx, f.buyer, input)
	if err != nil {
		t.Fatal(err)
	}
	input.RequestKey = uuid.NewString()
	second, err := f.store.Create(ctx, f.buyer, input)
	if err != nil {
		t.Fatal(err)
	}
	first, err = f.store.IssueQuote(ctx, f.admin, first.Order.ID, f.quote(first))
	if err != nil {
		t.Fatal(err)
	}
	second, err = f.store.IssueQuote(ctx, f.admin, second.Order.ID, f.quote(second))
	if err != nil {
		t.Fatal(err)
	}
	policy.Value = "25"
	_, err = f.catalog.SaveCoupon(ctx, f.admin, coupon.ID, coupon.Version, policy)
	if err != nil {
		t.Fatal(err)
	}
	accept := func(d orders.Detail) error {
		_, e := f.store.Transition(ctx, f.buyer, d.Order.ID, "accept", false, orders.Action{Version: d.Order.Version, QuoteID: d.Quote.ID, AcceptTerms: true, TermsVersion: f.auth.cfg.TermsVersion})
		return e
	}
	if err = accept(first); err == nil {
		t.Fatal("changed discount accepted")
	}
	first, err = f.store.IssueQuote(ctx, f.admin, first.Order.ID, f.quote(first))
	if err != nil {
		t.Fatal(err)
	}
	second, err = f.store.IssueQuote(ctx, f.admin, second.Order.ID, f.quote(second))
	if err != nil {
		t.Fatal(err)
	}
	var wins atomic.Int64
	var wg sync.WaitGroup
	for _, d := range []orders.Detail{first, second} {
		wg.Go(func() {
			e := accept(d)
			if e == nil {
				wins.Add(1)
			} else {
				var invalid *catalog.Invalid
				if !errors.As(e, &invalid) {
					t.Error(e)
				}
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("coupon accepted beyond its limit", wins.Load())
	}
}

func TestOrderHTTPBoundariesAndContract(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	token, buyer := f.auth.login(t, "httporders@example.test")
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	f.store.Register(mux)
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
	raw, err := json.Marshal(f.input("custom"))
	if err != nil {
		t.Fatal(err)
	}
	body := string(raw)
	if res := call("/api/v1/orders", body, "https://evil.test"); res.Code != http.StatusForbidden {
		t.Fatal("CSRF bypass", res.Code)
	}
	for _, bad := range []string{strings.Replace(body, `"kind":"custom"`, `"kind":"custom","paid":true`, 1), body + body, strings.Repeat("x", 262145)} {
		if res := call("/api/v1/orders", bad, "http://localhost"); res.Code != http.StatusUnprocessableEntity {
			t.Fatal("malformed order accepted", res.Code)
		}
	}
	result := call("/api/v1/orders", body, "http://localhost")
	if result.Code != http.StatusOK {
		t.Fatal("valid order failed", result.Code, result.Body.String())
	}
	var detail orders.Detail
	if err = json.Unmarshal(result.Body.Bytes(), &detail); err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.Get(ctx, buyer, detail.Order.ID, false); err != nil {
		t.Fatal(err)
	}
	if res := call("/api/v1/admin/orders/"+detail.Order.ID+"/quote", `{}`, "http://localhost"); res.Code != http.StatusForbidden {
		t.Fatal("customer quote authority", res.Code)
	}
	var document any
	if err = json.Unmarshal(api.Contract, &document); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err = compiler.AddResource("contract.json", document); err != nil {
		t.Fatal(err)
	}
	for name, value := range map[string]any{"OrderDetail": detail, "OrderCreate": f.input("custom"), "OrderListing": orders.Listing{Orders: []orders.Summary{detail.Order}}, "OrderQuoteInput": f.quote(detail), "Favorites": orders.FavoriteListing{Favorites: []orders.FavoriteView{}}} {
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

func TestOrderAcceptanceAgainstConcurrentQuote(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	detail := f.create(t, "custom")
	detail, err := f.store.IssueQuote(ctx, f.admin, detail.Order.ID, f.quote(detail))
	if err != nil {
		t.Fatal(err)
	}
	var wins atomic.Int64
	var wg sync.WaitGroup
	wg.Go(func() {
		_, e := f.store.IssueQuote(ctx, f.admin, detail.Order.ID, f.quote(detail))
		if e == nil {
			wins.Add(1)
		} else if !errors.Is(e, orders.ErrConflict) {
			t.Error(e)
		}
	})
	wg.Go(func() {
		_, e := f.store.Transition(ctx, f.buyer, detail.Order.ID, "accept", false, orders.Action{Version: detail.Order.Version, QuoteID: detail.Quote.ID, AcceptTerms: true, TermsVersion: f.auth.cfg.TermsVersion})
		if e == nil {
			wins.Add(1)
		} else if !errors.Is(e, orders.ErrConflict) {
			t.Error(e)
		}
	})
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("accept and supersede both won", wins.Load())
	}
	current, err := f.store.Get(ctx, f.buyer, detail.Order.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	if current.Contract != nil && current.Contract.Data.QuoteID != detail.Quote.ID {
		t.Fatal("acceptance silently switched quote")
	}
}

func TestOrderDeclineAndRejection(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	detail := f.create(t, "custom")
	detail, err := f.store.IssueQuote(ctx, f.admin, detail.Order.ID, f.quote(detail))
	if err != nil {
		t.Fatal(err)
	}
	detail, err = f.store.Transition(ctx, f.buyer, detail.Order.ID, "decline", false, orders.Action{Version: detail.Order.Version, QuoteID: detail.Quote.ID})
	if err != nil || detail.Order.State != "submitted" || detail.Quote != nil || detail.Contract != nil {
		t.Fatal("declined quote created contract", err)
	}
	history, err := f.store.Quotes(ctx, f.buyer, detail.Order.ID, false, 0)
	if err != nil || len(history) != 1 || history[0].State != "declined" {
		t.Fatal(history, err)
	}
	detail, err = f.store.Transition(ctx, f.admin, detail.Order.ID, "reject", true, orders.Action{Version: detail.Order.Version, Message: "Requested scope cannot be fulfilled."})
	if err != nil || detail.Order.State != "rejected" {
		t.Fatal(detail, err)
	}
	if _, err = f.store.Revise(ctx, f.buyer, detail.Order.ID, orders.Revision{Version: detail.Order.Version, Answers: f.input("custom").Answers}); !errors.Is(err, orders.ErrConflict) {
		t.Fatal("rejected order resurrected", err)
	}
}
func TestOrderStageCouponValidation(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	p := catalogAdmin(t, f)
	store := catalog.New(f.client, f.service)
	d := couponGame(t, store, p)
	c := d.Configuration
	c.Services[0].Fields = append(c.Services[0].Fields, catalog.Field{Key: "note", Label: "Note", Type: "short_text", Stage: "order", Required: true, MaxLength: 100})
	d, err := store.Mutate(ctx, p, d.ID, "save", catalog.Change{Revision: d.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	d, err = store.Mutate(ctx, p, d.ID, "publish", catalog.Change{Revision: d.Revision})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.SaveCoupon(ctx, p, "", 0, couponPolicy()); err != nil {
		t.Fatal(err)
	}
	input := catalog.CouponCheck{ReleaseID: d.CurrentRelease, Service: "boost", Stage: "order", Code: "SAVE50", Answers: catalog.Answers{"mode": json.RawMessage(`"solo"`), "note": json.RawMessage(`"Ordinary instruction"`)}}
	result, err := store.CheckCoupon(ctx, nil, d.Slug, input)
	if err != nil || result.AmountMinor != "50" || result.Answers["note"] == nil {
		t.Fatal("order fields broke price calculation", result, err)
	}
	delete(input.Answers, "note")
	result, err = store.CheckCoupon(ctx, nil, d.Slug, input)
	if err != nil || result.Outcome != "invalid" || result.AmountMinor != "" {
		t.Fatal("required order field ignored", result, err)
	}
	input.Answers["unknown"] = json.RawMessage(`true`)
	result, err = store.CheckCoupon(ctx, nil, d.Slug, input)
	if err != nil || len(result.Issues) != 2 {
		t.Fatal("unknown fields discarded before validation", result, err)
	}
	input.Stage = "fulfillment"
	if _, err = store.CheckCoupon(ctx, nil, d.Slug, input); err == nil {
		t.Fatal("fulfillment stage allowed")
	}
}
