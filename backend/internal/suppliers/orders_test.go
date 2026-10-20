package suppliers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
)

func nexusOrder(status string) string {
	return `{"id":42,"product":"test:coins:p1","externalId":"` + testReference + `","amount":1,"totalPrice":0.515,"status":"` + status + `","deliveryData":{"player":"private-value"}}`
}

func TestCreateUsesOneCappedRequestAndExactReference(t *testing.T) {
	var posts atomic.Int32
	client := fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/sandbox" {
			reply(t, w, `{"mode":"sandbox","realMoney":false}`)
			return
		}
		if r.Method != http.MethodPost {
			t.Error("unexpected method")
		}
		posts.Add(1)
		var payload struct {
			Max       json.RawMessage `json:"maxTotalPrice"`
			Amount    json.RawMessage `json:"amount"`
			Reference string          `json:"externalId"`
			Split     bool            `json:"allowSplit"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Error(err)
		}
		if string(payload.Max) != "0.515" || string(payload.Amount) != "1" || payload.Reference != testReference || payload.Split {
			t.Error("purchase guard missing")
		}
		reply(t, w, nexusOrder("pending"))
	})
	result, err := client.CreateOrder(t.Context(), testPurchase())
	if err != nil || result.ID != "42" || result.Status != "pending" || posts.Load() != 1 {
		t.Fatalf("unexpected purchase result: %v", err)
	}
}
func TestUncertainCreateNeverRetries(t *testing.T) {
	for _, failure := range []string{"server", "malformed", "mismatch", "duplicate", "split"} {
		t.Run(failure, func(t *testing.T) {
			var posts atomic.Int32
			client := fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/api/v1/sandbox" {
					reply(t, w, `{"mode":"sandbox","realMoney":false}`)
					return
				}
				posts.Add(1)
				body := nexusOrder("completed")
				switch failure {
				case "server":
					w.WriteHeader(http.StatusServiceUnavailable)
					return
				case "malformed":
					body = `{"id":42}`
				case "mismatch":
					body = strings.ReplaceAll(body, testReference, "different-reference")
				case "duplicate":
					body = strings.Replace(body, `"id":42`, `"id":42,"id":43`, 1)
				case "split":
					body = strings.TrimSuffix(body, "}") + `,"split":{"count":2}}`
				}
				reply(t, w, body)
			})
			if _, err := client.CreateOrder(t.Context(), testPurchase()); !errors.Is(err, ErrAmbiguous) || posts.Load() != 1 {
				t.Fatalf("write retried or uncertainty lost: %v", err)
			}
		})
	}
}
func TestVendoriaCreateKeepsProductFormAndQuantity(t *testing.T) {
	client := fixtureClient(t, VendoriaTest, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/orders" || r.Header.Get("Authorization") != "Shop "+testToken {
			t.Error("incorrect Vendoria endpoint or truncated shop token")
		}
		var request struct {
			Product   int               `json:"productId"`
			Form      int               `json:"formId"`
			Quantity  json.RawMessage   `json:"quantity"`
			Reference string            `json:"shopOrderId"`
			Values    map[string]string `json:"deliveryData"`
		}
		decoder := json.NewDecoder(r.Body)
		// Vendoria silently ignores unknown fields. Reject them in this fixture
		// so a Nexus-only price/idempotency field cannot appear to protect us.
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&request); err != nil {
			t.Error(err)
		}
		if request.Product != 5 || request.Form != 7 || string(request.Quantity) != "1" || request.Reference != testReference || request.Values["player"] != "synthetic-player" {
			t.Error("incorrect request")
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		// Actual price may exceed the earlier read; retain the provider ID and
		// charged total for the purchase layer's review, never substitute our cap.
		reply(t, w, `{"id":42,"productId":5,"quantity":1,"price":0.625,"shopOrderId":"`+testReference+`","status":"pending"}`)
	})
	input := testPurchase()
	input.ProductID = "5"
	input.Offer.ID = "7"
	if result, err := client.CreateOrder(t.Context(), input); err != nil || result.ID != "42" || result.Cost != "0.625" {
		t.Fatal("actual charged amount or accepted order lost", err)
	}
}

func TestVendoriaCreateErrorsNeverRepeatPurchase(t *testing.T) {
	for _, status := range []int{http.StatusBadRequest, http.StatusPaymentRequired, http.StatusUnprocessableEntity, http.StatusTooManyRequests, http.StatusInternalServerError, http.StatusBadGateway} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			var posts atomic.Int32
			client := fixtureClient(t, VendoriaTest, func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodPost || r.URL.Path != "/api/orders" {
					t.Error("unexpected request")
				}
				posts.Add(1)
				w.WriteHeader(status)
				reply(t, w, `{"message":"private-synthetic-delivery-value"}`)
			})
			input := testPurchase()
			input.ProductID, input.Offer.ID = "5", "7"
			_, err := client.CreateOrder(t.Context(), input)
			if err == nil || posts.Load() != 1 || strings.Contains(err.Error(), "private-synthetic") {
				t.Fatal("create retried or private response exposed", err)
			}
		})
	}
}

func TestVendoriaCancellationAndNewestFirstReferenceSearch(t *testing.T) {
	client := fixtureClient(t, VendoriaTest, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/api/orders" || r.URL.Query().Get("take") != "100" || r.URL.Query().Get("offset") != "0" {
			t.Error("reference lookup used an unsupported filter or write")
		}
		// A cancelled order and a second chargeable purchase may share the same
		// reference. Preserve both; neither newest-first ordering nor cancellation
		// establishes which one the purchase layer should select.
		reply(t, w, `[{"id":43,"productId":5,"quantity":1,"price":0.625,"shopOrderId":"`+testReference+`","status":"pending"},{"id":42,"productId":5,"quantity":1,"price":0.515,"shopOrderId":"`+testReference+`","status":"cancelled","cancellationReason":{"type":"vendor_rejection"}}]`)
	})
	orders, more, err := client.FindOrders(t.Context(), testReference, 0)
	if err != nil || more || len(orders) != 2 || orders[0].ID != "43" || orders[1].Status != "cancelled" || orders[1].Reason != "vendor_rejection" {
		t.Fatal("lost duplicate/cancellation evidence", err)
	}
	if _, err = client.decodeOrder([]byte(`{"id":42,"productId":5,"quantity":1,"price":0.515,"status":"failed"}`)); !errors.Is(err, ErrEvidence) {
		t.Fatal("accepted nonexistent Vendoria failed status", err)
	}
}
func TestPartialFulfillmentIsNotFullDelivery(t *testing.T) {
	client, err := New(Config{Connection: NexusSandbox, Token: testToken})
	if err != nil {
		t.Fatal(err)
	}
	raw := strings.TrimSuffix(nexusOrder("partially_completed"), "}") + `,"requestedQuantity":4,"deliveredQuantity":2}`
	result, err := client.decodeOrder([]byte(raw))
	if err != nil || result.Status != "partially_completed" || result.Delivered == nil || *result.Delivered != "2" {
		t.Fatal("partial delivery lost")
	}
	for _, body := range []string{nexusOrder("partially_completed"), strings.Replace(raw, `"deliveredQuantity":2`, `"deliveredQuantity":5`, 1), strings.Replace(raw, `"deliveredQuantity":2`, `"deliveredQuantity":0`, 1)} {
		if _, err = client.decodeOrder([]byte(body)); err == nil {
			t.Fatal("accepted malformed partial fulfillment")
		}
	}
}
func TestReadsMatchIDsAndNeverRecreateFailedOrder(t *testing.T) {
	var posts atomic.Int32
	client := fixtureClient(t, NexusSandbox, func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			posts.Add(1)
		}
		if r.URL.Path == "/api/v1/orders" {
			reply(t, w, "["+nexusOrder("failed")+"]")
			return
		}
		reply(t, w, nexusOrder("failed"))
	})
	orders, more, err := client.FindOrders(t.Context(), testReference, 0)
	if err != nil || more || len(orders) != 1 || orders[0].Status != "failed" || posts.Load() != 0 {
		t.Fatal("failed lookup caused purchase or lost evidence")
	}
	if _, err = client.GetOrder(t.Context(), "43"); !errors.Is(err, ErrEvidence) {
		t.Fatal("wrong order ID accepted")
	}
}
