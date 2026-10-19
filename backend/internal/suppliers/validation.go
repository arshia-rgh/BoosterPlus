package suppliers

import (
	"encoding/json"
	"regexp"
	"slices"
)

// ValidateQuantity enforces exact fractional bounds/steps from an imported offer.
func ValidateQuantity(rules Quantity, input Decimal) error {
	amount, err := input.Rational()
	if err != nil || amount.Sign() <= 0 {
		return ErrInvalid
	}
	if rules.Kind == "one" {
		if amount.RatString() != "1" {
			return ErrInvalid
		}
		return nil
	}
	if rules.Kind != "multiple" {
		return ErrInvalid
	}
	minimum, e1 := rules.Min.Rational()
	maximum, e2 := rules.Max.Rational()
	step, e3 := rules.Step.Rational()
	if e1 != nil || e2 != nil || e3 != nil || amount.Cmp(minimum) < 0 || maximum.Sign() > 0 && amount.Cmp(maximum) > 0 {
		return ErrInvalid
	}
	if step.Sign() > 0 && !amount.Quo(amount, step).IsInt() {
		return ErrInvalid
	}
	return nil
}

// ValidateFields applies RE2 (bounded-time) patterns on the server. It never
// evaluates a supplier's JavaScript/HTML or includes submitted values in errors.
func ValidateFields(fields []Field, values map[string]string) error {
	if len(values) > 64 || len(fields) > 64 {
		return ErrInvalid
	}
	allowed := map[string]bool{}
	for _, field := range fields {
		if !sourceID(field.ID) || allowed[field.ID] {
			return ErrInvalid
		}
		allowed[field.ID] = true
		value, exists := values[field.ID]
		if !exists || value == "" {
			if field.Required || field.Transient && exists {
				return ErrInvalid
			}
			continue
		}
		if !plain(value, 1, 4096) {
			return ErrInvalid
		}
		switch field.Kind {
		case "text":
			if len(field.Pattern) > 1000 {
				return ErrInvalid
			}
			if field.Pattern != "" {
				pattern, err := regexp.Compile(field.Pattern)
				if err != nil || !pattern.MatchString(value) {
					return ErrInvalid
				}
			}
		case "number":
			minimum, maximum, step := Decimal("0"), Decimal("0"), Decimal("0")
			if field.Min != nil {
				minimum = *field.Min
			}
			if field.Max != nil {
				maximum = *field.Max
			}
			if field.Step != nil {
				step = *field.Step
			}
			// Numeric identifiers may be zero; quantity validation separately requires positive amounts.
			number, err := Decimal(value).Rational()
			if err != nil {
				return ErrInvalid
			}
			minValue, e1 := minimum.Rational()
			maxValue, e2 := maximum.Rational()
			stepValue, e3 := step.Rational()
			if e1 != nil || e2 != nil || e3 != nil || number.Cmp(minValue) < 0 || field.Max != nil && number.Cmp(maxValue) > 0 {
				return ErrInvalid
			}
			if stepValue.Sign() > 0 && !number.Sub(number, minValue).Quo(number, stepValue).IsInt() {
				return ErrInvalid
			}
		case "select":
			if !slices.ContainsFunc(field.Options, func(option Option) bool { return option.ID == value }) {
				return ErrInvalid
			}
		case "image":
			// Only an already-scanned image uploaded by the server can become a supplier key.
			if !imageKeyPattern.MatchString(value) {
				return ErrInvalid
			}
		default:
			return ErrInvalid
		}
	}
	for key := range values {
		if !allowed[key] {
			return ErrInvalid
		}
	}
	raw, err := json.Marshal(values)
	if err != nil || len(raw) > 8192 {
		return ErrInvalid
	}
	return nil
}

var imageKeyPattern = regexp.MustCompile(`^images/[a-zA-Z0-9_-]{1,120}\.webp$`)

func deliveryData(fields []Field, values map[string]string) (map[string]any, error) {
	if err := ValidateFields(fields, values); err != nil {
		return nil, err
	}
	out := map[string]any{}
	for _, field := range fields {
		value, ok := values[field.ID]
		if !ok || value == "" {
			continue
		}
		if field.Kind == "number" {
			out[field.ID] = json.Number(value)
		} else {
			out[field.ID] = value
		}
	}
	return out, nil
}
