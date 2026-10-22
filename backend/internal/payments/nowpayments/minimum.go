package nowpayments

import (
	"context"
	"errors"
	"math/big"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// ErrBelowMinimum is a read-only preflight result; no invoice was requested.
var ErrBelowMinimum = errors.New("order below current provider minimum")

// Minimum is a validated exact minimum for the requested asset and fiat currency.
// Fiat is the provider's conversion at observation time, not a guaranteed quote.
type Minimum struct {
	Crypto Decimal
	Fiat   Decimal
}

// MinimumInvoice reads the merchant's configured settlement route without creating a payment.
func (c *Client) MinimumInvoice(ctx context.Context, input InvoiceRequest) (Minimum, error) {
	if !coinPattern.MatchString(input.PayCurrency) || (input.Currency != "USD" && input.Currency != "EUR" && input.Currency != "GBP") {
		return Minimum{}, ErrInvalid
	}
	query := url.Values{"currency_from": {input.PayCurrency}, "fiat_equivalent": {strings.ToLower(input.Currency)}, "is_fixed_rate": {strconv.FormatBool(input.FixedRate)}, "is_fee_paid_by_user": {strconv.FormatBool(input.FeePaidByUser)}}
	// Omit currency_to, as in the provider SDK, to use the merchant's configured
	// settlement route rather than inventing or changing its receiving currency.
	value, err := c.request(ctx, http.MethodGet, "/min-amount?"+query.Encode(), nil)
	if err != nil {
		return Minimum{}, ErrUnavailable
	}
	if code, ok := currencyCode(value["currency_from"]); !ok || code != input.PayCurrency {
		return Minimum{}, ErrEvidence
	}
	crypto, err := decimal(value["min_amount"])
	if err != nil {
		return Minimum{}, ErrEvidence
	}
	cryptoMinimum, err := crypto.Rational()
	if err != nil || cryptoMinimum.Sign() <= 0 {
		return Minimum{}, ErrEvidence
	}
	fiat, err := decimal(value["fiat_equivalent"])
	if err != nil {
		return Minimum{}, ErrEvidence
	}
	minimum, err := fiat.Rational()
	if err != nil || minimum.Sign() <= 0 {
		return Minimum{}, ErrEvidence
	}
	return Minimum{Crypto: crypto, Fiat: fiat}, nil
}

// CheckInvoice always performs a fresh check; selector caches cannot authorize a payment.
func (c *Client) CheckInvoice(ctx context.Context, input InvoiceRequest) error {
	if !minorPattern.MatchString(input.AmountMinor) {
		return ErrInvalid
	}
	minimum, err := c.MinimumInvoice(ctx, input)
	if err != nil {
		return err
	}
	return minimum.Check(input.AmountMinor)
}

// Check compares exact fiat values without rounding down a provider minimum.
func (m Minimum) Check(amountMinor string) error {
	if !minorPattern.MatchString(amountMinor) {
		return ErrInvalid
	}
	minimum, err := m.Fiat.Rational()
	if err != nil || minimum.Sign() <= 0 {
		return ErrEvidence
	}
	crypto, err := m.Crypto.Rational()
	if err != nil || crypto.Sign() <= 0 {
		return ErrEvidence
	}
	amount, err := Decimal(amountMinor).Rational()
	if err != nil {
		return ErrInvalid
	}
	amount.Quo(amount, big.NewRat(100, 1))
	if amount.Cmp(minimum) < 0 {
		return ErrBelowMinimum
	}
	return nil
}
