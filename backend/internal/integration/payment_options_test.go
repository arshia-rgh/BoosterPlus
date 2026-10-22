//go:build integration

package integration

import (
	"errors"
	"testing"
	"time"

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
