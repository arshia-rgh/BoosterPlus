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

// CheckInvoice checks the merchant-configured settlement route without changing
// wallets or creating an invoice. Minimums are dynamic, never a price increase.
func (c *Client) CheckInvoice(ctx context.Context, input InvoiceRequest) error {
	if !minorPattern.MatchString(input.AmountMinor) || !coinPattern.MatchString(input.PayCurrency) || (input.Currency != "USD" && input.Currency != "EUR" && input.Currency != "GBP") {
		return ErrInvalid
	}
	query := url.Values{"currency_from": {input.PayCurrency}, "fiat_equivalent": {strings.ToLower(input.Currency)}, "is_fixed_rate": {strconv.FormatBool(input.FixedRate)}, "is_fee_paid_by_user": {strconv.FormatBool(input.FeePaidByUser)}}
	// Omit currency_to, as in the provider SDK, to use the merchant's configured
	// settlement route rather than inventing or changing its receiving currency.
	value, err := c.request(ctx, http.MethodGet, "/min-amount?"+query.Encode(), nil)
	if err != nil {
		return ErrUnavailable
	}
	if value["currency_from"] != input.PayCurrency {
		return ErrEvidence
	}
	crypto, err := decimal(value["min_amount"])
	if err != nil {
		return ErrEvidence
	}
	cryptoMinimum, err := crypto.Rational()
	if err != nil || cryptoMinimum.Sign() <= 0 {
		return ErrEvidence
	}
	fiat, err := decimal(value["fiat_equivalent"])
	if err != nil {
		return ErrEvidence
	}
	minimum, err := fiat.Rational()
	if err != nil || minimum.Sign() <= 0 {
		return ErrEvidence
	}
	amount, err := Decimal(input.AmountMinor).Rational()
	if err != nil {
		return ErrInvalid
	}
	amount.Quo(amount, big.NewRat(100, 1))
	if amount.Cmp(minimum) < 0 {
		return ErrBelowMinimum
	}
	return nil
}
