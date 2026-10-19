package suppliers

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"unicode/utf8"
)

// decode rejects duplicate keys and trailing values rather than allowing
// security-significant fields to have different interpretations across parsers.
func decode(raw []byte, destination any) error {
	if len(raw) == 0 || len(raw) > maxResponse || !utf8.Valid(raw) {
		return ErrEvidence
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.UseNumber()
	remaining := 2000000
	if err := checkJSON(d, 0, &remaining); err != nil {
		return err
	}
	if _, err := d.Token(); !errors.Is(err, io.EOF) {
		return ErrEvidence
	}
	if json.Unmarshal(raw, destination) != nil {
		return ErrEvidence
	}
	return nil
}
func checkJSON(d *json.Decoder, depth int, remaining *int) error {
	*remaining--
	if depth > 32 || *remaining < 0 {
		return ErrEvidence
	}
	token, err := d.Token()
	if err != nil {
		return ErrEvidence
	}
	delim, ok := token.(json.Delim)
	if !ok {
		return nil
	}
	if delim != '{' && delim != '[' {
		return ErrEvidence
	}
	seen := map[string]bool{}
	for d.More() {
		if delim == '{' {
			keyToken, e := d.Token()
			if e != nil {
				return ErrEvidence
			}
			key, isString := keyToken.(string)
			folded := strings.ToLower(key)
			if !isString || seen[folded] || folded == "__proto__" || folded == "constructor" || folded == "prototype" {
				return ErrEvidence
			}
			seen[folded] = true
		}
		if err = checkJSON(d, depth+1, remaining); err != nil {
			return err
		}
	}
	end, err := d.Token()
	if err != nil || delim == '{' && end != json.Delim('}') || delim == '[' && end != json.Delim(']') {
		return ErrEvidence
	}
	return nil
}
