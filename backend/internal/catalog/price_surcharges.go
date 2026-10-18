package catalog

import (
	"encoding/json"
	"fmt"
	"math/big"
)

// PriceSurcharge adds a bounded percentage of the same base to every matching
// preference. It never compounds with another surcharge or changes old rules.
type PriceSurcharge struct {
	Key   string          `json:"key"`
	Label string          `json:"label"`
	Kind  string          `json:"kind"`
	Value string          `json:"value"`
	Field string          `json:"field"`
	Rates []SelectionRate `json:"rates"`
	When  *Condition      `json:"when,omitempty"`
}

// SelectionRate prices an exact number of selected choices, never their names.
type SelectionRate struct {
	Count   int    `json:"count"`
	Percent string `json:"percent"`
}

func surchargePercent(value string) (*big.Rat, bool) {
	amount, ok := decimal(value)
	return amount, ok && amount.Sign() >= 0 && amount.Cmp(big.NewRat(10000, 1)) <= 0
}

func applySurcharges(base *big.Rat, rules []PriceSurcharge, answers Answers, fields map[string]Field) (*big.Rat, []PriceLine, bool) {
	total := new(big.Rat).Set(base)
	lines := []PriceLine{}
	for _, rule := range rules {
		if rule.When != nil && !matches(rule.When, answers, fields) {
			continue
		}
		value := rule.Value
		switch rule.Kind {
		case "percentage":
		case "selection_count":
			var selected []string
			if raw := answers[rule.Field]; len(raw) > 0 {
				if err := json.Unmarshal(raw, &selected); err != nil {
					return nil, nil, false
				}
			}
			if len(selected) == 0 {
				continue
			}
			value = ""
			for _, rate := range rule.Rates {
				if rate.Count == len(selected) {
					value = rate.Percent
					break
				}
			}
		default:
			return nil, nil, false
		}
		percent, ok := surchargePercent(value)
		if !ok {
			return nil, nil, false
		}
		before := rounded(total)
		addition := new(big.Rat).Quo(new(big.Rat).Mul(base, percent), big.NewRat(100, 1))
		total.Add(total, addition)
		if total.Cmp(big.NewRat(999999999999, 1)) > 0 {
			return nil, nil, false
		}
		lines = append(lines, PriceLine{rule.Key, rule.Label, new(big.Int).Sub(rounded(total), before).String()})
	}
	return total, lines, true
}

func validateSurcharges(rules []PriceSurcharge, fields map[string]Field, refs map[string]Reference, keys map[string]bool, path string, add func(string, string)) {
	for i, rule := range rules {
		p := fmt.Sprintf("%s.%d", path, i)
		if keys[rule.Key] || !keyPattern.MatchString(rule.Key) {
			add(p+".key", "Use a unique pricing rule key.")
		}
		keys[rule.Key] = true
		if !validText(rule.Label, 1, 120) {
			add(p+".label", "Use a customer-safe label of 1–120 characters.")
		}
		validateCondition(rule.When, fields, refs, p+".when", 0, add)
		switch rule.Kind {
		case "percentage":
			if _, ok := surchargePercent(rule.Value); !ok {
				add(p+".value", "Enter a percentage from 0 to 10,000.")
			}
			if rule.Field != "" || len(rule.Rates) > 0 {
				add(p+".kind", "Remove selection-count settings from this percentage surcharge.")
			}
		case "selection_count":
			field, exists := fields[rule.Field]
			if !exists || field.Stage != "estimate" || field.Type != "multiselect" || field.MaxSelections < 1 || field.MaxSelections > 30 {
				add(p+".field", "Choose an estimate-stage multi-select with a maximum of 1–30 selections.")
				continue
			}
			if rule.Value != "" {
				add(p+".value", "Use the selection-count rates instead of a single percentage.")
			}
			seen := map[int]bool{}
			for j, rate := range rule.Rates {
				rp := fmt.Sprintf("%s.rates.%d", p, j)
				if rate.Count < 1 || rate.Count > field.MaxSelections || seen[rate.Count] {
					add(rp+".count", "Use each selectable count once, within the field maximum.")
				}
				seen[rate.Count] = true
				if _, ok := surchargePercent(rate.Percent); !ok {
					add(rp+".percent", "Enter a percentage from 0 to 10,000.")
				}
			}
			for count := 1; count <= field.MaxSelections; count++ {
				if !seen[count] {
					add(p+".rates", "Set a rate for every count from 1 to the field maximum. No selection always adds zero.")
					break
				}
			}
		default:
			add(p+".kind", "Choose percentage or selection-count surcharge.")
		}
	}
}
