package nowpayments

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
)

func payoutFixture() map[string]any {
	return map[string]any{"id": "71", "batch_withdrawal_id": "70", "unique_external_id": "7a13b5c7-110c-40c7-a3a9-26c0dba819d5", "currency": "usdttrc20", "amount": json.Number("1.234567890123456789"), "address": "synthetic-recipient-address", "extra_id": "memo-1", "status": "waiting"}
}
func outgoingClient(t *testing.T) *Client {
	t.Helper()
	c := testClient(t)
	c.payoutsEnabled = true
	c.email = "merchant@example.test"
	c.password = "synthetic-password"
	return c
}
func payoutRequest() PayoutRequest {
	return PayoutRequest{AttemptID: "7a13b5c7-110c-40c7-a3a9-26c0dba819d5", Currency: "usdttrc20", Amount: "1.234567890123456789", Recipient: Recipient{Address: "synthetic-recipient-address", Memo: "memo-1"}}
}
func TestOutgoingExactBodyAuthenticationAndEvidence(t *testing.T) {
	c := outgoingClient(t)
	calls := 0
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Api-Key") != c.apiKey {
			t.Error("missing api key")
		}
		if r.URL.Path == "/v1/auth" {
			respond(t, w, map[string]string{"token": "synthetic-ephemeral-bearer-token"})
			return
		}
		if r.Header.Get("Authorization") != "Bearer synthetic-ephemeral-bearer-token" {
			t.Error("missing payout bearer")
		}
		calls++
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Error(err)
			return
		}
		switch r.URL.Path {
		case "/v1/payout":
			if r.Method != http.MethodPost || !strings.Contains(string(body), `"amount":1.234567890123456789`) || strings.Contains(string(body), c.password) {
				t.Error("inexact or private payout body")
			}
			respond(t, w, map[string]any{"id": "70", "withdrawals": []any{payoutFixture()}})
		case "/v1/payout/70/verify":
			if r.Method != http.MethodPost || string(body) != `{"verification_code":"123456"}` {
				t.Error("wrong ephemeral verification")
			}
			respond(t, w, map[string]bool{"success": true})
		case "/v1/payout/71":
			respond(t, w, []any{payoutFixture()})
		default:
			t.Error("unexpected provider path")
		}
	})
	created, err := c.CreatePayout(t.Context(), payoutRequest())
	if err != nil || created.ID != "71" {
		t.Fatal(err)
	}
	if err = c.VerifyPayout(t.Context(), "70", "123456"); err != nil {
		t.Fatal(err)
	}
	evidence, err := c.GetPayout(t.Context(), "71")
	if err != nil || !matchesPayout(payoutRequest(), evidence) {
		t.Fatal("unmatched evidence", err)
	}
	if calls != 3 {
		t.Fatal("financial call repeated", calls)
	}
}
func TestOutgoingNeverAutomaticallyRepeatsAmbiguousPOST(t *testing.T) {
	for _, failure := range []string{"failure", "wrong_recipient", "wrong_amount", "wrong_reference", "duplicate_key"} {
		t.Run(failure, func(t *testing.T) {
			c := outgoingClient(t)
			calls := 0
			attach(t, c, func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/v1/auth" {
					respond(t, w, map[string]string{"token": "synthetic-ephemeral-bearer-token"})
					return
				}
				calls++
				value := payoutFixture()
				switch failure {
				case "failure":
					w.WriteHeader(http.StatusServiceUnavailable)
					return
				case "wrong_recipient":
					value["address"] = "different-recipient-address"
				case "wrong_amount":
					value["amount"] = json.Number("1.234567890123456788")
				case "wrong_reference":
					value["unique_external_id"] = "b9db5a28-c553-422f-8129-5a0c1a92a0af"
				case "duplicate_key":
					if _, err := io.WriteString(w, `{"id":"70","id":"71"}`); err != nil {
						t.Error(err)
					}
					return
				}
				respond(t, w, map[string]any{"id": "70", "withdrawals": []any{value}})
			})
			if _, err := c.CreatePayout(t.Context(), payoutRequest()); !errors.Is(err, ErrAmbiguous) {
				t.Fatal("ambiguous payout accepted", err)
			}
			if calls != 1 {
				t.Fatal("payout automatically retried", calls)
			}
		})
	}
}
func TestOutgoingDisabledAndInvalidInputNeverReachProvider(t *testing.T) {
	c := testClient(t)
	attach(t, c, func(_ http.ResponseWriter, _ *http.Request) {
		t.Error("disabled or invalid outgoing request reached provider")
	})
	if _, err := c.CreatePayout(t.Context(), payoutRequest()); !errors.Is(err, ErrUnavailable) {
		t.Fatal(err)
	}
	if err := c.VerifyPayout(t.Context(), "70", "123456"); !errors.Is(err, ErrUnavailable) {
		t.Fatal(err)
	}
	c.payoutsEnabled = true
	for _, code := range []string{"12345", "12345x", "1234567", "12\n456"} {
		if err := c.VerifyPayout(t.Context(), "70", code); !errors.Is(err, ErrInvalid) {
			t.Fatal("invalid provider code", err)
		}
	}
	for _, address := range []string{"short", "address with spaces", "address\nheader", strings.Repeat("a", 257)} {
		request := payoutRequest()
		request.Recipient.Address = address
		if _, err := c.CreatePayout(t.Context(), request); !errors.Is(err, ErrInvalid) {
			t.Fatal("invalid recipient", err)
		}
	}
}
func TestOutgoingReadRejectsMultipleOrMismatchedRecords(t *testing.T) {
	for _, value := range []any{[]any{payoutFixture(), payoutFixture()}, map[string]any{"payouts": []any{}}, map[string]any{"id": "72"}} {
		c := outgoingClient(t)
		attach(t, c, func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/v1/auth" {
				respond(t, w, map[string]string{"token": "synthetic-ephemeral-bearer-token"})
				return
			}
			respond(t, w, value)
		})
		if _, err := c.GetPayout(t.Context(), "71"); !errors.Is(err, ErrEvidence) {
			t.Fatal("invalid authoritative outgoing evidence", err)
		}
	}
}

func TestOutgoingAcknowledgementsPermitEmptySuccessButNeverEmptyEvidence(t *testing.T) {
	for _, body := range []string{"", `true`, `{"valid":true}`, `{}`} {
		c := testClient(t)
		attach(t, c, func(w http.ResponseWriter, _ *http.Request) {
			if body == "" {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			if _, err := io.WriteString(w, body); err != nil {
				t.Error(err)
			}
		})
		if err := c.CheckRecipient(t.Context(), "usdttrc20", payoutRequest().Recipient); err != nil {
			t.Fatal("valid empty or JSON acknowledgement rejected", err)
		}
	}
	for _, body := range []string{`false`, `{"valid":false}`, `{"success":false}`, `<html>error</html>`, `{"valid":true,"valid":false}`} {
		c := testClient(t)
		attach(t, c, func(w http.ResponseWriter, _ *http.Request) {
			if _, err := io.WriteString(w, body); err != nil {
				t.Error(err)
			}
		})
		if err := c.CheckRecipient(t.Context(), "usdttrc20", payoutRequest().Recipient); !errors.Is(err, ErrEvidence) {
			t.Fatal("invalid acknowledgement accepted", err)
		}
	}
	c := outgoingClient(t)
	attach(t, c, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/auth" {
			respond(t, w, map[string]string{"token": "synthetic-ephemeral-bearer-token"})
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	if _, err := c.GetPayout(t.Context(), "71"); !errors.Is(err, ErrEvidence) {
		t.Fatal("empty response invented financial evidence", err)
	}
}
