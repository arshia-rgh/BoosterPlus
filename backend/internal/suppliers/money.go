// Package suppliers implements environment-bound supplier contracts. It cannot
// allocate customer payments or decide that an order is eligible for fulfillment.
package suppliers

import (
	"encoding/json"
	"math/big"
	"regexp"
	"strconv"
	"strings"
)

var decimalPattern = regexp.MustCompile(`^(0|[1-9][0-9]{0,11})(\.[0-9]{1,18})?([eE][+-]?[0-9]{1,2})?$`)
var minorPattern = regexp.MustCompile(`^[1-9][0-9]{0,11}$`)

// Decimal retains supplier precision without an intermediate float64.
type Decimal string

// Rational rejects negative, nonfinite, excessively precise and huge numbers.
func (d Decimal) Rational() (*big.Rat, error) {
	if !decimalPattern.MatchString(string(d)) {
		return nil, ErrInvalid
	}
	if parts := strings.FieldsFunc(string(d), func(r rune) bool { return r == 'e' || r == 'E' }); len(parts) == 2 {
		exponent, err := strconv.Atoi(parts[1])
		if err != nil || exponent < -18 || exponent > 18 {
			return nil, ErrInvalid
		}
	}
	value, ok := new(big.Rat).SetString(string(d))
	if !ok || value.Sign() < 0 || value.Cmp(big.NewRat(999999999999, 1)) > 0 {
		return nil, ErrInvalid
	}
	return value, nil
}

// UnmarshalJSON accepts provider numbers or decimal strings, never null.
func (d *Decimal) UnmarshalJSON(raw []byte) error {
	var text string
	if len(raw) > 0 && raw[0] == '"' {
		if err := json.Unmarshal(raw, &text); err != nil {
			return ErrInvalid
		}
	} else {
		text = string(raw)
	}
	value := Decimal(text)
	if _, err := value.Rational(); err != nil {
		return err
	}
	*d = value
	return nil
}

// MarshalJSON stores decimals as strings so database JSON and browser parsers
// cannot round them. The supplier request boundary explicitly uses json.Number.
func (d Decimal) MarshalJSON() ([]byte, error) {
	if _, err := d.Rational(); err != nil {
		return nil, err
	}
	return json.Marshal(string(d))
}

// DefaultMarkupBPS is the owner's 15% markup, expressed in basis points.
const DefaultMarkupBPS = 1500

// Price computes a total in USD cents, rounding half up only after quantity and
// markup. An override is an exact unit price in cents and supersedes the markup.
func Price(cost, quantity Decimal, markupBPS int, overrideMinor string) (string, error) {
	base, err := cost.Rational()
	if err != nil || base.Sign() <= 0 || markupBPS < 0 || markupBPS > 100000 {
		return "", ErrInvalid
	}
	amount, err := quantity.Rational()
	if err != nil || amount.Sign() <= 0 {
		return "", ErrInvalid
	}
	if overrideMinor != "" {
		if !minorPattern.MatchString(overrideMinor) {
			return "", ErrInvalid
		}
		cents, ok := new(big.Int).SetString(overrideMinor, 10)
		if !ok {
			return "", ErrInvalid
		}
		base.SetFrac(cents, big.NewInt(100))
	} else {
		base.Mul(base, big.NewRat(int64(10000+markupBPS), 10000))
	}
	base.Mul(base, amount)
	base.Mul(base, big.NewRat(100, 1))
	quotient, remainder := new(big.Int), new(big.Int)
	quotient.QuoRem(base.Num(), base.Denom(), remainder)
	if remainder.Lsh(remainder, 1).Cmp(base.Denom()) >= 0 {
		quotient.Add(quotient, big.NewInt(1))
	}
	if !minorPattern.MatchString(quotient.String()) {
		return "", ErrInvalid
	}
	return quotient.String(), nil
}
