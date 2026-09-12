package nowpayments

import (
	"errors"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
)

func TestDiscoveryAuthenticatesCachesAndValidatesPages(t *testing.T) {
	c := testClient(t)
	c.email = "merchant@example.test"
	c.password = "synthetic-dashboard-password"
	var logins, reads atomic.Int32
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Api-Key") != c.apiKey {
			t.Error("API key missing")
		}
		if r.URL.Path == "/v1/auth" {
			logins.Add(1)
			if r.Method != http.MethodPost {
				t.Error("wrong authentication method")
			}
			respond(t, w, map[string]any{"token": "synthetic-test-bearer-token"})
			return
		}
		reads.Add(1)
		if r.Method != http.MethodGet || r.Header.Get("Authorization") != "Bearer synthetic-test-bearer-token" || r.URL.Query().Get("page") != "0" || r.URL.Query().Get("limit") != "50" {
			t.Error("incorrect discovery request")
		}
		respond(t, w, map[string]any{"data": []any{map[string]any{"payment_id": "123"}}, "pagesCount": 2})
	})
	var group sync.WaitGroup
	for range 8 {
		group.Go(func() {
			page, err := c.ListPayments(t.Context(), 0)
			if err != nil || len(page.IDs) != 1 || page.IDs[0] != "123" || page.Pages != 2 {
				t.Error(page, err)
			}
		})
	}
	group.Wait()
	if logins.Load() != 1 || reads.Load() != 8 {
		t.Fatal("token cache not shared", logins.Load(), reads.Load())
	}
	for _, page := range []int{-1, 100001} {
		if _, err := c.ListPayments(t.Context(), page); !errors.Is(err, ErrInvalid) {
			t.Fatal("invalid page accepted", err)
		}
	}
}
func TestDiscoveryMalformedAndExpiredCredentials(t *testing.T) {
	for _, body := range []map[string]any{
		{"data": []any{map[string]any{"payment_id": "123"}, map[string]any{"payment_id": 123}}, "pagesCount": 1},
		{"data": []any{map[string]any{"payment_id": "../auth"}}, "pagesCount": 1},
		{"data": []any{}, "pagesCount": -1}, {"data": []any{}, "pagesCount": "1"}, {"data": nil, "pagesCount": 0},
	} {
		c := testClient(t)
		c.email = "merchant@example.test"
		c.password = "synthetic-test-password"
		attach(t, c, func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/v1/auth" {
				respond(t, w, map[string]any{"token": "synthetic-test-bearer-token"})
				return
			}
			respond(t, w, body)
		})
		if _, err := c.ListPayments(t.Context(), 0); !errors.Is(err, ErrEvidence) {
			t.Fatal("malformed discovery accepted", err)
		}
	}
	c := testClient(t)
	c.email = "merchant@example.test"
	c.password = "synthetic-test-password"
	var logins atomic.Int32
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/auth" {
			logins.Add(1)
			respond(t, w, map[string]any{"token": "synthetic-test-bearer-token"})
			return
		}
		w.WriteHeader(http.StatusUnauthorized)
	})
	for range 2 {
		if _, err := c.ListPayments(t.Context(), 0); !errors.Is(err, ErrUnavailable) {
			t.Fatal(err)
		}
	}
	if logins.Load() != 2 {
		t.Fatal("rejected token remained cached")
	}
	c.email = ""
	c.password = ""
	if _, err := c.ListPayments(t.Context(), 0); !errors.Is(err, ErrUnavailable) {
		t.Fatal(err)
	}
}
func TestMerchantCredentialPairValidation(t *testing.T) {
	base := Config{APIKey: strings.Repeat("test-api", 4), IPNSecret: strings.Repeat("test-ipn", 4), PublicOrigin: "https://booster.example.test"}
	for _, change := range []func(*Config){func(c *Config) { c.Email = "x@example.test" }, func(c *Config) { c.Password = "synthetic-test-password" }, func(c *Config) { c.Email = "x@example.test"; c.Password = "bad\x00password" }} {
		c := base
		change(&c)
		if _, err := New(c); !errors.Is(err, ErrInvalid) {
			t.Fatal("invalid credential pair", err)
		}
	}
}

func TestReadOnlyMerchantCannotCreateInvoices(t *testing.T) {
	c, err := New(Config{APIKey: strings.Repeat("synthetic-api", 3), IPNSecret: strings.Repeat("synthetic-ipn", 3), PublicOrigin: "http://127.0.0.1:5173", ReadOnly: true})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = c.CreateInvoice(t.Context(), sampleRequest()); !errors.Is(err, ErrUnavailable) {
		t.Fatal("read-only merchant issued an invoice", err)
	}
	if c.baseURL != "https://api.nowpayments.io/v1" {
		t.Fatal("local public origin altered provider destination")
	}
}
