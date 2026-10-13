package nowpayments

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
)

func testClient(t *testing.T) *Client {
	t.Helper()
	c, err := New(Config{APIKey: strings.Repeat("api-test-", 4), IPNSecret: strings.Repeat("ipn-test-", 4), PublicOrigin: "https://booster.example.test"})
	if err != nil {
		t.Fatal(err)
	}
	return c
}
func attach(t *testing.T, c *Client, handler http.HandlerFunc) {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	c.baseURL = server.URL + "/v1"
}
func sampleRequest() InvoiceRequest {
	return InvoiceRequest{OrderID: uuid.NewString(), AttemptID: uuid.NewString(), AmountMinor: "12345", Currency: "USD", PayCurrency: "usdttrc20", FixedRate: true, FeePaidByUser: false}
}
func respond(t *testing.T, w http.ResponseWriter, value any) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		t.Error(err)
	}
}
func TestInvoiceExactAmountPrivacyAndFixedDestination(t *testing.T) {
	c := testClient(t)
	input := sampleRequest()
	calls := 0
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Method != http.MethodPost || r.URL.Path != "/v1/invoice" || r.Header.Get("X-Api-Key") != c.apiKey || r.Header.Get("Content-Type") != "application/json" {
			t.Error("wrong provider request")
		}
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Error(err)
			return
		}
		doc, err := object(body)
		if err != nil {
			t.Error(err)
			return
		}
		if doc["price_amount"] != json.Number("123.45") || doc["order_id"] != input.AttemptID || doc["price_currency"] != "usd" || doc["pay_currency"] != "usdttrc20" || doc["is_fee_paid_by_user"] != false || doc["is_fixed_rate"] != true {
			t.Error("commercial input changed")
		}
		if doc["ipn_callback_url"] != "https://booster.example.test/api/v1/webhooks/payments/nowpayments" || doc["success_url"] != "https://booster.example.test/orders/"+input.OrderID+"?section=payment" || doc["cancel_url"] != doc["success_url"] || doc["partially_paid_url"] != doc["success_url"] {
			t.Error("unexpected callbacks")
		}
		for _, private := range []string{"email", "answers", "credential", c.ipnSecret, c.apiKey} {
			if strings.Contains(string(body), private) {
				t.Error("private provider payload")
			}
		}
		respond(t, w, map[string]any{"id": 123456, "invoice_url": "https://nowpayments.io/payment/?iid=123456&unknown=ignored", "order_id": input.AttemptID})
	})
	invoice, err := c.CreateInvoice(t.Context(), input)
	if err != nil || invoice.ID != "123456" || invoice.URL != "https://nowpayments.io/payment/?iid=123456" || calls != 1 {
		t.Fatal("invoice reference", err)
	}
}
func TestInvoiceLocalValidationAndSmallAmounts(t *testing.T) {
	c := testClient(t)
	input := sampleRequest()
	calls := 0
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		calls++
		var v map[string]json.RawMessage
		if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
			t.Error(err)
		}
		if string(v["price_amount"]) != "0.01" {
			t.Error("minor-unit rounding")
		}
		respond(t, w, map[string]any{"id": "1", "invoice_url": "https://nowpayments.io/payment/?iid=1"})
	})
	for _, change := range []func(*InvoiceRequest){func(v *InvoiceRequest) { v.OrderID = "../evil" }, func(v *InvoiceRequest) { v.AttemptID = "../other" }, func(v *InvoiceRequest) { v.AmountMinor = "0" }, func(v *InvoiceRequest) { v.AmountMinor = "1.5" }, func(v *InvoiceRequest) { v.AmountMinor = "1000000000000" }, func(v *InvoiceRequest) { v.Currency = "BTC" }, func(v *InvoiceRequest) { v.PayCurrency = "btc&next=evil" }} {
		v := input
		change(&v)
		if _, err := c.CreateInvoice(t.Context(), v); !errors.Is(err, ErrInvalid) {
			t.Fatal("invalid request sent", err)
		}
	}
	if calls != 0 {
		t.Fatal("validation performed after network")
	}
	input.AmountMinor = "1"
	if _, err := c.CreateInvoice(t.Context(), input); err != nil {
		t.Fatal(err)
	}
}
func TestInvoiceRemoteFailuresRemainAmbiguousAndNeverRetry(t *testing.T) {
	for _, body := range []string{`{"id":"1","invoice_url":"https://evil.test/payment/?iid=1"}`, `{"id":"1","invoice_url":"https://nowpayments.io.evil.test/payment/?iid=1"}`, `{"id":"1","invoice_url":"https://retired-provider.invalid/payment/?iid=1"}`, `{"id":"1","invoice_url":"https://nowpayments.io/payment/?iid=2"}`, `{"id":"1","invoice_url":"https://nowpayments.io/payment/?iid=1&iid=2"}`, `{"id":"1","invoice_url":"https://user@nowpayments.io/payment/?iid=1"}`, `{"id":"1","id":"2"}`, `{}`, `{} {}`, strings.Repeat("x", maxBody+1)} {
		c := testClient(t)
		var calls atomic.Int32
		attach(t, c, func(w http.ResponseWriter, _ *http.Request) {
			calls.Add(1)
			if _, err := io.WriteString(w, body); err != nil {
				t.Error(err)
			}
		})
		if _, err := c.CreateInvoice(t.Context(), sampleRequest()); !errors.Is(err, ErrAmbiguous) || calls.Load() != 1 {
			t.Fatal("unsafe retry or false success", err)
		}
	}
	for _, status := range []int{301, 307, 400, 401, 403, 408, 429, 500, 503} {
		c := testClient(t)
		var calls atomic.Int32
		attach(t, c, func(w http.ResponseWriter, _ *http.Request) {
			calls.Add(1)
			w.Header().Set("Location", c.baseURL+"/redirect")
			w.WriteHeader(status)
			if _, err := io.WriteString(w, "private-provider-detail"); err != nil {
				t.Error(err)
			}
		})
		_, err := c.CreateInvoice(t.Context(), sampleRequest())
		if !errors.Is(err, ErrAmbiguous) || calls.Load() != 1 || strings.Contains(err.Error(), "private-provider") {
			t.Fatal("provider error leaked or retried", err)
		}
	}
}
func TestTimeoutAndCancellationDoNotExposeTransportDetails(t *testing.T) {
	c := testClient(t)
	release := make(chan struct{})
	defer close(release)
	attach(t, c, func(_ http.ResponseWriter, r *http.Request) {
		select {
		case <-r.Context().Done():
		case <-release:
		}
	})
	c.http.Timeout = 20 * time.Millisecond
	_, err := c.CreateInvoice(t.Context(), sampleRequest())
	if !errors.Is(err, ErrAmbiguous) {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	_, err = c.GetPayment(ctx, "1")
	if !errors.Is(err, ErrUnavailable) {
		t.Fatal(err)
	}
}
func TestConfigHasNoArbitraryProviderEndpoint(t *testing.T) {
	base := Config{APIKey: strings.Repeat("test-api", 4), IPNSecret: strings.Repeat("test-ipn", 4), PublicOrigin: "https://booster.example.test"}
	for _, change := range []func(*Config){func(v *Config) { v.PublicOrigin = "https://" + strings.Repeat("x", 2048) + ".test" }, func(v *Config) { v.APIKey = "" }, func(v *Config) { v.IPNSecret = "" }, func(v *Config) { v.APIKey += "\n" }, func(v *Config) { v.PublicOrigin = "http://booster.example.test" }, func(v *Config) { v.PublicOrigin = "https://user:pass@booster.example.test" }, func(v *Config) { v.PublicOrigin += "/path" }, func(v *Config) { v.PublicOrigin += "?" }, func(v *Config) { v.PublicOrigin += "#bad" }} {
		v := base
		change(&v)
		if _, err := New(v); !errors.Is(err, ErrInvalid) {
			t.Fatal("unsafe config")
		}
	}
	c, err := New(base)
	if err != nil || c.baseURL != "https://api.nowpayments.io/v1" || c.checkoutHost != "nowpayments.io" || c.http.Timeout <= 0 {
		t.Fatal("live transport", err)
	}
}

func TestConcurrentReadsAndSignalsRemainIndependent(t *testing.T) {
	c := testClient(t)
	attach(t, c, func(w http.ResponseWriter, _ *http.Request) { respond(t, w, paymentFixture()) })
	body := `{"payment_id":123,"state":"finished"}`
	signature := signSynthetic(t, c, body)
	var group sync.WaitGroup
	for range 16 {
		group.Go(func() {
			p, err := c.GetPayment(t.Context(), "123")
			if err != nil || p.ID != "123" {
				t.Error("concurrent observation", err)
			}
			notice, err := c.VerifyWebhook([]byte(body), signature)
			if err != nil || notice.PaymentID != "123" {
				t.Error("concurrent callback", err)
			}
		})
	}
	group.Wait()
}
func TestInvoiceEchoMustMatchPersistedCommercialInput(t *testing.T) {
	for _, value := range []map[string]any{
		{"price_amount": "123.44"}, {"price_currency": "eur"}, {"price_amount": "not-a-number"}, {"order_id": "different"},
		{"price_currency": " USD"}, {"price_currency": nil}, {"price_currency": 123},
		{"pay_currency": "USDTBSC"}, {"pay_currency": "usdttrc20 "}, {"pay_currency": nil}, {"pay_currency": true},
	} {
		c := testClient(t)
		value["id"] = "1"
		value["invoice_url"] = "https://nowpayments.io/payment/?iid=1"
		attach(t, c, func(w http.ResponseWriter, _ *http.Request) { respond(t, w, value) })
		if _, err := c.CreateInvoice(t.Context(), sampleRequest()); !errors.Is(err, ErrAmbiguous) {
			t.Fatal("changed commercial echo accepted", err)
		}
	}
}

// The owner-approved 13 October live diagnostic returned uppercase currency
// echoes and an integer-looking decimal string. IDs below are synthetic.
func TestInvoiceLiveResponseCurrencyCase(t *testing.T) {
	for _, currency := range []string{"USD", "usd", "Usd"} {
		t.Run(currency, func(t *testing.T) {
			c := testClient(t)
			input := sampleRequest()
			input.AmountMinor, input.PayCurrency = "5000", "usdtbsc"
			calls := 0
			attach(t, c, func(w http.ResponseWriter, _ *http.Request) {
				calls++
				respond(t, w, map[string]any{
					"id": "1234567890", "invoice_url": "https://nowpayments.io/payment/?iid=1234567890",
					"order_id": input.AttemptID, "price_amount": "50", "price_currency": currency,
					"pay_currency": "USDTBSC", "customer_email": nil, "payout_currency": nil,
					"source": nil, "collect_user_data": false, "is_fixed_rate": true, "is_fee_paid_by_user": false,
				})
			})
			invoice, err := c.CreateInvoice(t.Context(), input)
			if err != nil || invoice.ID != "1234567890" || invoice.URL != "https://nowpayments.io/payment/?iid=1234567890" || calls != 1 {
				t.Fatal("valid live-format invoice must retain a hosted link without repeating the POST", invoice, err, calls)
			}
		})
	}
}
