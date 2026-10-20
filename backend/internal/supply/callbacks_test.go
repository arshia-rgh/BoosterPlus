package supply

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func TestCallbackBoundsMediaAndPreservesRawSignature(t *testing.T) {
	const token = "10:synthetic-fixture-token-not-a-real-credential"
	provider, err := suppliers.New(suppliers.Config{Connection: suppliers.NexusSandbox, Token: token})
	if err != nil {
		t.Fatal(err)
	}
	// Unknown authenticated events may be acknowledged without touching SQL.
	body := "{\n \"type\": \"futureEvent\"\n}"
	mac := hmac.New(sha256.New, []byte(token))
	if _, err = mac.Write([]byte(body)); err != nil {
		t.Fatal(err)
	}
	signature := hex.EncodeToString(mac.Sum(nil))
	handler := statusCallback(func(_ context.Context, raw []byte, signatures []string) error {
		_, e := provider.VerifyWebhook(raw, signatures)
		return e
	})
	for _, row := range []struct {
		name, body, content, encoding string
		signatures                    []string
		status                        int
	}{
		{"raw", body, "application/json", "", []string{signature}, 204},
		{"tampered", strings.ReplaceAll(body, "\n", ""), "application/json", "", []string{signature}, 403},
		{"unsigned", body, "application/json", "", nil, 403},
		{"ambiguous", body, "application/json", "", []string{signature, signature}, 403},
		{"media", body, "text/plain", "", []string{signature}, 415},
		{"compressed", body, "application/json", "gzip", []string{signature}, 415},
		{"size", strings.Repeat("x", 256<<10+1), "application/json", "", []string{signature}, 413},
	} {
		t.Run(row.name, func(t *testing.T) {
			r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", strings.NewReader(row.body))
			r.Header.Set("Content-Type", row.content)
			r.Header.Set("Content-Encoding", row.encoding)
			for _, value := range row.signatures {
				r.Header.Add("Sign", value)
			}
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, r)
			if w.Code != row.status || w.Body.Len() != 0 || w.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("unsafe callback response", w.Code)
			}
		})
	}
}

func TestCallbackDoesNotAcknowledgeUnresolvedStorage(t *testing.T) {
	for _, failure := range []error{ErrConflict, ErrUnavailable, suppliers.ErrEvidence} {
		handler := statusCallback(func(context.Context, []byte, []string) error { return failure })
		r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/", strings.NewReader(`{}`))
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		expected := 503
		if errors.Is(failure, suppliers.ErrEvidence) {
			expected = 422
		}
		if w.Code != expected {
			t.Fatal("acknowledged unrecorded event", w.Code)
		}
	}
}

func TestCallbackRegistersOnlyConfiguredEnvironment(t *testing.T) {
	provider, err := suppliers.New(suppliers.Config{Connection: suppliers.VendoriaTest, Token: "0:synthetic-fixture-token-not-a-real-credential"})
	if err != nil {
		t.Fatal(err)
	}
	service := &Purchaser{providers: map[suppliers.Connection]PurchaseProvider{suppliers.VendoriaTest: provider}}
	mux := http.NewServeMux()
	service.RegisterCallbacks(mux)
	for _, row := range []struct {
		connection suppliers.Connection
		status     int
	}{{suppliers.VendoriaTest, 403}, {suppliers.VendoriaProduction, 404}, {suppliers.NexusSandbox, 404}} {
		r := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/api/v1/webhooks/suppliers/"+string(row.connection), strings.NewReader(`{}`))
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != row.status {
			t.Fatal("environment isolation failed", w.Code)
		}
	}
}
