package suppliers

import (
	"bytes"
	"context"
	"encoding/json"
	"math/big"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// Quote is a fresh, non-binding read. Only Nexus can enforce MaximumCost at
// purchase time. Vendoria's read must never be represented as an atomic cap.
type Quote struct {
	Connection Connection
	Product    Product
	Offer      Offer
	Quantity   Decimal
	TotalCost  Decimal
}

// QuoteOffer refreshes the exact product/method and refuses changed delivery
// requirements. The caller must persist its commercial snapshot before payment;
// this method neither reserves supplier capacity nor authorizes a purchase.
func (c *Client) QuoteOffer(ctx context.Context, reviewed Product, offerID string, quantity Decimal) (Quote, error) {
	previous, ok := findOffer(reviewed, offerID)
	if !ok || !sourceID(reviewed.ID) || !sourceID(reviewed.GameID) || !sourceID(reviewed.CategoryID) || len(reviewed.ReviewIssues) > 0 || len(previous.ReviewIssues) > 0 || !previous.Available || ValidateQuantity(previous.Quantity, quantity) != nil {
		return Quote{}, ErrInvalid
	}
	var current Product
	var cost Decimal
	var err error
	if c.connection.nexus() {
		current, cost, err = c.nexusQuote(ctx, reviewed, quantity)
	} else {
		current, cost, err = c.vendoriaQuote(ctx, reviewed, offerID, quantity)
	}
	if err != nil {
		return Quote{}, err
	}
	next, ok := findOffer(current, offerID)
	if !ok || !next.Available || len(current.ReviewIssues) > 0 || len(next.ReviewIssues) > 0 || ValidateQuantity(next.Quantity, quantity) != nil {
		return Quote{}, ErrUnavailable
	}
	if !sameRequirements(reviewed, previous, current, next) {
		return Quote{}, ErrChanged
	}
	return Quote{c.connection, current, next, quantity, cost}, nil
}

func findOffer(product Product, id string) (Offer, bool) {
	for _, offer := range product.Offers {
		if offer.ID == id {
			return offer, true
		}
	}
	return Offer{}, false
}

func sameRequirements(first Product, a Offer, second Product, b Offer) bool {
	// Prices and cosmetic names/images may change; eligibility, instructions,
	// quantity and input semantics require a new reviewed publication.
	first.Name, second.Name, first.Icon, second.Icon = "", "", "", ""
	first.Offers, second.Offers = nil, nil
	a.Cost, b.Cost, a.Name, b.Name = "0", "0", "", ""
	x, e1 := json.Marshal(struct {
		Product Product
		Offer   Offer
	}{first, a})
	y, e2 := json.Marshal(struct {
		Product Product
		Offer   Offer
	}{second, b})
	return e1 == nil && e2 == nil && bytes.Equal(x, y)
}

func (c *Client) nexusQuote(ctx context.Context, reviewed Product, quantity Decimal) (Product, Decimal, error) {
	query := url.Values{"amount": {string(quantity)}, "include": {"metadata"}}
	raw, err := c.request(ctx, http.MethodGet, "/api/v1/products/"+url.PathEscape(reviewed.ID)+"?"+query.Encode(), nil, maxResponse)
	if err != nil {
		return Product{}, "", err
	}
	var wire struct {
		ID        string   `json:"id"`
		Available *Decimal `json:"availableAmount"`
		Quote     *struct {
			Amount   Decimal `json:"amount"`
			Fillable Decimal `json:"fillableAmount"`
			Total    Decimal `json:"totalPrice"`
			Parts    []struct {
				Amount Decimal `json:"amount"`
				Unit   Decimal `json:"unitPrice"`
				Total  Decimal `json:"totalPrice"`
			} `json:"parts"`
		} `json:"quote"`
	}
	if decode(raw, &wire) != nil || wire.ID != reviewed.ID || wire.Quote == nil || len(wire.Quote.Parts) != 1 {
		return Product{}, "", ErrEvidence
	}
	q := wire.Quote
	if !equalDecimal(q.Amount, quantity) || !equalDecimal(q.Fillable, quantity) {
		return Product{}, "", ErrUnavailable
	}
	if !equalDecimal(q.Parts[0].Amount, quantity) || !equalDecimal(q.Parts[0].Total, q.Total) {
		return Product{}, "", ErrEvidence
	}
	total, e1 := q.Total.Rational()
	unit, e2 := q.Parts[0].Unit.Rational()
	if e1 != nil || e2 != nil || total.Sign() <= 0 || unit.Sign() <= 0 {
		return Product{}, "", ErrEvidence
	}
	if wire.Available != nil {
		available, e := wire.Available.Rational()
		amount, quantityErr := quantity.Rational()
		if e != nil || quantityErr != nil || available.Cmp(amount) < 0 {
			return Product{}, "", ErrUnavailable
		}
	}
	// Parent identities come from the reviewed binding; the normalizer checks
	// the product's encoded hierarchy rather than inventing a different mapping.
	envelope, err := json.Marshal(map[string]any{
		"games":      []Game{{ID: reviewed.GameID, Name: "Reviewed game"}},
		"categories": []Category{{ID: reviewed.CategoryID, Name: "Reviewed category"}},
		"products":   []json.RawMessage{raw},
	})
	if err != nil {
		return Product{}, "", ErrEvidence
	}
	catalog, err := normalizeNexus(c.connection, envelope)
	if err != nil || len(catalog.Products) != 1 {
		return Product{}, "", ErrEvidence
	}
	return catalog.Products[0], q.Total, nil
}

func (c *Client) vendoriaQuote(ctx context.Context, reviewed Product, offerID string, quantity Decimal) (Product, Decimal, error) {
	for _, id := range []string{reviewed.ID, reviewed.CategoryID, reviewed.GameID, offerID} {
		if !numericIDPattern.MatchString(id) {
			return Product{}, "", ErrInvalid
		}
	}
	paths := []string{"/api/services/" + reviewed.GameID, "/api/categories/" + reviewed.CategoryID, "/api/forms/" + offerID, "/api/products/" + reviewed.ID}
	var values [4][]byte
	for i, path := range paths {
		raw, err := c.request(ctx, http.MethodGet, path, nil, maxResponse)
		if err != nil {
			return Product{}, "", err
		}
		values[i] = raw
	}
	var game vendoriaService
	var category vendoriaCategory
	var form vendoriaForm
	var product vendoriaProduct
	if decode(values[0], &game) != nil || decode(values[1], &category) != nil || decode(values[2], &form) != nil || decode(values[3], &product) != nil || strconv.FormatInt(game.ID, 10) != reviewed.GameID || strconv.FormatInt(category.ID, 10) != reviewed.CategoryID || strconv.FormatInt(form.ID, 10) != offerID || strconv.FormatInt(product.ID, 10) != reviewed.ID || category.ServiceID != game.ID || form.ServiceID != game.ID || product.CategoryID != category.ID {
		return Product{}, "", ErrEvidence
	}
	cost, ok := product.Prices[offerID]
	if !ok || game.Closed || form.Archived {
		return Product{}, "", ErrUnavailable
	}
	// This read refreshes exactly one method, not a partial catalog import.
	product.Prices = map[string]Decimal{offerID: cost}
	var err error
	values[3], err = json.Marshal(product)
	if err != nil {
		return Product{}, "", ErrEvidence
	}
	for i, raw := range values {
		values[i] = append(append([]byte{'['}, raw...), ']')
	}
	catalog, err := normalizeVendoria(c.connection, values)
	if err != nil || len(catalog.Products) != 1 {
		return Product{}, "", ErrEvidence
	}
	unit, e1 := cost.Rational()
	amount, e2 := quantity.Rational()
	if e1 != nil || e2 != nil || unit.Sign() <= 0 || !amount.IsInt() {
		return Product{}, "", ErrInvalid
	}
	total, err := exactDecimal(new(big.Rat).Mul(unit, amount))
	return catalog.Products[0], total, err
}

func equalDecimal(a, b Decimal) bool {
	x, e1 := a.Rational()
	y, e2 := b.Rational()
	return e1 == nil && e2 == nil && x.Cmp(y) == 0
}

func exactDecimal(value *big.Rat) (Decimal, error) {
	text := strings.TrimRight(strings.TrimRight(value.FloatString(18), "0"), ".")
	out := Decimal(text)
	parsed, err := out.Rational()
	if err != nil || value.Sign() <= 0 || parsed.Cmp(value) != 0 {
		return "", ErrEvidence
	}
	return out, nil
}

// CustomerPrice applies the reviewed markup to the fresh total without deriving
// and rounding a blended unit price. Exact unit overrides still multiply first.
func (q Quote) CustomerPrice(markupBPS int, overrideMinor string) (string, error) {
	if overrideMinor != "" {
		return Price(q.Offer.Cost, q.Quantity, markupBPS, overrideMinor)
	}
	return Price(q.TotalCost, "1", markupBPS, "")
}
