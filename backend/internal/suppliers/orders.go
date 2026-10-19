package suppliers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strconv"

	"github.com/google/uuid"
)

var numericIDPattern = regexp.MustCompile(`^[1-9][0-9]{0,18}$`)

// PurchaseRequest must come from an immutable, paid, persisted dispatch attempt.
// Recipient data is never copied to events/logs. This type is not a public DTO.
type PurchaseRequest struct {
	Reference   string
	ProductID   string
	Offer       Offer
	Quantity    Decimal
	MaximumCost Decimal
	Values      map[string]string
}

// Order is private authoritative evidence, not a public customer projection.
// Keys must be encrypted and only revealed to the owning customer explicitly.
type Order struct {
	ID                   string
	Reference            string
	ProductID            string
	Quantity             Decimal
	Cost                 Decimal
	Status               string
	Requested, Delivered *Decimal
	Keys                 []DeliveredKey
	Reason               string
	UpdatedAt            string
}

// DeliveredKey is confidential purchased content; never render it in previews.
type DeliveredKey struct {
	Code      string `json:"code"`
	CardNo    string `json:"cardNo,omitempty"`
	URL       string `json:"url,omitempty"`
	ExpiresAt string `json:"expireAt,omitempty"`
}

func validReference(value string) bool {
	id, err := uuid.Parse(value)
	return err == nil && id.String() == value
}

// CreateOrder performs exactly one test-environment POST, with no automatic
// retries. Every unsuccessful/malformed response is uncertain; the caller must
// retain its dispatch claim and reconcile, never call again blindly.
func (c *Client) CreateOrder(ctx context.Context, input PurchaseRequest) (Order, error) {
	if !c.testOrders || !c.connection.Testing() {
		return Order{}, ErrReadOnly
	}
	if !validReference(input.Reference) || !sourceID(input.ProductID) || !input.Offer.Available || len(input.Offer.ReviewIssues) > 0 {
		return Order{}, ErrInvalid
	}
	if err := ValidateQuantity(input.Offer.Quantity, input.Quantity); err != nil {
		return Order{}, err
	}
	maximum, err := input.MaximumCost.Rational()
	if err != nil || maximum.Sign() <= 0 {
		return Order{}, ErrInvalid
	}
	values, err := deliveryData(input.Offer.Fields, input.Values)
	if err != nil {
		return Order{}, err
	}
	path := "/api/v1/orders"
	body := map[string]any{"product": input.ProductID, "amount": json.Number(input.Quantity), "deliveryData": values, "externalId": input.Reference, "maxTotalPrice": json.Number(input.MaximumCost), "allowSplit": false}
	if !c.connection.nexus() {
		if !numericIDPattern.MatchString(input.ProductID) || !numericIDPattern.MatchString(input.Offer.ID) {
			return Order{}, ErrInvalid
		}
		quantity, e := input.Quantity.Rational()
		if e != nil || !quantity.IsInt() {
			return Order{}, ErrInvalid
		}
		body = map[string]any{"productId": json.Number(input.ProductID), "formId": json.Number(input.Offer.ID), "quantity": json.Number(input.Quantity), "deliveryData": values, "shopOrderId": input.Reference}
		path = "/api/orders"
	}
	if err = c.VerifySandbox(ctx); err != nil {
		return Order{}, err
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return Order{}, ErrInvalid
	}
	response, err := c.request(ctx, http.MethodPost, path, raw, maxOrderResponse)
	clear(raw)
	if err != nil {
		return Order{}, ErrAmbiguous
	}
	defer clear(response)
	result, err := c.decodeOrder(response)
	if err != nil || !Matches(result, input) {
		return Order{}, ErrAmbiguous
	}
	return result, nil
}

// Matches compares identity and amount before the caller may apply evidence.
// A changed/partial cost is retained for reconciliation, not silently rebilled.
func Matches(result Order, input PurchaseRequest) bool {
	quantity, err := result.Quantity.Rational()
	expected, e := input.Quantity.Rational()
	return err == nil && e == nil && result.Reference == input.Reference && result.ProductID == input.ProductID && quantity.Cmp(expected) == 0
}

// GetOrder only fetches a numeric supplier order on this exact connection.
func (c *Client) GetOrder(ctx context.Context, id string) (Order, error) {
	if !numericIDPattern.MatchString(id) {
		return Order{}, ErrInvalid
	}
	path := "/api/orders/"
	if c.connection.nexus() {
		path = "/api/v1/orders/"
	}
	raw, err := c.request(ctx, http.MethodGet, path+url.PathEscape(id), nil, maxOrderResponse)
	if err != nil {
		return Order{}, err
	}
	defer clear(raw)
	result, err := c.decodeOrder(raw)
	if err != nil || result.ID != id {
		return Order{}, ErrEvidence
	}
	return result, nil
}

// FindOrders searches bounded pages after an uncertain send. An empty result is
// NOT permission to retry; eventual visibility and failed-reference reuse exist.
func (c *Client) FindOrders(ctx context.Context, reference string, offset int) ([]Order, bool, error) {
	if !validReference(reference) || offset < 0 || offset > 100000 {
		return nil, false, ErrInvalid
	}
	path := "/api/orders?take=100&offset=" + strconv.Itoa(offset)
	if c.connection.nexus() {
		path = "/api/v1/orders?limit=100&offset=" + strconv.Itoa(offset)
	}
	raw, err := c.request(ctx, http.MethodGet, path, nil, 4<<20)
	if err != nil {
		return nil, false, err
	}
	defer clear(raw)
	var rows []json.RawMessage
	if decode(raw, &rows) != nil || len(rows) > 100 {
		return nil, false, ErrEvidence
	}
	out := []Order{}
	for _, row := range rows {
		entry, e := c.decodeOrder(row)
		if e != nil {
			return nil, false, e
		}
		if entry.Reference == reference {
			out = append(out, entry)
		}
	}
	return out, len(rows) == 100, nil
}

func (c *Client) decodeOrder(raw []byte) (Order, error) {
	var wire struct {
		ID            json.Number       `json:"id"`
		Product       string            `json:"product"`
		ProductID     json.Number       `json:"productId"`
		Reference     string            `json:"externalId"`
		ShopReference string            `json:"shopOrderId"`
		Amount        Decimal           `json:"amount"`
		Quantity      Decimal           `json:"quantity"`
		Total         Decimal           `json:"totalPrice"`
		Price         Decimal           `json:"price"`
		Status        string            `json:"status"`
		Requested     *Decimal          `json:"requestedQuantity"`
		Delivered     *Decimal          `json:"deliveredQuantity"`
		Split         json.RawMessage   `json:"split"`
		Linked        []json.RawMessage `json:"linkedOrders"`
		Keys          []DeliveredKey    `json:"cdKeys"`
		Key           string            `json:"cdkey"`
		Error         string            `json:"errorCode"`
		Reason        *struct {
			Type string `json:"type"`
		} `json:"cancellationReason"`
		UpdatedAt string `json:"updatedAt"`
	}
	if decode(raw, &wire) != nil || !numericIDPattern.MatchString(wire.ID.String()) || len(wire.Linked) > 0 || len(wire.Split) > 0 && string(wire.Split) != "null" {
		return Order{}, ErrEvidence
	}
	out := Order{ID: wire.ID.String(), ProductID: wire.Product, Reference: wire.Reference, Quantity: wire.Amount, Cost: wire.Total, Status: wire.Status, Keys: wire.Keys, Requested: wire.Requested, Delivered: wire.Delivered, Reason: wire.Error, UpdatedAt: wire.UpdatedAt}
	allowed := []string{"pending", "completed", "failed", "partially_completed"}
	if !c.connection.nexus() {
		out.ProductID = wire.ProductID.String()
		out.Reference = wire.ShopReference
		out.Quantity = wire.Quantity
		out.Cost = wire.Price
		out.Keys = []DeliveredKey{}
		if wire.Key != "" {
			out.Keys = append(out.Keys, DeliveredKey{Code: wire.Key})
		}
		if wire.Reason != nil {
			out.Reason = wire.Reason.Type
		}
		allowed = []string{"pending", "completed", "cancelled", "cancellation_requested"}
	}
	if !sourceID(out.ProductID) || !slices.Contains(allowed, out.Status) || !plain(out.Reference, 0, 240) || len(out.Keys) > 1000 || len(out.Reason) > 120 {
		return Order{}, ErrEvidence
	}
	quantity, err := out.Quantity.Rational()
	if err != nil || quantity.Sign() <= 0 {
		return Order{}, ErrEvidence
	}
	if _, err = out.Cost.Rational(); err != nil {
		return Order{}, ErrEvidence
	}
	if (out.Requested == nil) != (out.Delivered == nil) {
		return Order{}, ErrEvidence
	}
	if out.Requested != nil {
		requested, e1 := out.Requested.Rational()
		delivered, e2 := out.Delivered.Rational()
		if e1 != nil || e2 != nil || requested.Sign() <= 0 || delivered.Cmp(requested) > 0 {
			return Order{}, ErrEvidence
		}
		if out.Status == "partially_completed" && (delivered.Sign() <= 0 || delivered.Cmp(requested) >= 0) {
			return Order{}, ErrEvidence
		}
		if out.Status == "completed" && delivered.Cmp(requested) != 0 {
			return Order{}, ErrEvidence
		}
	} else if out.Status == "partially_completed" {
		return Order{}, ErrEvidence
	}
	for _, key := range out.Keys {
		if !plain(key.Code, 1, 8192) || len(key.CardNo) > 1024 || len(key.URL) > 2048 || len(key.ExpiresAt) > 80 {
			return Order{}, ErrEvidence
		}
	}
	return out, nil
}
