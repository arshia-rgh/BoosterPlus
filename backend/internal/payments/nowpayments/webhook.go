package nowpayments

import (
	"cmp"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"slices"
	"strconv"
	"unicode/utf16"
)

// Notice carries only a verified reference and a canonical signal digest for durable deduplication.
// No callback amount, status, customer information, or order ID is financial authority.
type Notice struct{ PaymentID, Digest string }

// VerifyWebhook checks the provider's recursively sorted JSON HMAC-SHA512 signature.
// The service must durably record the reference before acknowledging it, then fetch GetPayment.
func (c *Client) VerifyWebhook(body []byte, signature string) (Notice, error) {
	if len(signature) != 128 {
		return Notice{}, ErrSignature
	}
	actual, err := hex.DecodeString(signature)
	if err != nil {
		return Notice{}, ErrSignature
	}
	value, err := object(body)
	if err != nil {
		return Notice{}, ErrSignature
	}
	canonical, err := canonicalJSON(nil, value)
	if err != nil {
		return Notice{}, ErrSignature
	}
	mac := hmac.New(sha512.New, []byte(c.ipnSecret))
	if _, err = mac.Write(canonical); err != nil {
		return Notice{}, ErrSignature
	}
	if !hmac.Equal(actual, mac.Sum(nil)) {
		return Notice{}, ErrSignature
	}
	id, err := providerID(value["payment_id"])
	if err != nil {
		return Notice{}, ErrSignature
	}
	digest := sha256.Sum256(canonical)
	return Notice{id, hex.EncodeToString(digest[:])}, nil
}

// canonicalJSON matches JSON.stringify(sortObjectDeep(value)), including JavaScript's
// numeric-index property order and number formatting. Binary floats are used ONLY for
// signature bytes; API financial observations retain their original decimal tokens.
func canonicalJSON(dst []byte, value any) ([]byte, error) {
	switch v := value.(type) {
	case nil:
		return append(dst, "null"...), nil
	case bool:
		return strconv.AppendBool(dst, v), nil
	case string:
		return quote(dst, v), nil
	case json.Number:
		number, err := strconv.ParseFloat(string(v), 64)
		if err != nil {
			return nil, ErrEvidence
		}
		if number == 0 {
			return append(dst, '0'), nil
		}
		raw, err := json.Marshal(number)
		if err != nil {
			return nil, ErrEvidence
		}
		return append(dst, raw...), nil
	case []any:
		dst = append(dst, '[')
		for i, child := range v {
			if i > 0 {
				dst = append(dst, ',')
			}
			var err error
			dst, err = canonicalJSON(dst, child)
			if err != nil {
				return nil, err
			}
		}
		return append(dst, ']'), nil
	case map[string]any:
		keys := make([]string, 0, len(v))
		for key := range v {
			keys = append(keys, key)
		}
		slices.SortFunc(keys, compareKeys)
		dst = append(dst, '{')
		for i, key := range keys {
			if i > 0 {
				dst = append(dst, ',')
			}
			dst = quote(dst, key)
			dst = append(dst, ':')
			var err error
			dst, err = canonicalJSON(dst, v[key])
			if err != nil {
				return nil, err
			}
		}
		return append(dst, '}'), nil
	default:
		return nil, ErrEvidence
	}
}
func indexKey(key string) (uint64, bool) {
	value, err := strconv.ParseUint(key, 10, 32)
	return value, err == nil && value < 4294967295 && strconv.FormatUint(value, 10) == key
}
func compareKeys(a, b string) int {
	ai, aok := indexKey(a)
	bi, bok := indexKey(b)
	if aok && bok {
		return cmp.Compare(ai, bi)
	}
	if aok {
		return -1
	}
	if bok {
		return 1
	}
	// ECMAScript sorts object names by UTF-16 code units, not UTF-8 bytes.
	return slices.Compare(utf16.Encode([]rune(a)), utf16.Encode([]rune(b)))
}
func quote(dst []byte, text string) []byte {
	dst = append(dst, '"')
	for _, r := range text {
		switch r {
		case '"', '\\':
			dst = append(dst, '\\', byte(r))
		case '\b':
			dst = append(dst, `\b`...)
		case '\f':
			dst = append(dst, `\f`...)
		case '\n':
			dst = append(dst, `\n`...)
		case '\r':
			dst = append(dst, `\r`...)
		case '\t':
			dst = append(dst, `\t`...)
		default:
			if r < 32 {
				const digits = "0123456789abcdef"
				dst = append(dst, '\\', 'u', '0', '0', digits[r/16], digits[r%16])
			} else {
				dst = append(dst, string(r)...)
			}
		}
	}
	return append(dst, '"')
}
