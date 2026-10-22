package nowpayments

import (
	"encoding/json"
	"errors"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestPaymentNetworkCoalescesWithoutMerchantAvailability(t *testing.T) {
	c := testClient(t)
	var calls atomic.Int32
	var fail atomic.Bool
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if r.Method != http.MethodGet || r.URL.Path != "/v1/full-currencies" {
			t.Error("unexpected metadata endpoint")
		}
		if fail.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		respond(t, w, map[string]any{"currencies": []any{
			map[string]any{"code": "USDTBSC", "network": "BSC", "enable": false, "available_for_payment": false},
			map[string]any{"code": "OUTSIDELOCALREGISTRY", "network": "newchain"},
			map[string]any{"code": "AE", "network": nil},
		}})
	})
	var group sync.WaitGroup
	for range 20 {
		group.Go(func() {
			network, err := c.PaymentNetwork(t.Context(), "usdtbsc")
			if err != nil || network != "bsc" {
				t.Error(network, err)
			}
		})
	}
	group.Wait()
	if calls.Load() != 1 {
		t.Fatal("metadata calls not coalesced", calls.Load())
	}
	if network, err := c.PaymentNetwork(t.Context(), "outsidelocalregistry"); err != nil || network != "newchain" {
		t.Fatal("incoming constrained by local registry", err)
	}
	for _, code := range []string{"missing", "ae"} {
		if _, err := c.PaymentNetwork(t.Context(), code); !errors.Is(err, ErrEvidence) {
			t.Fatal("guessed absent network", err)
		}
	}
	c.currencies.mu.Lock()
	c.currencies.entry.until = time.Now().Add(-time.Minute)
	c.currencies.mu.Unlock()
	fail.Store(true)
	for range 2 {
		if _, err := c.PaymentNetwork(t.Context(), "usdtbsc"); !errors.Is(err, ErrUnavailable) {
			t.Fatal("stale success", err)
		}
	}
	if calls.Load() != 2 {
		t.Fatal("failed metadata read not bounded", calls.Load())
	}
}
func TestCurrencyDirectoryRejectsAmbiguity(t *testing.T) {
	for _, value := range []any{nil, "btc", []any{false}, []any{map[string]any{"code": "BTC", "network": "btc"}, map[string]any{"code": "btc", "network": "other"}}} {
		c := testClient(t)
		attach(t, c, func(w http.ResponseWriter, _ *http.Request) { respond(t, w, map[string]any{"currencies": value}) })
		if _, err := c.PaymentNetwork(t.Context(), "btc"); !errors.Is(err, ErrEvidence) {
			t.Fatal("ambiguous directory", err)
		}
	}
	if responseLimit(http.MethodGet, "/full-currencies") != 2*1024*1024 || responseLimit(http.MethodPost, "/full-currencies") != maxBody || responseLimit(http.MethodGet, "/payment/1") != maxBody {
		t.Fatal("relaxed financial response boundary")
	}
}
func TestHostedInvoiceOmitsCurrencyAndDoesNoPreflight(t *testing.T) {
	c := testClient(t)
	input := sampleRequest()
	input.PayCurrency = ""
	calls := 0
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Method != http.MethodPost || r.URL.Path != "/v1/invoice" {
			t.Error("unexpected preflight")
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		if _, exists := body["pay_currency"]; exists {
			t.Error("hosted invoice pinned asset")
		}
		if body["price_currency"] != "usd" || body["price_amount"] != 123.45 || body["order_id"] != input.AttemptID {
			t.Error("lost USD binding")
		}
		respond(t, w, map[string]any{"id": "1", "invoice_url": "https://nowpayments.io/payment/?iid=1"})
	})
	if _, err := c.CreateInvoice(t.Context(), input); err != nil || calls != 1 {
		t.Fatal("invoice failed", err, calls)
	}
}
