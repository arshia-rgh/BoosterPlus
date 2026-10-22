package nowpayments

import (
	"context"
	"encoding/json"
	"math/big"
	"net/http"
	"regexp"
	"strings"
)

var decimalPattern = regexp.MustCompile(`^(0|[1-9][0-9]{0,39})(\.[0-9]{1,40})?([eE][+-]?[0-9]{1,2})?$`)

// Decimal preserves a provider's exact nonnegative decimal representation.
// Its validated text can be stored without binary floating-point conversion.
type Decimal string

// Rational returns a new exact rational value; invalid externally constructed values are rejected.
func (d Decimal) Rational() (*big.Rat, error) {
	if !decimalPattern.MatchString(string(d)) {
		return nil, ErrEvidence
	}
	value, ok := new(big.Rat).SetString(string(d))
	if !ok {
		return nil, ErrEvidence
	}
	return value, nil
}
func decimal(value any) (Decimal, error) {
	var text string
	switch v := value.(type) {
	case string:
		text = v
	case json.Number:
		text = string(v)
	default:
		return "", ErrEvidence
	}
	result := Decimal(text)
	_, err := result.Rational()
	return result, err
}

// Payment is an authoritative API observation, not an order-settlement decision.
// The service layer must match every commercial/asset identifier and allocate receipts transactionally.
// OutcomeAmount is denominated in OutcomeCurrency, never implicitly in PriceCurrency.
type Payment struct {
	Destination     *Destination
	ID              string
	InvoiceID       string
	AttemptID       string
	Status          string
	PriceAmount     Decimal
	PriceCurrency   string
	PayAmount       Decimal
	ActuallyPaid    Decimal
	PayCurrency     string
	OutcomeAmount   *Decimal
	OutcomeCurrency string
	Network         string
	PayinHash       string
	PayoutHash      string
}

// GetPayment re-reads the exact payment ID from the authenticated provider API.
func (c *Client) GetPayment(ctx context.Context, id string) (Payment, error) {
	if _, err := providerID(id); err != nil {
		return Payment{}, ErrInvalid
	}
	v, err := c.request(ctx, http.MethodGet, "/payment/"+id, nil)
	if err != nil {
		return Payment{}, err
	}
	p, err := payment(v)
	if err != nil || p.ID != id {
		return Payment{}, ErrEvidence
	}
	p.Destination, err = destination(v)
	return p, err
}
func payment(v map[string]any) (Payment, error) {
	var p Payment
	var err error
	p.ID, err = providerID(v["payment_id"])
	if err != nil {
		return p, err
	}
	p.InvoiceID, err = providerID(v["invoice_id"])
	if err != nil {
		return p, err
	}
	p.AttemptID, err = boundedText(v["order_id"], 36)
	if err != nil || p.AttemptID == "" {
		return p, ErrEvidence
	}
	p.Status, err = boundedText(v["payment_status"], 32)
	if err != nil {
		return p, err
	}
	switch p.Status {
	case "waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "refunded", "expired", "cancelled", "canceled":
	default:
		return p, ErrEvidence
	}
	p.PriceAmount, err = decimal(v["price_amount"])
	if err != nil {
		return p, err
	}
	p.PayAmount, err = decimal(v["pay_amount"])
	if err != nil {
		return p, err
	}
	p.ActuallyPaid, err = decimal(v["actually_paid"])
	if err != nil {
		return p, err
	}
	p.PriceCurrency, err = boundedText(v["price_currency"], 3)
	p.PriceCurrency = strings.ToLower(p.PriceCurrency)
	if err != nil {
		return p, err
	}
	if p.PriceCurrency != "usd" && p.PriceCurrency != "eur" && p.PriceCurrency != "gbp" {
		return p, ErrEvidence
	}
	p.PayCurrency, err = boundedText(v["pay_currency"], 32)
	p.PayCurrency = strings.ToLower(p.PayCurrency)
	if err != nil || !coinPattern.MatchString(p.PayCurrency) {
		return p, ErrEvidence
	}
	if raw, exists := v["outcome_amount"]; exists && raw != nil {
		d, e := decimal(raw)
		if e != nil {
			return p, e
		}
		p.OutcomeAmount = &d
	}
	p.OutcomeCurrency, err = boundedText(v["outcome_currency"], 32)
	p.OutcomeCurrency = strings.ToLower(p.OutcomeCurrency)
	if err != nil {
		return p, err
	}
	if p.OutcomeCurrency != "" && !coinPattern.MatchString(p.OutcomeCurrency) {
		return p, ErrEvidence
	}
	p.Network, err = boundedText(v["network"], 64)
	p.Network = strings.ToLower(p.Network)
	if err != nil {
		return p, err
	}
	p.PayinHash, err = boundedText(v["payin_hash"], 256)
	if err != nil {
		return p, err
	}
	p.PayoutHash, err = boundedText(v["payout_hash"], 256)
	if err != nil {
		return p, err
	}
	return p, nil
}
func boundedText(value any, limit int) (string, error) {
	if value == nil {
		return "", nil
	}
	text, ok := value.(string)
	if !ok || len(text) > limit || strings.ContainsAny(text, "\x00\r\n") {
		return "", ErrEvidence
	}
	return text, nil
}
