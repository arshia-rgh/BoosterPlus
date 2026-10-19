package suppliers

import (
	"context"
	"encoding/json"
	"net/http"
)

// Action requires a current owner-authorized customer request in the dispatch
// store. It does not accept URLs or allow creating/retrying supplier purchases.
type Action struct{ OrderID, Kind, Code string }

// RespondAction performs one bounded test request for a Vendoria interaction.
// A lost response is uncertain; do not silently repeat codes or confirmations.
func (c *Client) RespondAction(ctx context.Context, action Action) error {
	if !c.testOrders || c.connection != VendoriaTest {
		return ErrReadOnly
	}
	if !numericIDPattern.MatchString(action.OrderID) {
		return ErrInvalid
	}
	path := "/api/orders/" + action.OrderID + "/"
	var body []byte
	switch action.Kind {
	case "code":
		if !plain(action.Code, 1, 1024) {
			return ErrInvalid
		}
		path = "/api/orders/code"
		var err error
		body, err = json.Marshal(struct {
			OrderID json.Number `json:"orderId"`
			Code    string      `json:"code"`
		}{json.Number(action.OrderID), action.Code})
		if err != nil {
			return ErrInvalid
		}
		defer clear(body)
	case "game-exited", "client-ready", "request-retry":
		if action.Code != "" {
			return ErrInvalid
		}
		path += action.Kind
		body = []byte("{}")
	default:
		return ErrInvalid
	}
	raw, err := c.request(ctx, http.MethodPost, path, body, 8192)
	clear(raw)
	if err != nil {
		return ErrAmbiguous
	}
	return nil
}
