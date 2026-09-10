package nowpayments

import (
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"testing"
)

func paymentFixture() map[string]any {
	return map[string]any{"payment_id": "123", "invoice_id": "456", "order_id": "8d7133f6-bef6-40bd-a707-aa6f7864545c", "payment_status": "finished", "price_amount": json.Number("123.45"), "price_currency": "usd", "pay_amount": json.Number("0.123456789012345678"), "actually_paid": json.Number("0.123456789012345677"), "pay_currency": "eth", "outcome_amount": json.Number("121.321001"), "outcome_currency": "usdttrc20", "network": "eth", "payin_hash": "synthetic-deposit", "payout_hash": "synthetic-settlement"}
}
func TestPaymentPreservesExactDecimalsAndSeparateCurrencies(t *testing.T) {
	c := testClient(t)
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/payment/123" || r.Method != http.MethodGet || r.Header.Get("X-Api-Key") != c.apiKey {
			t.Error("wrong reconciliation request")
		}
		respond(t, w, paymentFixture())
	})
	p, err := c.GetPayment(t.Context(), "123")
	if err != nil {
		t.Fatal(err)
	}
	paid, err := p.ActuallyPaid.Rational()
	if err != nil {
		t.Fatal(err)
	}
	due, err := p.PayAmount.Rational()
	if err != nil {
		t.Fatal(err)
	}
	if paid.Cmp(due) >= 0 || p.PriceCurrency == p.OutcomeCurrency || p.OutcomeAmount == nil || string(p.PriceAmount) != "123.45" {
		t.Fatal("money rounded or units conflated")
	}
	// Even a provider-finished observation can be underpaid; the adapter makes no settlement decision.
	if p.Status != "finished" || new(big.Rat).Sub(due, paid).RatString() != "1/1000000000000000000" {
		t.Fatal("precision lost")
	}
}
func TestPaymentRejectsWrongIdentityAndInvalidEvidence(t *testing.T) {
	for _, change := range []func(map[string]any){func(v map[string]any) { v["payment_id"] = "999" }, func(v map[string]any) { v["payment_status"] = "unexpected" }, func(v map[string]any) { v["invoice_id"] = nil }, func(v map[string]any) { v["actually_paid"] = "NaN" }, func(v map[string]any) { v["pay_amount"] = "-1" }, func(v map[string]any) { v["price_currency"] = "btc" }, func(v map[string]any) { v["outcome_amount"] = "1e999999" }, func(v map[string]any) { v["payin_hash"] = "private\ntext" }} {
		c := testClient(t)
		fixture := paymentFixture()
		change(fixture)
		attach(t, c, func(w http.ResponseWriter, _ *http.Request) { respond(t, w, fixture) })
		if _, err := c.GetPayment(t.Context(), "123"); !errors.Is(err, ErrEvidence) {
			t.Fatal("bad evidence", err)
		}
	}
	c := testClient(t)
	if _, err := c.GetPayment(t.Context(), "../auth"); !errors.Is(err, ErrInvalid) {
		t.Fatal("path injection")
	}
	for _, text := range []Decimal{"1/2", "-1", "NaN", "Infinity", " 1", "01", "1e100", "1e-100"} {
		if _, err := text.Rational(); err == nil {
			t.Fatal("bad decimal", text)
		}
	}
	for _, text := range []Decimal{"0", "1e-8", "12345678901234567890.12345678901234567890"} {
		if _, err := text.Rational(); err != nil {
			t.Fatal(err)
		}
	}
}
