//go:build integration

package integration

import (
	"encoding/json"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

func TestHostedCheckoutRecoversLostInvoiceResponse(t *testing.T) {
	f := paymentDB(t)
	d := f.base.create(t, "package")
	a := f.start(t, d)
	f.provider.ambiguous = true
	f.issue(t, a)
	p := f.evidence(t, a, "100", "waiting", "0")
	f.reconcile(t, p)
	history, err := f.store.History(t.Context(), f.base.buyer, d.Order.ID, false)
	if err != nil || len(history.Attempts) != 1 || history.Attempts[0].CheckoutURL != "https://nowpayments.io/payment/?iid=1" {
		t.Fatal("verified recovery did not restore hosted continuation", err)
	}
	contract, err := f.base.auth.client.OrderContract.Get(t.Context(), d.Contract.ID)
	if err != nil || contract.PaymentState != ordercontract.PaymentStateAwaitingPayment {
		t.Fatal("recovered invoice did not update the agreement", err)
	}
	f.issue(t, a)
	if f.provider.calls != 1 {
		t.Fatal("recovery repeated the provider write")
	}
	f.base.auth.clock.Add(1801)
	f.reconcile(t, p)
	history, err = f.store.History(t.Context(), f.base.buyer, d.Order.ID, false)
	if err != nil || history.Attempts[0].CheckoutURL != "" || history.Attempts[0].State != "closed" {
		t.Fatal("late waiting evidence reopened an expired checkout", err)
	}
}

func TestHostedInvoiceResponseRacePreservesFinancialEvidence(t *testing.T) {
	for _, scenario := range []string{"waiting", "settled", "wrong route", "expired", "native"} {
		t.Run(scenario, func(t *testing.T) {
			f := paymentDB(t)
			if scenario == "native" {
				f.provider.legacyNative = true
			}
			d := f.base.create(t, "package")
			a := f.start(t, d)
			block, entered := make(chan struct{}), make(chan struct{})
			f.provider.invoiceBlock, f.provider.invoiceEntered = block, entered
			raw, err := json.Marshal(map[string]string{"attempt_id": a.ID})
			if err != nil {
				t.Fatal(err)
			}
			result := make(chan error, 1)
			go func() { result <- f.store.InvoiceHandler()(t.Context(), jobs.Job{Payload: raw}) }()
			<-entered
			// Always release the held provider response, even on an assertion failure.
			released := false
			defer func() {
				if !released {
					close(block)
					<-result
				}
			}()
			p := f.evidence(t, a, "100", "waiting", "0")
			switch scenario {
			case "settled":
				p.Status, p.ActuallyPaid = "finished", p.PayAmount
			case "wrong route":
				p.Network = "wrong"
			case "expired":
				f.base.auth.clock.Add(1801)
			}
			f.reconcile(t, p)
			close(block)
			released = true
			if err = <-result; err != nil {
				t.Fatal(err)
			}
			history, err := f.store.History(t.Context(), f.base.buyer, d.Order.ID, false)
			if err != nil || len(history.Attempts) != 1 {
				t.Fatal("missing raced attempt", err)
			}
			latest := history.Attempts[0]
			if scenario == "waiting" && latest.CheckoutURL != "https://nowpayments.io/payment/?iid=1" {
				t.Fatal("early observation lost hosted link")
			}
			if scenario != "waiting" && latest.CheckoutURL != "" {
				t.Fatal("unsafe invoice response exposed a hosted pay link")
			}
			if scenario == "settled" && latest.State != "settled" {
				t.Fatal("late invoice response erased verified settlement")
			}
			if f.provider.calls != 1 {
				t.Fatal("response race repeated provider write")
			}
		})
	}
}
