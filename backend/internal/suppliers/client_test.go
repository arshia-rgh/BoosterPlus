package suppliers

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

const testToken = "10:synthetic-fixture-token-not-a-real-credential"
const testReference = "d3fd2f89-8c5f-4452-bd86-0c3d07521883"

func fixtureClient(t *testing.T, connection Connection, handler http.HandlerFunc) *Client {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	c, err := New(Config{Connection: connection, Token: testToken, TestOrdersEnabled: connection.Testing()})
	if err != nil {
		t.Fatal(err)
	}
	c.origin = server.URL
	return c
}
func reply(t *testing.T, w http.ResponseWriter, body string) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if _, err := io.WriteString(w, body); err != nil {
		t.Error(err)
	}
}
func testPurchase() PurchaseRequest {
	return PurchaseRequest{Reference: testReference, ProductID: "test:coins:p1", Offer: Offer{ID: "default", Available: true, Cost: "0.515", Fields: []Field{{ID: "player", Label: "Player ID", Kind: "text", Required: true}}, Quantity: Quantity{Kind: "one", Min: "1", Max: "1", Step: "1"}}, Quantity: "1", MaximumCost: "0.515", Values: map[string]string{"player": "synthetic-player"}}
}
func TestConnectionsFixedAndProductionPurchasesDisabled(t *testing.T) {
	for _, connection := range []Connection{NexusSandbox, NexusProduction, VendoriaTest, VendoriaProduction} {
		client, err := New(Config{Connection: connection, Token: testToken})
		if err != nil {
			t.Fatal(err)
		}
		if !strings.HasPrefix(client.origin, "https://") || client.Connection() != connection {
			t.Fatal("wrong endpoint")
		}
		if _, err = client.CreateOrder(t.Context(), testPurchase()); !errors.Is(err, ErrReadOnly) {
			t.Fatal("writes enabled by default")
		}
		if !connection.Testing() {
			if _, err = New(Config{Connection: connection, Token: testToken, TestOrdersEnabled: true}); !errors.Is(err, ErrInvalid) {
				t.Fatal("production write flag accepted")
			}
		}
	}
	for _, cfg := range []Config{{Connection: "https://attacker.example", Token: testToken}, {Connection: NexusSandbox, Token: "invalid"}, {Connection: NexusSandbox, Token: testToken + "\r\n"}} {
		if _, err := New(cfg); err == nil {
			t.Fatal("invalid configuration accepted")
		}
	}
}
func TestTransportDoesNotFollowRedirectsOrLeakRawErrors(t *testing.T) {
	var destinationCalls atomic.Int32
	destination := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { destinationCalls.Add(1); reply(t, w, `{}`) }))
	defer destination.Close()
	client := fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, destination.URL, http.StatusTemporaryRedirect)
	})
	if _, err := client.Balance(t.Context()); !errors.Is(err, ErrUnavailable) {
		t.Fatal(err)
	}
	if destinationCalls.Load() != 0 {
		t.Fatal("followed credential redirect")
	}
	client = fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		if _, err := io.WriteString(w, "private-customer-value"); err != nil {
			t.Error(err)
		}
	})
	if _, err := client.Balance(t.Context()); err == nil || strings.Contains(err.Error(), "private-customer") {
		t.Fatal("unsafe provider error")
	}
}
func TestSandboxMarkerAndBalance(t *testing.T) {
	client := fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Shop "+testToken {
			t.Error("missing full shop token")
		}
		if r.URL.Path == "/api/v1/sandbox" {
			reply(t, w, `{"mode":"sandbox","realMoney":false}`)
		} else {
			reply(t, w, `{"sandbox":true,"balance":1000.015}`)
		}
	})
	if err := client.VerifySandbox(t.Context()); err != nil {
		t.Fatal(err)
	}
	if value, err := client.Balance(t.Context()); err != nil || value != "1000.015" {
		t.Fatalf("%s %v", value, err)
	}
	for _, body := range []string{`{"mode":"sandbox"}`, `{"mode":"sandbox","realMoney":true}`, `{"mode":"production","realMoney":false}`, `{"mode":"sandbox","realMoney":false,"realMoney":true}`} {
		bad := fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, _ *http.Request) { reply(t, w, body) })
		if err := bad.VerifySandbox(t.Context()); !errors.Is(err, ErrEvidence) {
			t.Fatal("accepted invalid sandbox marker")
		}
	}
}
func TestTransportHonorsCancellationAndResponseBound(t *testing.T) {
	client := fixtureClient(t, VendoriaTest, func(w http.ResponseWriter, _ *http.Request) { reply(t, w, `{"balance":100}`) })
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if _, err := client.Balance(ctx); err == nil {
		t.Fatal("ignored cancellation")
	}
	if _, err := client.request(t.Context(), http.MethodGet, "/api/shop/balance", nil, 2); err == nil {
		t.Fatal("accepted oversized response")
	}
}
