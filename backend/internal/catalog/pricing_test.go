package catalog

import (
	"encoding/json"
	"math/big"
	"testing"
	"time"
)

func pricedFixture() Configuration {
	c := fixture()
	c.Services[0].Evaluator = "pricing-v1"
	c.Services[0].Pricing = &PricePlan{Currency: "USD", BaseMinor: "100.25", MinimumMinor: "1", MaximumMinor: "999999", Rules: []PriceRule{
		{Key: "ranks", Label: "Rank progression", Kind: "rank_interval", From: "from", To: "to", FromUnits: "start_units", ToUnits: "end_units", Intervals: []RankPrice{{"bronze", "1000"}, {"silver", "2000"}}},
		{Key: "extra", Label: "Priority", Kind: "fixed", Value: "0.25"},
	}, Cases: []PriceCase{{Key: "standard", Answers: answers(), Outcome: "estimated", AmountMinor: "1101"}}}
	return c
}
func TestPricingArithmeticAndNormalization(t *testing.T) {
	t.Parallel()
	c := pricedFixture()
	if issues := ValidateConfiguration(c, true); len(issues) > 0 {
		t.Fatal(issues)
	}
	now := time.Date(2026, 9, 10, 1, 0, 0, 0, time.UTC)
	cases := []struct {
		name            string
		mutate          func(*Configuration, Answers)
		outcome, amount string
	}{
		{"half up once", func(_ *Configuration, _ Answers) {}, "estimated", "1101"},
		{"partial ranks", func(_ *Configuration, a Answers) {
			a["start_units"] = json.RawMessage(`"3"`)
			a["end_units"] = json.RawMessage(`"2"`)
		}, "estimated", "901"},
		{"same rank", func(_ *Configuration, a Answers) {
			a["to"] = json.RawMessage(`"bronze"`)
			a["start_units"] = json.RawMessage(`"1"`)
			a["end_units"] = json.RawMessage(`"3"`)
		}, "estimated", "501"},
		{"per unit percentage", func(c *Configuration, a Answers) {
			a["rate"] = json.RawMessage(`"50.1"`)
			c.Services[0].Pricing.Rules = append(c.Services[0].Pricing.Rules, PriceRule{Key: "units", Kind: "per_unit", Field: "rate", Value: "2.5"}, PriceRule{Key: "percent", Kind: "percentage", Value: "10"})
		}, "estimated", "1348"},
		{"multiplier", func(c *Configuration, _ Answers) {
			c.Services[0].Pricing.Rules = append(c.Services[0].Pricing.Rules, PriceRule{Key: "factor", Kind: "multiplier", Value: "1.5"})
		}, "estimated", "1651"},
		{"minimum", func(c *Configuration, _ Answers) { c.Services[0].Pricing.MinimumMinor = "2000" }, "estimated", "2000"},
		{"maximum", func(c *Configuration, _ Answers) { c.Services[0].Pricing.MaximumMinor = "1000" }, "estimated", "1000"},
		{"manual", func(c *Configuration, _ Answers) {
			c.Services[0].Pricing.Rules = append(c.Services[0].Pricing.Rules, PriceRule{Kind: "manual_review", When: leaf("mode", "eq", "solo")})
		}, "manual_review", ""},
		{"unmatched manual", func(c *Configuration, _ Answers) {
			c.Services[0].Pricing.Rules = append(c.Services[0].Pricing.Rules, PriceRule{Kind: "manual_review", When: leaf("mode", "eq", "duo")})
		}, "estimated", "1101"},
		{"overflow", func(c *Configuration, _ Answers) { c.Services[0].Pricing.BaseMinor = "999999999999" }, "manual_review", ""},
		{"missing interval", func(c *Configuration, _ Answers) { c.Services[0].Pricing.Rules[0].Intervals = nil }, "manual_review", ""},
		{"missing dependency", func(c *Configuration, _ Answers) {
			c.Services[0].Pricing.Rules = append(c.Services[0].Pricing.Rules, PriceRule{Kind: "per_unit", Field: "rate", Value: "1"})
		}, "manual_review", ""},
		{"full discount floor", func(c *Configuration, _ Answers) {
			c.Services[0].Pricing.Rules = append(c.Services[0].Pricing.Rules, PriceRule{Kind: "percentage", Value: "-100"})
		}, "estimated", "1"},
		{"amount injection", func(_ *Configuration, a Answers) { a["amount_minor"] = json.RawMessage(`"1"`) }, "invalid", ""},
		{"invalid units", func(_ *Configuration, a Answers) { a["start_units"] = json.RawMessage(`"9"`) }, "invalid", ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			config := clone(c)
			a := answers()
			tc.mutate(&config, a)
			result := Calculate(Release{ID: "release", Version: 7, Configuration: config}, "boost", a, now)
			if result.Outcome != tc.outcome || result.AmountMinor != tc.amount {
				t.Fatalf("got %s %s; expected %s %s", result.Outcome, result.AmountMinor, tc.outcome, tc.amount)
			}
			if result.ReleaseID != "release" || result.Version != 7 || !result.ExpiresAt.Equal(now.Add(15*time.Minute)) {
				t.Fatal("missing release/expiry fence")
			}
			if result.Outcome == "estimated" {
				sum := new(big.Int)
				for _, line := range result.Lines {
					n, ok := new(big.Int).SetString(line.AmountMinor, 10)
					if !ok {
						t.Fatal("invalid line")
					}
					sum.Add(sum, n)
				}
				if sum.String() != result.AmountMinor {
					t.Fatal("breakdown does not reconcile")
				}
			}
		})
	}
}
func TestPricingPublicationRejectsInvalidPlans(t *testing.T) {
	t.Parallel()
	cases := map[string]func(*PricePlan){
		"missing examples":     func(p *PricePlan) { p.Cases = nil },
		"stale result":         func(p *PricePlan) { p.Cases[0].AmountMinor = "1100" },
		"invalid answers":      func(p *PricePlan) { p.Cases[0].Answers["from"] = json.RawMessage(`"unknown"`) },
		"duplicate case":       func(p *PricePlan) { p.Cases = append(p.Cases, p.Cases[0]) },
		"currency":             func(p *PricePlan) { p.Currency = "BTC" },
		"zero minimum":         func(p *PricePlan) { p.MinimumMinor = "0" },
		"fractional bound":     func(p *PricePlan) { p.MinimumMinor = "1.5" },
		"inverted bounds":      func(p *PricePlan) { p.MinimumMinor = "1000000" },
		"negative base":        func(p *PricePlan) { p.BaseMinor = "-1" },
		"executable operation": func(p *PricePlan) { p.Rules[0].Kind = "eval(1)" },
		"reserved key":         func(p *PricePlan) { p.Rules[0].Key = "base" },
		"huge multiplier":      func(p *PricePlan) { p.Rules[0].Kind = "multiplier"; p.Rules[0].Value = "101" },
		"negative multiplier":  func(p *PricePlan) { p.Rules[0].Kind = "multiplier"; p.Rules[0].Value = "-1" },
		"negative percent":     func(p *PricePlan) { p.Rules[0].Kind = "percentage"; p.Rules[0].Value = "-101" },
		"missing interval":     func(p *PricePlan) { p.Rules[0].Intervals = nil },
		"duplicate interval":   func(p *PricePlan) { p.Rules[0].Intervals = append(p.Rules[0].Intervals, p.Rules[0].Intervals[0]) },
		"unknown interval":     func(p *PricePlan) { p.Rules[0].Intervals[0].Rank = "missing" },
		"negative interval":    func(p *PricePlan) { p.Rules[0].Intervals[0].AmountMinor = "-1" },
		"units pair":           func(p *PricePlan) { p.Rules[0].ToUnits = "" },
		"same units":           func(p *PricePlan) { p.Rules[0].ToUnits = p.Rules[0].FromUnits },
		"later stage":          func(p *PricePlan) { p.Rules[0].Kind = "per_unit"; p.Rules[0].Field = "player"; p.Rules[0].Value = "1" },
		"secret condition":     func(p *PricePlan) { p.Rules[0].When = leaf("player", "eq", "text") },
		"unconditional manual": func(p *PricePlan) { p.Rules[0].Kind = "manual_review" },
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			c := clone(pricedFixture())
			change(c.Services[0].Pricing)
			if len(ValidateConfiguration(c, true)) == 0 {
				t.Fatal("invalid pricing published")
			}
		})
	}
}
func TestPricingHiddenFieldsAndLegacy(t *testing.T) {
	t.Parallel()
	c := pricedFixture()
	a := answers()
	a["hero"] = json.RawMessage(`"first"`)
	result := Calculate(Release{Configuration: c}, "boost", a, time.Now())
	if result.Outcome != "estimated" || result.AmountMinor != "1101" {
		t.Fatal(result)
	}
	if _, found := result.Answers["hero"]; found {
		t.Fatal("hidden input retained")
	}
	c.Services[0].Evaluator = "manual-review-v1"
	c.Services[0].Pricing = nil
	result = Calculate(Release{Configuration: c}, "boost", answers(), time.Now())
	if result.Outcome != "manual_review" || result.AmountMinor != "" {
		t.Fatal(result)
	}
}
