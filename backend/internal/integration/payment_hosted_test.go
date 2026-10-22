//go:build integration

package integration

import (
	"bytes"
	"encoding/json"
	"errors"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

func TestHostedCheckoutUSDNoPreflightAndOneInvoice(t *testing.T) {
	f := paymentDB(t)
	detail := f.base.create(t, "package")
	settings, e := f.store.Settings(t.Context(), f.base.admin)
	if e != nil {
		t.Fatal(e)
	}
	data := settings.Draft
	data.Routes = nil
	saved, e := f.store.SavePolicy(t.Context(), f.base.admin, payments.PolicyInput{Version: settings.Version, Action: "publish", Data: data})
	if e != nil {
		t.Fatal(e)
	}
	f.policy = *saved.Published
	input := payments.StartInput{ContractID: detail.Contract.ID, PolicyID: f.policy.ID, AcceptPolicy: true}
	if _, err := f.store.Start(t.Context(), f.base.other, detail.Order.ID, input); !ent.IsNotFound(err) {
		t.Fatal("ownership", err)
	}
	a, err := f.store.Start(t.Context(), f.base.buyer, detail.Order.ID, input)
	if err != nil || a.Route.Selection != "provider" || a.Route.Code != "" || a.Route.Network != "" {
		t.Fatal("new USD hosted marker", a.Route, err)
	}
	if f.provider.calls != 0 {
		t.Fatal("Start made remote purchase")
	}
	repeat, err := f.store.Start(t.Context(), f.base.buyer, detail.Order.ID, input)
	if err != nil || repeat.ID != a.ID {
		t.Fatal("reuse", err)
	}
	f.issue(t, a)
	f.issue(t, a)
	if len(f.provider.requests) != 1 || f.provider.requests[0].PayCurrency != "" || f.provider.requests[0].Currency != "USD" || f.provider.requests[0].AmountMinor != "1234" {
		t.Fatal("pinned or repeated invoice", f.provider.requests)
	}
	history, err := f.store.History(t.Context(), f.base.buyer, detail.Order.ID, false)
	if err != nil || history.Attempts[0].CheckoutURL == "" || len(history.Receipts) != 0 {
		t.Fatal("redirect treated as receipt", err)
	}
	raw, err := json.Marshal(history)
	if err != nil || bytes.Count(raw, []byte(`"routes":[]`)) != 2 || bytes.Contains(raw, []byte(`"routes":null`)) {
		t.Fatal("empty payout policy broke checkout JSON", string(raw), err)
	}

}

func TestHostedInvoiceCoinChangesCannotRetireOrAllocateTwice(t *testing.T) {
	f := paymentDB(t)
	detail := f.base.create(t, "package")
	a, err := f.store.Start(t.Context(), f.base.buyer, detail.Order.ID, payments.StartInput{ContractID: detail.Contract.ID, PolicyID: f.policy.ID, AcceptPolicy: true})
	if err != nil {
		t.Fatal(err)
	}
	f.issue(t, a)
	abandoned := f.evidence(t, a, "701", "expired", "0")
	if row := f.reconcile(t, abandoned); row.State != "awaiting_payment" {
		t.Fatal("abandoned choice retired invoice", row.State, row.Issue)
	}
	paid := f.evidence(t, a, "702", "partially_paid", "1")
	paid.PayCurrency = "btc"
	paid.Network = "btc"
	if row := f.reconcile(t, paid); row.Issue != "underpaid" {
		t.Fatal("partial funds", row.Issue)
	}
	f.reconcile(t, abandoned)
	attempt, err := f.base.auth.client.PaymentAttempt.Get(t.Context(), a.ID)
	if err != nil || attempt.State != "exception" || attempt.Issue != "underpaid" || attempt.ActiveContractID == nil {
		t.Fatal("abandoned choice erased funds review", err)
	}
	paid.Status = "finished"
	paid.ActuallyPaid = paid.PayAmount
	if row := f.reconcile(t, paid); row.State != "settled" {
		t.Fatal("changed coin not settled", row.State, row.Issue)
	}
	second := paid
	second.ID = "703"
	second.PayCurrency = "eth"
	second.Network = "eth"
	if row := f.reconcile(t, second); row.Issue != "duplicate_payment" {
		t.Fatal("duplicate not held", row.Issue)
	}
	count, err := f.base.auth.client.PaymentAllocation.Query().Count(t.Context())
	if err != nil || count != 1 {
		t.Fatal("allocated twice", count, err)
	}
	second.Status = "refunded"
	second.ActuallyPaid = "0"
	if row := f.reconcile(t, second); row.State != "settled" || row.Issue != "" {
		t.Fatal("duplicate refund affected paid order", row.State, row.Issue)
	}
	altered := paid
	altered.Status = "refunded"
	altered.PayCurrency = "ltc"
	altered.Network = "ltc"
	if row := f.reconcile(t, altered); row.Issue != "evidence_conflict" {
		t.Fatal("reversal changed immutable route", row.Issue)
	}
	history, err := f.store.History(t.Context(), f.base.buyer, detail.Order.ID, false)
	if err != nil || len(history.Receipts) != 2 {
		t.Fatal("missing exact receipts", err)
	}
	for _, r := range history.Receipts {
		if r.Network != r.Currency || (r.Currency != "btc" && r.Currency != "eth") {
			t.Fatal("lost receipt route", r)
		}
	}
}

func TestHostedMismatchCannotBindInvoiceOrCreateReceipt(t *testing.T) {
	f := paymentDB(t)
	detail := f.base.create(t, "package")
	a, err := f.store.Start(t.Context(), f.base.buyer, detail.Order.ID, payments.StartInput{ContractID: detail.Contract.ID, PolicyID: f.policy.ID, AcceptPolicy: true})
	if err != nil {
		t.Fatal(err)
	}
	p := f.evidence(t, a, "711", "finished", "12.34000001")
	p.PriceAmount = "0.01"
	if row := f.reconcile(t, p); row.Issue != "price_mismatch" {
		t.Fatal("wrong price", row.Issue)
	}
	row, err := f.base.auth.client.PaymentAttempt.Get(t.Context(), a.ID)
	if err != nil || row.InvoiceID != nil || row.FundsDetectedAt != nil {
		t.Fatal("unmatched evidence bound attempt", err)
	}
	if n, e := f.base.auth.client.PaymentReceipt.Query().Count(t.Context()); e != nil || n != 0 {
		t.Fatal("unmatched receipt", e)
	}
	p.PriceAmount = "12.34"
	p.Network = ""
	id := f.record(t, p)
	if err = f.store.Reconcile(t.Context(), id); !errors.Is(err, nowpayments.ErrEvidence) {
		t.Fatal("unknown network guessed", err)
	}
	if n, e := f.base.auth.client.PaymentReceipt.Query().Count(t.Context()); e != nil || n != 0 {
		t.Fatal("empty network receipt", e)
	}
	attempt, err := f.base.auth.client.PaymentAttempt.Get(t.Context(), a.ID)
	if err != nil || attempt.FundsDetectedAt == nil || attempt.State != "exception" || attempt.Issue != "network_review" || attempt.CheckoutURL != "" {
		t.Fatal("missing metadata did not hold reported funds", err)
	}
	record, err := f.base.auth.client.PaymentRecord.Get(t.Context(), id)
	if err != nil || record.AttemptID != a.ID || len(record.Data) == 0 {
		t.Fatal("lost raw evidence", err)
	}
	f.provider.metadataNetwork = "trx"
	if result := f.reconcile(t, p); result.State != "settled" {
		t.Fatal("matched recovery", result.Issue)
	}
}

func TestHostedLateFundsStayUnallocated(t *testing.T) {
	f := paymentDB(t)
	detail := f.base.create(t, "package")
	a, err := f.store.Start(t.Context(), f.base.buyer, detail.Order.ID, payments.StartInput{ContractID: detail.Contract.ID, PolicyID: f.policy.ID, AcceptPolicy: true})
	if err != nil {
		t.Fatal(err)
	}
	f.issue(t, a)
	f.base.auth.clock.Add(3600)
	if err = f.store.Maintain(t.Context()); err != nil {
		t.Fatal(err)
	}
	p := f.evidence(t, a, "721", "finished", "12.34000001")
	if row := f.reconcile(t, p); row.Issue != "retired_contract" {
		t.Fatal("late funds allocated", row.Issue)
	}
	if n, e := f.base.auth.client.PaymentAllocation.Query().Count(t.Context()); e != nil || n != 0 {
		t.Fatal("late allocation", e)
	}
	if n, e := f.base.auth.client.PaymentReceipt.Query().Count(t.Context()); e != nil || n != 1 {
		t.Fatal("late funds lost", e)
	}
}
