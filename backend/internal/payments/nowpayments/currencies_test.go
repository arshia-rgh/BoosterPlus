package nowpayments

import (
	"errors"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestPaymentCurrenciesCoalesceAndRejectUnavailableOrWrongRate(t *testing.T) {
	c := testClient(t)
	var calls atomic.Int32
	var fail atomic.Bool
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if r.Method != http.MethodGet {
			t.Error("currency lookup wrote provider")
		}
		if fail.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		switch r.URL.Path {
		case "/v1/full-currencies":
			respond(t, w, map[string]any{"currencies": []any{
				map[string]any{"code": "USDTBSC", "network": "bsc", "enable": true, "available_for_payment": true},
				map[string]any{"code": "USDTOP", "network": "op", "enable": true, "available_for_payment": false},
				map[string]any{"code": "BTC", "network": "btc", "enable": true, "available_for_payment": true},
				map[string]any{"code": "ETH", "network": "eth", "enable": true, "available_for_payment": true},
				map[string]any{"code": "AE", "network": nil, "enable": false, "available_for_payment": false},
			}})
		case "/v1/merchant/coins":
			respond(t, w, map[string]any{"selectedCurrencies": []string{"USDTBSC", "USDTOP", "BTC"}})
		case "/v1/currencies":
			if r.URL.Query().Get("fixed_rate") != "true" {
				t.Error("wrong rate policy")
			}
			respond(t, w, map[string]any{"currencies": []any{map[string]any{"currency": "usdtbsc"}, map[string]any{"currency": "usdtop"}}})
		default:
			t.Error("unexpected endpoint")
			w.WriteHeader(http.StatusNotFound)
		}
	})
	var group sync.WaitGroup
	for range 20 {
		group.Go(func() {
			value, err := c.PaymentCurrencies(t.Context(), true)
			if err != nil || len(value.Routes) != 1 || value.Routes["usdtbsc"] != "bsc" || !time.Now().Before(value.ValidUntil) {
				t.Error("incorrect availability", value, err)
			}
			value.Routes["mutated"] = "wrong"
		})
	}
	group.Wait()
	if calls.Load() != 3 {
		t.Fatal("uncoalesced currency reads", calls.Load())
	}
	floating, err := c.PaymentCurrencies(t.Context(), false)
	if err != nil || len(floating.Routes) != 2 || floating.Routes["btc"] != "btc" {
		t.Fatal("rate/merchant filters", floating, err)
	}
	c.currencies.mu.Lock()
	c.currencies.entries[true].until = time.Now().Add(-time.Minute)
	c.currencies.mu.Unlock()
	fail.Store(true)
	for range 2 {
		if value, e := c.PaymentCurrencies(t.Context(), true); !errors.Is(e, ErrUnavailable) || len(value.Routes) != 0 {
			t.Fatal("stale success on failed refresh", value, e)
		}
	}
	if calls.Load() != 6 {
		t.Fatal("failed lookup not bounded", calls.Load())
	}
}

func TestCurrencyDirectoryMalformedAndResponseLimits(t *testing.T) {
	for _, raw := range []any{nil, "btc", []any{"btc", "BTC"}, []any{false}, []any{"btc&next=bad"}} {
		if _, err := currencyCodes(raw, false); err == nil {
			t.Fatal("malformed/duplicate coin accepted")
		}
	}
	for _, raw := range []any{[]any{"btc"}, []any{map[string]any{"currency": "BTC"}}} {
		codes, err := currencyCodes(raw, true)
		if err != nil || !codes["btc"] {
			t.Fatal(err)
		}
	}
	if responseLimit(http.MethodGet, "/full-currencies") != 2*1024*1024 || responseLimit(http.MethodPost, "/full-currencies") != maxBody || responseLimit(http.MethodGet, "/payment/1") != maxBody {
		t.Fatal("relaxed financial response boundary")
	}
}
