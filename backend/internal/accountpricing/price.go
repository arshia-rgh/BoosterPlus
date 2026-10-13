// Package accountpricing calculates immutable account-sale commissions without floating point.
package accountpricing

import (
	"errors"
	"math/big"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

// Version identifies the prospective 5% buyer / 10% seller agreement.
const Version = "account_commission_v1"

// ErrInvalid rejects unsupported prices, quotes and altered fee snapshots.
var ErrInvalid = errors.New("invalid account commission")

const maximumMinor int64 = 999999999999

var minorPattern = regexp.MustCompile(`^[1-9][0-9]{0,11}$`)
var ratePattern = regexp.MustCompile(`^(0|[1-9][0-9]{0,11})(\.[0-9]{1,18})?$`)

// Buyer is public: both the fee and the complete checkout amount are fixed at reservation.
type Buyer struct {
	Version    string `json:"version"`
	BaseMinor  string `json:"base_minor"`
	FeeMinor   string `json:"fee_minor"`
	TotalMinor string `json:"total_minor"`
}

// Seller is private and fixes the accepted net, conversion basis and exact crypto units.
type Seller struct {
	Version    string    `json:"version"`
	BaseMinor  string    `json:"base_minor"`
	FeeMinor   string    `json:"fee_minor"`
	NetMinor   string    `json:"net_minor"`
	Rate       string    `json:"rate"`
	RateSource string    `json:"rate_source"`
	QuotedAt   time.Time `json:"quoted_at"`
	NetAmount  string    `json:"net_amount"`
}

func baseAmount(base string) (int64, error) {
	if !minorPattern.MatchString(base) {
		return 0, ErrInvalid
	}
	value, err := strconv.ParseInt(base, 10, 64)
	if err != nil || value > maximumMinor {
		return 0, ErrInvalid
	}
	return value, nil
}

// BuyerPrice rounds the 5% fee independently to cents, with halves rounded upward.
func BuyerPrice(base string) (Buyer, error) {
	value, err := baseAmount(base)
	if err != nil {
		return Buyer{}, err
	}
	fee := (value*5 + 50) / 100
	if value+fee > maximumMinor {
		return Buyer{}, ErrInvalid
	}
	return Buyer{Version, base, strconv.FormatInt(fee, 10), strconv.FormatInt(value+fee, 10)}, nil
}

// Valid requires the exact current fee and charged total, not caller-supplied arithmetic.
func (b Buyer) Valid(currency, total string) bool {
	want, err := BuyerPrice(b.BaseMinor)
	return err == nil && b == want && currency == "USD" && total == want.TotalMinor
}

// SellerPrice fixes the 10% fee and converts the USD net using crypto units per USD.
// Crypto is rounded upward to six decimal places, favoring the seller; that exact
// amount is disclosed before acceptance and is never reduced by outgoing fees.
func SellerPrice(base, rate, source string, at time.Time) (Seller, error) {
	value, err := baseAmount(base)
	if err != nil || !ratePattern.MatchString(rate) || !utf8.ValidString(source) || strings.TrimSpace(source) != source || utf8.RuneCountInString(source) < 3 || utf8.RuneCountInString(source) > 200 || strings.ContainsRune(source, 0) || at.IsZero() {
		return Seller{}, ErrInvalid
	}
	ratio, ok := new(big.Rat).SetString(rate)
	if !ok || ratio.Sign() <= 0 {
		return Seller{}, ErrInvalid
	}
	fee := (value*10 + 50) / 100
	net := value - fee
	units := new(big.Rat).Mul(ratio, big.NewRat(net*10000, 1))
	rounded, remainder := new(big.Int), new(big.Int)
	rounded.QuoRem(units.Num(), units.Denom(), remainder)
	if remainder.Sign() > 0 {
		rounded.Add(rounded, big.NewInt(1))
	}
	amount := new(big.Rat).SetFrac(rounded, big.NewInt(1000000)).FloatString(6)
	return Seller{Version, base, strconv.FormatInt(fee, 10), strconv.FormatInt(net, 10), rate, source, at.UTC(), amount}, nil
}

// Valid checks a stored immutable quote without imposing new timing on old agreements.
func (s Seller) Valid(amount string) bool {
	want, err := SellerPrice(s.BaseMinor, s.Rate, s.RateSource, s.QuotedAt)
	return err == nil && s.Version == want.Version && s.FeeMinor == want.FeeMinor && s.NetMinor == want.NetMinor && s.NetAmount == want.NetAmount && amount == want.NetAmount
}
