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
		var request struct {
			Product   int             `json:"productId"`
			Form      int             `json:"formId"`
			Quantity  json.RawMessage `json:"quantity"`
			Reference string          `json:"shopOrderId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Error(err)
		}
		if request.Product != 5 || request.Form != 7 || string(request.Quantity) != "1" || request.Reference != testReference {
			t.Error("incorrect request")
		}
		reply(t, w, `{"id":42,"productId":5,"quantity":1,"price":0.515,"shopOrderId":"`+testReference+`","status":"pending"}`)
	})
	input := testPurchase()
	input.ProductID = "5"
	input.Offer.ID = "7"
	if _, err := client.CreateOrder(t.Context(), input); err != nil {
		t.Fatal(err)
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
