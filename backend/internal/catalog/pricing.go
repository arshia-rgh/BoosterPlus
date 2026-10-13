package catalog

import (
	"encoding/json"
	"fmt"
	"math/big"
	"slices"
	"time"
)

// PricePlan is immutable with its form release. Amounts are exact minor-unit
// decimals; rounding occurs only after all adjustments and bounds.
type PricePlan struct {
	Currency     string      `json:"currency"`
	BaseMinor    string      `json:"base_minor"`
	MinimumMinor string      `json:"minimum_minor"`
	MaximumMinor string      `json:"maximum_minor"`
	Rules        []PriceRule `json:"rules"`
	Cases        []PriceCase `json:"cases"`
}

// PriceRule is a bounded operation, never an expression or executable program.
// Rank intervals price the complete transition from one rank to the next.
type PriceRule struct {
	Key       string      `json:"key"`
	Label     string      `json:"label"`
	Kind      string      `json:"kind"`
	Value     string      `json:"value"`
	Field     string      `json:"field"`
	From      string      `json:"from"`
	To        string      `json:"to"`
	FromUnits string      `json:"from_units"`
	ToUnits   string      `json:"to_units"`
	Intervals []RankPrice `json:"intervals"`
	When      *Condition  `json:"when,omitempty"`
}

// RankPrice identifies an adjacent transition by its starting rank key.
type RankPrice struct {
	Rank        string `json:"rank"`
	AmountMinor string `json:"amount_minor"`
}

// PriceCase stores nonsensitive synthetic selections and an expected result.
type PriceCase struct {
	Key         string  `json:"key"`
	Answers     Answers `json:"answers"`
	Outcome     string  `json:"outcome"`
	AmountMinor string  `json:"amount_minor"`
}

// PriceLine uses differences between rounded running totals so displayed lines
// reconcile exactly. These presentation amounts never feed back into arithmetic.
type PriceLine struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	AmountMinor string `json:"amount_minor"`
}

// Estimate never authorizes a payment. A later accepted administrator quote does.
type Estimate struct {
	Discount      *Discount `json:"discount,omitempty"`
	exactSubtotal *big.Rat
	ReleaseID     string      `json:"release_id"`
	Version       int         `json:"version"`
	Evaluator     string      `json:"evaluator"`
	ExpiresAt     time.Time   `json:"expires_at"`
	Outcome       string      `json:"outcome"`
	Currency      string      `json:"currency"`
	AmountMinor   string      `json:"amount_minor"`
	Answers       Answers     `json:"answers"`
	Lines         []PriceLine `json:"lines"`
	Issues        []Issue     `json:"issues"`
}

func rounded(n *big.Rat) *big.Int {
	// Half up for nonnegative money. Rules may subtract but totals cannot be negative.
	numerator := new(big.Int).Mul(n.Num(), big.NewInt(2))
	numerator.Add(numerator, n.Denom())
	return numerator.Quo(numerator, new(big.Int).Mul(n.Denom(), big.NewInt(2)))
}

// Calculate preserves validation of historical answers and published price cases.
// New customer selections must use CalculateNew instead.
func Calculate(release Release, serviceKey string, submitted Answers, now time.Time) Estimate {
	return calculate(release, serviceKey, ValidateAnswers(release.Configuration, serviceKey, "estimate", submitted, nil), now)
}

// CalculateNew validates current selection rules before evaluating a plan.
func CalculateNew(release Release, serviceKey string, submitted Answers, now time.Time) Estimate {
	return calculate(release, serviceKey, ValidateNewAnswers(release.Configuration, serviceKey, "estimate", submitted, nil), now)
}

func calculate(release Release, serviceKey string, validated Validation, now time.Time) Estimate {
	result := Estimate{ReleaseID: release.ID, Version: release.Version, ExpiresAt: now.UTC().Add(15 * time.Minute), Outcome: "invalid", Lines: []PriceLine{}, Issues: []Issue{}}
	result.Answers, result.Issues = validated.Answers, validated.Issues
	if len(result.Issues) > 0 {
		return result
	}
	index := slices.IndexFunc(release.Configuration.Services, func(s ServiceDefinition) bool { return s.Key == serviceKey })
	if index < 0 {
		return result
	}
	service := release.Configuration.Services[index]
	result.Evaluator = service.Evaluator
	result.Outcome, result.Currency, result.AmountMinor, result.Lines, result.exactSubtotal = evaluatePrice(release.Configuration, service, result.Answers)
	return result
}

func evaluatePrice(c Configuration, service ServiceDefinition, answers Answers) (string, string, string, []PriceLine, *big.Rat) {
	manual := func() (string, string, string, []PriceLine, *big.Rat) {
		return "manual_review", "", "", []PriceLine{}, nil
	}
	if service.Evaluator != "pricing-v1" || service.Pricing == nil {
		return manual()
	}
	// An old numeric win-rate rule cannot price a new range or comparison. Keep
	// its published rule immutable and request a quote instead of dropping its
	// surcharge when the old numeric comparison cannot match the richer answer.
	for _, field := range service.Fields {
		if field.Type != "decimal" || !IsWinRateField(field) || !validWinRate(answerString(answers[field.Key])) {
			continue
		}
		for _, rule := range service.Pricing.Rules {
			if rule.Field == field.Key || slices.Contains(conditionFields(rule.When), field.Key) {
				return manual()
			}
		}
	}
	plan := service.Pricing
	total, ok := decimal(plan.BaseMinor)
	if !ok || total.Sign() < 0 {
		return manual()
	}
	lines := []PriceLine{{"base", "Base price", rounded(total).String()}}
	fields := fieldMap(service.Fields)
	for _, rule := range plan.Rules {
		if rule.When != nil && !matches(rule.When, answers, fields) {
			continue
		}
		before := rounded(total)
		value, valid := decimal(rule.Value)
		switch rule.Kind {
		case "manual_review":
			return manual()
		case "fixed":
			if !valid || value.Sign() < 0 {
				return manual()
			}
			total.Add(total, value)
		case "per_unit":
			count, found := decimal(answerString(answers[rule.Field]))
			if !valid || value.Sign() < 0 || !found || count.Sign() < 0 {
				return manual()
			}
			total.Add(total, new(big.Rat).Mul(value, count))
		case "percentage":
			if !valid || value.Cmp(big.NewRat(-100, 1)) < 0 {
				return manual()
			}
			total.Mul(total, new(big.Rat).Add(big.NewRat(1, 1), new(big.Rat).Quo(value, big.NewRat(100, 1))))
		case "multiplier":
			if !valid || value.Sign() <= 0 {
				return manual()
			}
			total.Mul(total, value)
		case "rank_interval":
			amount, found := rankAmount(c, fields, rule, answers)
			if !found {
				return manual()
			}
			total.Add(total, amount)
		default:
			return manual()
		}
		if total.Sign() < 0 || total.Cmp(big.NewRat(999999999999, 1)) > 0 {
			return manual()
		}
		lines = append(lines, PriceLine{rule.Key, rule.Label, new(big.Int).Sub(rounded(total), before).String()})
	}
	lower, a := decimal(plan.MinimumMinor)
	upper, b := decimal(plan.MaximumMinor)
	if !a || !b || lower.Sign() <= 0 || lower.Cmp(upper) > 0 {
		return manual()
	}
	before := rounded(total)
	if total.Cmp(lower) < 0 {
		total.Set(lower)
	}
	if total.Cmp(upper) > 0 {
		total.Set(upper)
	}
	if delta := new(big.Int).Sub(rounded(total), before); delta.Sign() != 0 {
		lines = append(lines, PriceLine{"bounds", "Configured price bounds", delta.String()})
	}
	return "estimated", plan.Currency, rounded(total).String(), lines, total
}

func rankAmount(c Configuration, fields map[string]Field, rule PriceRule, answers Answers) (*big.Rat, bool) {
	refIndex := slices.IndexFunc(c.References, func(r Reference) bool { return r.Key == fields[rule.From].Reference && r.Kind == "rank" })
	if refIndex < 0 {
		return nil, false
	}
	options := c.References[refIndex].Options
	start := slices.IndexFunc(options, func(o Option) bool { return o.Key == answerString(answers[rule.From]) })
	end := slices.IndexFunc(options, func(o Option) bool { return o.Key == answerString(answers[rule.To]) })
	if start < 0 || end < start {
		return nil, false
	}
	startUnits, endUnits := big.NewRat(0, 1), big.NewRat(0, 1)
	for key, target := range map[string]*big.Rat{rule.FromUnits: startUnits, rule.ToUnits: endUnits} {
		if key == "" {
			continue
		}
		n, ok := decimal(answerString(answers[key]))
		if !ok || !n.IsInt() || n.Sign() < 0 {
			return nil, false
		}
		target.Set(n)
	}
	for _, position := range []struct {
		option Option
		units  *big.Rat
	}{{options[start], startUnits}, {options[end], endUnits}} {
		if position.option.UnitStart != nil && rule.FromUnits != "" {
			position.units.Sub(position.units, big.NewRat(int64(*position.option.UnitStart), 1))
			if position.units.Sign() < 0 || position.units.Cmp(big.NewRat(int64(position.option.Units), 1)) >= 0 {
				return nil, false
			}
		}
	}
	if startUnits.Cmp(big.NewRat(int64(options[start].Units), 1)) > 0 || endUnits.Cmp(big.NewRat(int64(options[end].Units), 1)) > 0 {
		return nil, false
	}
	if start == end && endUnits.Cmp(startUnits) <= 0 {
		return nil, false
	}
	total := big.NewRat(0, 1)
	for i := start; i <= end; i++ {
		if i == end && endUnits.Sign() == 0 {
			break
		}
		index := slices.IndexFunc(rule.Intervals, func(p RankPrice) bool { return p.Rank == options[i].Key })
		if index < 0 {
			return nil, false
		}
		price, ok := decimal(rule.Intervals[index].AmountMinor)
		if !ok || price.Sign() < 0 {
			return nil, false
		}
		fraction := big.NewRat(1, 1)
		if rule.FromUnits != "" || rule.ToUnits != "" {
			units := big.NewRat(int64(options[i].Units), 1)
			if units.Sign() <= 0 {
				return nil, false
			}
			count := new(big.Rat).Set(units)
			if i == end {
				count.Set(endUnits)
			}
			if i == start {
				count.Sub(count, startUnits)
			}
			fraction.Quo(count, units)
		}
		total.Add(total, new(big.Rat).Mul(price, fraction))
	}
	return total, true
}

func validatePricing(service ServiceDefinition, refs map[string]Reference, path string, publish bool, add func(string, string)) {
	plan := service.Pricing
	if plan == nil {
		if service.Evaluator == "pricing-v1" {
			add(path, "Configure a pricing plan for this evaluator.")
		}
		return
	}
	if service.Evaluator != "pricing-v1" {
		add(path, "Remove the pricing plan or choose the pricing evaluator.")
	}
	if len(plan.Rules) > 40 || len(plan.Cases) > 30 {
		add(path, "Pricing supports up to 40 operations and 30 saved cases.")
		return
	}
	for _, rule := range plan.Rules {
		if len(rule.Intervals) > 300 || !validConditionShape(rule.When) {
			add(path, "Pricing structure exceeds supported bounds.")
			return
		}
	}
	for _, example := range plan.Cases {
		if len(example.Answers) > 40 {
			add(path, "Too many saved answers.")
			return
		}
	}
	if !publish {
		return
	}
	lower, a := decimal(plan.MinimumMinor)
	upper, b := decimal(plan.MaximumMinor)
	base, d := decimal(plan.BaseMinor)
	if !slices.Contains([]string{"USD", "EUR", "GBP"}, plan.Currency) {
		add(path+".currency", "Choose USD, EUR or GBP for these estimates.")
	}
	if !d || base.Sign() < 0 {
		add(path+".base_minor", "Enter a nonnegative base price.")
	}
	if !a || lower.Sign() <= 0 || !lower.IsInt() {
		add(path+".minimum_minor", "Enter a positive minimum price with no more than two currency decimal places.")
	}
	if !b || upper.Sign() <= 0 || !upper.IsInt() || a && lower.Cmp(upper) > 0 {
		add(path+".maximum_minor", "Enter a positive maximum price of at least the minimum, with no more than two currency decimal places.")
	}
	fields := fieldMap(service.Fields)
	keys := map[string]bool{"base": true, "bounds": true}
	for i, rule := range plan.Rules {
		rp := fmt.Sprintf("%s.rules.%d", path, i)
		if keys[rule.Key] || !keyPattern.MatchString(rule.Key) {
			add(rp+".key", "Use a unique pricing rule key.")
		}
		if !validText(rule.Label, 1, 120) {
			add(rp+".label", "Use a customer-safe price breakdown label of 1–120 characters.")
		}
		keys[rule.Key] = true
		if !validConditionShape(rule.When) {
			add(rp+".when", "Pricing condition exceeds supported bounds.")
			continue
		}
		validateCondition(rule.When, fields, refs, rp+".when", 0, add)
		value, ok := decimal(rule.Value)
		switch rule.Kind {
		case "fixed", "per_unit", "percentage", "multiplier":
			if !ok || (rule.Kind != "percentage" && value.Sign() < 0) || (rule.Kind == "percentage" && (value.Cmp(big.NewRat(-100, 1)) < 0 || value.Cmp(big.NewRat(10000, 1)) > 0)) || (rule.Kind == "multiplier" && (value.Sign() <= 0 || value.Cmp(big.NewRat(100, 1)) > 0)) {
				add(rp+".value", "Use a bounded exact amount, percentage (-100–10,000), or multiplier (greater than zero, at most 100).")
			}
			if rule.Kind == "per_unit" {
				field, exists := fields[rule.Field]
				if !exists || field.Stage != "estimate" || IsWinRateField(field) || !slices.Contains([]string{"integer", "decimal"}, field.Type) {
					add(rp+".field", "Per-unit pricing requires an estimate-stage numeric quantity, not a win-rate preference.")
				}
			}
		case "rank_interval":
			from, to := fields[rule.From], fields[rule.To]
			if from.Type != "rank" || from.Stage != "estimate" {
				add(rp+".from", "Choose an estimate-stage starting rank.")
			}
			if to.Type != "rank" || from.Reference != to.Reference || to.Stage != "estimate" || rule.From == rule.To {
				add(rp+".to", "Choose a distinct estimate-stage target rank from the same catalog.")
			}
			if (rule.FromUnits == "") != (rule.ToUnits == "") || (rule.FromUnits != "" && rule.FromUnits == rule.ToUnits) {
				field := ".to_units"
				if rule.FromUnits == "" {
					field = ".from_units"
				}
				add(rp+field, "Configure two distinct unit fields or neither.")
			}
			for _, part := range []struct{ suffix, key string }{{".from_units", rule.FromUnits}, {".to_units", rule.ToUnits}} {
				suffix, key := part.suffix, part.key
				if key != "" && (fields[key].Type != "integer" || fields[key].Stage != "estimate") {
					add(rp+suffix, "Rank units require estimate-stage integer fields.")
				}
			}
			options := refs[from.Reference].Options
			seen := map[string]bool{}
			if len(rule.Intervals) > 300 {
				add(rp, "Too many rank intervals.")
				continue
			}
			for j, interval := range rule.Intervals {
				ip := fmt.Sprintf("%s.intervals.%d", rp, j)
				price, valid := decimal(interval.AmountMinor)
				if !valid || price.Sign() < 0 {
					add(ip+".amount_minor", "Enter a nonnegative price for this rank interval.")
				}
				if seen[interval.Rank] || !slices.ContainsFunc(options, func(o Option) bool { return o.Key == interval.Rank }) {
					add(ip+".rank", "Remove this duplicate or unavailable rank interval.")
				}
				seen[interval.Rank] = true
			}
			for j, option := range options {
				if (j < len(options)-1 || rule.FromUnits != "") && !seen[option.Key] {
					add(fmt.Sprintf("%s.missing_intervals.%d", rp, j), "Enter a price for this selectable rank interval.")
				}
				if rule.FromUnits != "" && option.Units <= 0 {
					add(rp+".from_units", "Unit pricing requires positive units for every rank in the selected rank catalog. Review that catalog first.")
				}
			}
		case "manual_review":
			if rule.When == nil {
				add(rp+".when", "Manual review requires an explicit condition.")
			}
		default:
			add(rp+".kind", "Unsupported pricing operation.")
		}
	}
	if len(plan.Cases) == 0 {
		add(path+".cases", "Save at least one passing price example before publication.")
	}
}

func validatePriceCases(c Configuration, add func(string, string)) {
	for i, service := range c.Services {
		if service.Pricing == nil {
			continue
		}
		keys := map[string]bool{}
		for j, example := range service.Pricing.Cases {
			path := fmt.Sprintf("services.%d.pricing.cases.%d", i, j)
			if keys[example.Key] || !keyPattern.MatchString(example.Key) {
				add(path+".key", "Saved cases require unique keys.")
			}
			keys[example.Key] = true
			validated := ValidateAnswers(c, service.Key, "estimate", example.Answers, nil)
			if len(validated.Issues) > 0 {
				for _, issue := range validated.Issues {
					add(path+".answers."+issue.Path, issue.Message)
				}
				continue
			}
			outcome, _, amount, _, _ := evaluatePrice(c, service, validated.Answers)
			if example.Outcome != outcome {
				add(path+".outcome", "Expected outcome differs from the current pricing rules.")
			} else if example.AmountMinor != amount {
				add(path+".amount_minor", "Expected total differs from the current pricing rules.")
			}
		}
	}
}

func answerString(raw json.RawMessage) string {
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return ""
	}
	return value
}
