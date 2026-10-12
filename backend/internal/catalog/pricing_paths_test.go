package catalog

import (
	"slices"
	"testing"
)

func TestPricingErrorsIdentifyCorrectControls(t *testing.T) {
	for _, scenario := range []struct {
		name, path string
		change     func(*PricePlan)
	}{
		{"fixed amount", "rules.1.value", func(p *PricePlan) { p.Rules[1].Value = "12,50" }},
		{"quantity field", "rules.1.field", func(p *PricePlan) { p.Rules[1].Kind = "per_unit"; p.Rules[1].Field = "mode" }},
		{"target rank", "rules.0.to", func(p *PricePlan) { p.Rules[0].To = p.Rules[0].From }},
		{"interval amount", "rules.0.intervals.1.amount_minor", func(p *PricePlan) { p.Rules[0].Intervals[1].AmountMinor = "not a price" }},
		{"missing interval", "rules.0.missing_intervals.1", func(p *PricePlan) { p.Rules[0].Intervals = p.Rules[0].Intervals[:1] }},
		{"duplicate interval", "rules.0.intervals.1.rank", func(p *PricePlan) { p.Rules[0].Intervals[1].Rank = "bronze" }},
		{"example result", "cases.0.amount_minor", func(p *PricePlan) { p.Cases[0].AmountMinor = "999" }},
		{"example selection", "cases.0.answers.mode", func(p *PricePlan) { delete(p.Cases[0].Answers, "mode") }},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			c := pricedFixture()
			scenario.change(c.Services[0].Pricing)
			issues := ValidateConfiguration(c, true)
			expected := "services.0.pricing." + scenario.path
			if !slices.ContainsFunc(issues, func(issue Issue) bool { return issue.Path == expected }) {
				t.Fatalf("expected field path %s, got %v", expected, issues)
			}
		})
	}
}
