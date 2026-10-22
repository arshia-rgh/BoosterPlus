package nowpayments

import (
	"errors"
	"net/http"
	"testing"
)

func TestInvoiceMinimumReadUsesMerchantRouteAndExactPolicy(t *testing.T) {
	c := testClient(t)
	calls := 0
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		calls++
		query := r.URL.Query()
		if r.Method != http.MethodGet || r.URL.Path != "/v1/min-amount" || query.Get("currency_from") != "usdttrc20" || query.Get("fiat_equivalent") != "usd" || query.Get("is_fixed_rate") != "true" || query.Get("is_fee_paid_by_user") != "false" || query.Has("currency_to") {
			t.Error("minimum changed route, policy or method")
		}
		respond(t, w, map[string]any{"currency_from": "usdttrc20", "min_amount": "8.83353975", "fiat_equivalent": "8.84547653"})
	})
	input := sampleRequest()
	for _, tc := range []struct {
		amount string
		below  bool
	}{{"100", true}, {"884", true}, {"885", false}, {"1000", false}} {
		input.AmountMinor = tc.amount
		err := c.CheckInvoice(t.Context(), input)
		if tc.below && !errors.Is(err, ErrBelowMinimum) || !tc.below && err != nil {
			t.Fatalf("amount %s: %v", tc.amount, err)
		}
	}
	if calls != 4 {
		t.Fatal("unexpected provider calls")
	}
}

func TestInvoiceMinimumFailClosedAndNeverPosts(t *testing.T) {
	for _, value := range []map[string]any{
		{}, {"currency_from": "btc", "min_amount": "1", "fiat_equivalent": "1"},
		{"currency_from": "usdttrc20", "min_amount": "0", "fiat_equivalent": "1"},
		{"currency_from": "usdttrc20", "min_amount": "1", "fiat_equivalent": "0"},
		{"currency_from": "usdttrc20", "min_amount": "1", "fiat_equivalent": "NaN"},
		{"currency_from": "usdttrc20", "min_amount": "1", "fiat_equivalent": nil},
	} {
		c := testClient(t)
		attach(t, c, func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodGet {
				t.Error("preflight wrote provider")
			}
			respond(t, w, value)
		})
		if err := c.CheckInvoice(t.Context(), sampleRequest()); !errors.Is(err, ErrEvidence) {
			t.Fatalf("bad evidence accepted: %v", err)
		}
	}
	c := testClient(t)
	attach(t, c, func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusServiceUnavailable) })
	if err := c.CheckInvoice(t.Context(), sampleRequest()); !errors.Is(err, ErrUnavailable) {
		t.Fatal(err)
	}
	for _, change := range []func(*InvoiceRequest){func(v *InvoiceRequest) { v.AmountMinor = "0" }, func(v *InvoiceRequest) { v.Currency = "BTC" }, func(v *InvoiceRequest) { v.PayCurrency = "btc&bad=true" }} {
		input := sampleRequest()
		change(&input)
		if err := c.CheckInvoice(t.Context(), input); !errors.Is(err, ErrInvalid) {
			t.Fatal(err)
		}
	}
}

func TestMinimumComparisonPreservesExactBoundary(t *testing.T) {
	for _, tc := range []struct {
		minimum Decimal
		amount  string
		below   bool
	}{{"1", "100", false}, {"1.00000000000000000001", "100", true}, {"0.99999999999999999999", "100", false}} {
		err := (Minimum{Fiat: tc.minimum, Crypto: "1"}).Check(tc.amount)
		if tc.below != errors.Is(err, ErrBelowMinimum) || (!tc.below && err != nil) {
			t.Fatal("rounded minimum boundary", err)
		}
	}
	for _, value := range []Minimum{{}, {Fiat: "1", Crypto: "0"}, {Fiat: "NaN", Crypto: "1"}} {
		if value.Check("100") == nil {
			t.Fatal("invalid minimum accepted")
		}
	}
}
