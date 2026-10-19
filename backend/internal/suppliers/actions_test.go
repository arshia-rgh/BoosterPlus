package suppliers

import (
	"encoding/json"
	"errors"
	"net/http"
	"sync/atomic"
	"testing"
)

func TestVendoriaActionsDoNotCreateOrders(t *testing.T) {
	var requests atomic.Int32
	client := fixtureClient(t, VendoriaTest, func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		if r.URL.Path == "/api/orders" || r.Method != http.MethodPost {
			t.Error("unsafe action route")
		}
		if r.URL.Path == "/api/orders/code" {
			var body struct {
				OrderID int    `json:"orderId"`
				Code    string `json:"code"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Error(err)
			}
			if body.OrderID != 42 || body.Code != "synthetic-code" {
				t.Error("incorrect action payload")
			}
		}
		reply(t, w, `{"message":"accepted"}`)
	})
	for _, kind := range []string{"code", "client-ready", "request-retry", "game-exited"} {
		action := Action{OrderID: "42", Kind: kind}
		if kind == "code" {
			action.Code = "synthetic-code"
		}
		if err := client.RespondAction(t.Context(), action); err != nil {
			t.Fatal(err)
		}
	}
	if requests.Load() != 4 {
		t.Fatal("unexpected request count")
	}
	for _, action := range []Action{{OrderID: "../orders", Kind: "code", Code: "synthetic-code"}, {OrderID: "42", Kind: "purchase"}, {OrderID: "42", Kind: "code"}} {
		if err := client.RespondAction(t.Context(), action); !errors.Is(err, ErrInvalid) {
			t.Fatal("unsafe action accepted")
		}
	}
	if requests.Load() != 4 {
		t.Fatal("invalid actions reached provider")
	}
}
