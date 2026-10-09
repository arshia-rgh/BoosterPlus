//go:build integration

package integration

import (
	"errors"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

func TestCheckoutMinimumAndUnavailableNeverCreateAttempt(t *testing.T) {
	f := paymentDB(t)
	detail := f.base.create(t, "package")
	input := payments.StartInput{ContractID: detail.Contract.ID, PolicyID: f.policy.ID, Route: "usdttrc20", AcceptPolicy: true}
	for _, tc := range []struct{ provider, expected error }{{nowpayments.ErrBelowMinimum, nowpayments.ErrBelowMinimum}, {nowpayments.ErrUnavailable, payments.ErrUnavailable}, {nowpayments.ErrEvidence, payments.ErrUnavailable}} {
		f.provider.preflightError = tc.provider
		if _, err := f.store.Start(t.Context(), f.base.buyer, detail.Order.ID, input); !errors.Is(err, tc.expected) {
			t.Fatal("preflight result", err)
		}
		count, err := f.base.auth.client.PaymentAttempt.Query().Count(t.Context())
		if err != nil || count != 0 || f.provider.calls != 0 {
			t.Fatal("failed preflight created invoice or attempt", err)
		}
		contract, err := f.base.auth.client.OrderContract.Get(t.Context(), detail.Contract.ID)
		if err != nil || contract.PaymentState != ordercontract.PaymentStateUnissued {
			t.Fatal("failed preflight locked agreement", err)
		}
	}
	f.provider.preflightError = nil
	attempt, err := f.store.Start(t.Context(), f.base.buyer, detail.Order.ID, input)
	if err != nil || attempt.NativeCheckout {
		t.Fatal("new checkout was not hosted", err)
	}
	f.provider.preflightError = nowpayments.ErrUnavailable
	repeat, err := f.store.Start(t.Context(), f.base.buyer, detail.Order.ID, input)
	if err != nil || repeat.ID != attempt.ID {
		t.Fatal("provider outage blocked existing attempt reuse", err)
	}
	f.issue(t, attempt)
	history, err := f.store.History(t.Context(), f.base.buyer, detail.Order.ID, false)
	if err != nil || history.Attempts[0].CheckoutURL != "https://nowpayments.io/payment/?iid=1" || history.Attempts[0].NativeCheckout || len(history.Receipts) != 0 {
		t.Fatal("hosted continuation or settlement boundary", err)
	}
}
