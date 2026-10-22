package nowpayments

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"math"
	"strconv"
	"strings"
	"unicode/utf8"
)

// object rejects duplicate keys, trailing values, oversized or excessively nested JSON.
// Numbers remain exact decimal tokens until a caller explicitly chooses signature canonicalization.
func object(raw []byte) (map[string]any, error) {
	value, err := jsonValue(raw)
	if err != nil {
		return nil, err
	}
	result, ok := value.(map[string]any)
	if !ok || result == nil {
		return nil, ErrEvidence
	}
	return result, nil
}
func jsonValue(raw []byte) (any, error) {
	return jsonValueLimit(raw, maxBody)
}
func jsonValueLimit(raw []byte, maximum int) (any, error) {
	if len(raw) == 0 || len(raw) > maximum || !utf8.Valid(raw) {
		return nil, ErrEvidence
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	value, err := readValue(decoder, 0)
	if err != nil {
		return nil, ErrEvidence
	}
	if _, err = decoder.Token(); !errors.Is(err, io.EOF) {
		return nil, ErrEvidence
	}
	return value, nil
}

func readValue(d *json.Decoder, depth int) (any, error) {
	if depth > 16 {
		return nil, ErrEvidence
	}
	token, err := d.Token()
	if err != nil {
		return nil, ErrEvidence
	}
	switch value := token.(type) {
	case json.Delim:
		switch value {
		case '{':
			result := map[string]any{}
			for d.More() {
				keyToken, e := d.Token()
				if e != nil {
					return nil, ErrEvidence
				}
				key, ok := keyToken.(string)
				if !ok || key == "__proto__" || key == "constructor" || key == "prototype" {
					// These names have special behavior in JavaScript object construction; reject ambiguous cross-language payloads.
					return nil, ErrEvidence
				}
				if _, exists := result[key]; exists {
					return nil, ErrEvidence
				}
				child, e := readValue(d, depth+1)
				if e != nil {
					return nil, e
				}
				result[key] = child
			}
			end, e := d.Token()
			if e != nil || end != json.Delim('}') {
				return nil, ErrEvidence
			}
			return result, nil
		case '[':
			result := []any{}
			for d.More() {
				child, e := readValue(d, depth+1)
				if e != nil {
					return nil, e
				}
				result = append(result, child)
			}
			end, e := d.Token()
			if e != nil || end != json.Delim(']') {
				return nil, ErrEvidence
			}
			return result, nil
		default:
			return nil, ErrEvidence
		}
	case json.Number:
		if len(value) > 128 {
			return nil, ErrEvidence
		}
		number, e := strconv.ParseFloat(string(value), 64)
		if e != nil || math.IsInf(number, 0) || math.IsNaN(number) {
			return nil, ErrEvidence
		}
		return value, nil
	case string, bool, nil:
		return value, nil
	default:
		return nil, ErrEvidence
	}
}
func providerID(value any) (string, error) {
	var id string
	switch v := value.(type) {
	case string:
		id = v
	case json.Number:
		id = string(v)
		// JSON numeric IDs must survive the provider's JavaScript signature representation exactly.
		integer, e := strconv.ParseUint(id, 10, 64)
		if e != nil || integer > 9007199254740991 {
			return "", ErrEvidence
		}
	default:
		return "", ErrEvidence
	}
	if len(id) == 0 || len(id) > 20 || id[0] == '0' || strings.Trim(id, "0123456789") != "" {
		return "", ErrEvidence
	}
	return id, nil
}
