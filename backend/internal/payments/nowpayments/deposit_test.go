package nowpayments

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"testing"
)

func TestInvoicePaymentSingleWriteOnlyNecessaryFields(t *testing.T) {
	c := testClient(t)
	calls := 0
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Method != http.MethodPost || r.URL.Path != "/v1/invoice-payment" {
			t.Error("unexpected deposit request")
		}
		var body map[string]json.RawMessage
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		if len(body) != 2 || string(body["iid"]) != "9007199254740991" || string(body["pay_currency"]) != `"usdttrc20"` {
			t.Error("unsafe deposit payload")
		}
		respond(t, w, map[string]any{"payment_id": "42"})
	})
	id, err := c.CreateInvoicePayment(t.Context(), "9007199254740991", "usdttrc20")
	if err != nil || id != "42" || calls != 1 {
		t.Fatal("deposit write failed", err)
	}
}

func TestInvoicePaymentAmbiguityNoRetries(t *testing.T) {
	for _, status := range []int{301, 400, 403, 408, 429, 500, 503} {
		c := testClient(t)
		calls := 0
		attach(t, c, func(w http.ResponseWriter, _ *http.Request) { calls++; w.WriteHeader(status) })
		if _, err := c.CreateInvoicePayment(t.Context(), "1", "btc"); !errors.Is(err, ErrAmbiguous) || calls != 1 {
			t.Fatal("unsafe deposit retry", status, err)
		}
	}
	for _, value := range []any{nil, "", "0", "../other", strings.Repeat("9", 33)} {
		c := testClient(t)
		calls := 0
		attach(t, c, func(w http.ResponseWriter, _ *http.Request) {
			calls++
			respond(t, w, map[string]any{"payment_id": value})
		})
		if _, err := c.CreateInvoicePayment(t.Context(), "1", "btc"); !errors.Is(err, ErrAmbiguous) || calls != 1 {
			t.Fatal("unsafe provider reference", err)
		}
	}
	c := testClient(t)
	calls := 0
	attach(t, c, func(w http.ResponseWriter, _ *http.Request) { calls++; respond(t, w, map[string]any{}) })
	for _, input := range [][2]string{{"../x", "btc"}, {"9007199254740992", "btc"}, {"1", "btc&next=evil"}, {"", "btc"}} {
		if _, err := c.CreateInvoicePayment(t.Context(), input[0], input[1]); !errors.Is(err, ErrInvalid) {
			t.Fatal("invalid input sent", err)
		}
	}
	c.readOnly = true
	if _, err := c.CreateInvoicePayment(t.Context(), "1", "btc"); !errors.Is(err, ErrUnavailable) || calls != 0 {
		t.Fatal("read-only provider wrote", err)
	}
}

func TestDepositInstructionsOptionalBoundedAndExplicitExpiry(t *testing.T) {
	if got, err := destination(map[string]any{}); got != nil || err != nil {
		t.Fatal("historical response changed", err)
	}
	sample := map[string]any{"pay_address": "synthetic-address-not-payable", "payin_extra_id": "1234", "expiration_estimate_date": "2026-09-27T12:00:00.000Z"}
	got, err := destination(sample)
	if err != nil || got == nil || got.Address != "synthetic-address-not-payable" || got.Memo != "1234" || got.ExpiresAt.IsZero() {
		t.Fatal("destination", err)
	}
	for _, key := range []string{"pay_address", "payin_extra_id", "expiration_estimate_date"} {
		mutated := map[string]any{}
		for k, v := range sample {
			mutated[k] = v
		}
		mutated[key] = "bad\nvalue"
		if _, err = destination(mutated); !errors.Is(err, ErrEvidence) {
			t.Fatal("unsafe destination", key, err)
		}
	}
	delete(sample, "expiration_estimate_date")
	got, err = destination(sample)
	if err != nil || got == nil || !got.ExpiresAt.IsZero() {
		t.Fatal("missing expiry invented", err)
	}
}

func TestInvoicePaymentCancelledContextDoesNotRetry(t *testing.T) {
	c := testClient(t)
	calls := 0
	attach(t, c, func(w http.ResponseWriter, _ *http.Request) {
		calls++
		respond(t, w, map[string]any{"payment_id": "1"})
	})
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if _, err := c.CreateInvoicePayment(ctx, "1", "btc"); !errors.Is(err, ErrAmbiguous) || calls != 0 {
		t.Fatal("cancelled request", err)
	}
}

func TestAuthenticatedReadIncludesOnlyBoundedDestination(t *testing.T) {
	c := testClient(t)
	payload := paymentFixture()
	payload["pay_address"] = "synthetic-not-payable-address"
	payload["payin_extra_id"] = "123"
	payload["expiration_estimate_date"] = "2026-09-27T15:30:00+03:30"
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Api-Key") != c.apiKey || r.Method != http.MethodGet {
			t.Error("unauthenticated destination read")
		}
		respond(t, w, payload)
	})
	id, err := providerID(payload["payment_id"])
	if err != nil {
		t.Fatal(err)
	}
	p, err := c.GetPayment(t.Context(), id)
	if err != nil || p.Destination == nil || p.Destination.Memo != "123" || p.Destination.ExpiresAt.IsZero() {
		t.Fatal("authenticated destination lost", err)
	}
	payload["pay_address"] = "javascript:unsafe"
	if _, err = c.GetPayment(t.Context(), id); !errors.Is(err, ErrEvidence) {
		t.Fatal("unsafe destination accepted", err)
	}
}
