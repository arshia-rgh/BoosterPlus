//go:build integration

package integration

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/paymentroutes"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

func TestPaymentOptionsOwnershipCacheAndNoWrites(t *testing.T) {
	f := paymentDB(t)
	detail := f.base.create(t, "package")
	if _, err := f.store.PaymentOptions(t.Context(), f.base.other, detail.Order.ID); !ent.IsNotFound(err) {
		t.Fatal("unowned options", err)
	}
	if f.provider.minimumCalls != 0 {
		t.Fatal("unauthorized provider read")
	}
	for range 2 {
		options, err := f.store.PaymentOptions(t.Context(), f.base.buyer, detail.Order.ID)
		if err != nil || options.ContractID != detail.Contract.ID || options.PolicyID != f.policy.ID || options.AmountMinor != detail.Contract.Data.AmountMinor || options.Currency != detail.Contract.Data.Currency || len(options.Routes) != 1 || options.Routes[0].Status != "available" {
			t.Fatal("options not bound to immutable contract", options, err)
		}
	}
	if f.provider.minimumCalls != 1 || f.provider.calls != 0 {
		t.Fatal("options not read-only/cached")
	}
	count, err := f.base.auth.client.PaymentAttempt.Query().Count(t.Context())
	if err != nil || count != 0 {
		t.Fatal("options created attempt", err)
	}
	contract, err := f.base.auth.client.OrderContract.Get(t.Context(), detail.Contract.ID)
	if err != nil || contract.PaymentState != ordercontract.PaymentStateUnissued {
		t.Fatal("options reserved contract", err)
	}
	// A fresh final check remains mandatory even after successful selector caching.
	f.provider.preflightError = nowpayments.ErrBelowMinimum
	_, err = f.store.Start(t.Context(), f.base.buyer, detail.Order.ID, payments.StartInput{ContractID: detail.Contract.ID, PolicyID: f.policy.ID, Route: "usdttrc20", AcceptPolicy: true})
	if !errors.Is(err, nowpayments.ErrBelowMinimum) {
		t.Fatal("cached eligibility authorized payment", err)
	}
	f.provider.preflightError = nil
	f.provider.minimumFiat = "99999999"
	options, err := f.store.PaymentOptions(t.Context(), f.base.buyer, detail.Order.ID)
	if err != nil || options.Routes[0].Status != "below_minimum" || f.provider.minimumCalls != 2 {
		t.Fatal("rejection did not refresh old cache", err)
	}
}

func TestPaymentOptionsUnavailablePausedAndActiveAttempt(t *testing.T) {
	f := paymentDB(t)
	detail := f.base.create(t, "package")
	f.provider.preflightError = nowpayments.ErrUnavailable
	options, err := f.store.PaymentOptions(t.Context(), f.base.buyer, detail.Order.ID)
	if err != nil || len(options.Routes) != 1 || options.Routes[0].Status != "unavailable" || options.Routes[0].ValidUntil != nil {
		t.Fatal("outage opened selection", err)
	}
	paused := payments.New(f.base.auth.client, f.base.auth.service, f.provider, "fixture", false, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	if _, err = paused.PaymentOptions(t.Context(), f.base.buyer, detail.Order.ID); !errors.Is(err, payments.ErrUnavailable) {
		t.Fatal("paused options", err)
	}
	f.provider.preflightError = nil
	_, err = f.store.Start(t.Context(), f.base.buyer, detail.Order.ID, payments.StartInput{ContractID: detail.Contract.ID, PolicyID: f.policy.ID, Route: "usdttrc20", AcceptPolicy: true})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.store.PaymentOptions(t.Context(), f.base.buyer, detail.Order.ID); !errors.Is(err, payments.ErrConflict) {
		t.Fatal("active attempt allowed new selection", err)
	}
}

type currencyPaymentProvider struct {
	*paymentProvider
	routes map[string]string
	err    error
	until  time.Time
}

func (p *currencyPaymentProvider) PaymentCurrencies(context.Context, bool) (nowpayments.CurrencyAvailability, error) {
	return nowpayments.CurrencyAvailability{Routes: p.routes, ValidUntil: p.until}, p.err
}
func TestThirtyPaymentRoutesAvailabilityAndAuthoritativePolicy(t *testing.T) {
	f := paymentDB(t)
	settings, err := f.store.Settings(t.Context(), f.base.admin)
	if err != nil {
		t.Fatal(err)
	}
	settings.Draft.Routes = nil
	routes := map[string]string{}
	for _, r := range paymentroutes.List() {
		settings.Draft.Routes = append(settings.Draft.Routes, payments.Route{Code: r.Code, Network: r.Network, Label: r.Label})
		routes[r.Code] = r.Network
	}
	saved, err := f.store.SavePolicy(t.Context(), f.base.admin, payments.PolicyInput{Version: settings.Version, Action: "publish", Data: settings.Draft})
	if err != nil {
		t.Fatal("30 route policy", err)
	}
	detail := f.base.create(t, "package")
	now := func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) }
	provider := &currencyPaymentProvider{paymentProvider: f.provider, routes: routes, until: now().Add(5 * time.Minute)}
	delete(provider.routes, "usdtop")
	provider.routes["usdc"] = "bsc" // Same ticker on another network is never substituted.
	store := payments.New(f.base.auth.client, f.base.auth.service, provider, "fixture", true, now)
	options, err := store.PaymentOptions(t.Context(), f.base.buyer, detail.Order.ID)
	if err != nil || len(options.Routes) != 30 {
		t.Fatal(options, err)
	}
	for _, route := range options.Routes {
		blocked := route.Code == "usdtop" || route.Code == "usdc"
		if blocked && route.Status != "unavailable" || !blocked && route.Status != "available" {
			t.Fatal("incorrect route eligibility", route)
		}
		if route.ValidUntil != nil && route.ValidUntil.After(provider.until) {
			t.Fatal("outdated availability could authorize selection")
		}
	}
	_, err = store.Start(t.Context(), f.base.buyer, detail.Order.ID, payments.StartInput{ContractID: detail.Contract.ID, PolicyID: saved.Published.ID, Route: "usdtop", AcceptPolicy: true})
	if !errors.Is(err, payments.ErrUnavailable) || f.provider.calls != 0 {
		t.Fatal("unavailable route created invoice", err)
	}
	provider.err = nowpayments.ErrUnavailable
	options, err = store.PaymentOptions(t.Context(), f.base.buyer, detail.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	for _, route := range options.Routes {
		if route.Status != "unavailable" {
			t.Fatal("stale minima bypassed availability failure")
		}
	}
	count, err := f.base.auth.client.PaymentAttempt.Query().Count(t.Context())
	if err != nil || count != 0 {
		t.Fatal("availability check wrote an attempt", err)
	}
	settings = saved
	settings.Draft.Routes[0].Network = "wrong"
	if _, err = f.store.SavePolicy(t.Context(), f.base.admin, payments.PolicyInput{Version: settings.Version, Action: "save", Data: settings.Draft}); !errors.Is(err, payments.ErrInvalid) {
		t.Fatal("mismatched mapping saved", err)
	}
}

func TestPaymentReceiptPreservesHistoricalNetworkCasing(t *testing.T) {
	f := paymentDB(t)
	detail := f.base.create(t, "package")
	a := f.start(t, detail)
	f.issue(t, a)
	p := f.evidence(t, a, "176", "confirming", "12.34000001")
	f.reconcile(t, p)
	receipt, err := f.base.auth.client.PaymentReceipt.Query().Only(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	// Reproduce a receipt saved before provider network casing was normalized.
	if _, err = f.base.auth.client.ExecContext(t.Context(), "UPDATE payment_receipts SET network=? WHERE id=?", "TRX", receipt.ID); err != nil {
		t.Fatal(err)
	}
	p.Status = "finished"
	record := f.reconcile(t, p)
	if record.State != "settled" || record.Issue != "" {
		t.Fatal("historical network casing blocked settlement", record.State, record.Issue)
	}
	receipt, err = f.base.auth.client.PaymentReceipt.Get(t.Context(), receipt.ID)
	if err != nil || receipt.Network != "TRX" {
		t.Fatal("historical receipt rewritten", err)
	}
}
