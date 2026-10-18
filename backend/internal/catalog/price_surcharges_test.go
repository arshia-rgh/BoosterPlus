package catalog

import (
	"encoding/json"
	"fmt"
	"math/big"
	"slices"
	"testing"
	"time"
)

func surchargeFixture() Configuration {
	c := pricedFixture()
	s := &c.Services[0]
	s.Fields = append(s.Fields,
		Field{Key: "heroes", Label: "Heroes", Type: "multiselect", Stage: "estimate", MaxSelections: 5, Options: []Option{{Key: "a", Label: "A"}, {Key: "b", Label: "B"}, {Key: "c", Label: "C"}, {Key: "d", Label: "D"}, {Key: "e", Label: "E"}}},
		Field{Key: "wr", Label: "Win rate", Type: "radio", Stage: "estimate", Options: []Option{{Key: "any", Label: "No preference"}, {Key: "above_80", Label: "Above 80%"}, {Key: "exact_100", Label: "100%"}}},
		Field{Key: "speed", Label: "Delivery", Type: "radio", Stage: "estimate", Options: []Option{{Key: "any", Label: "No preference"}, {Key: "h24", Label: "24 hours"}, {Key: "h48", Label: "48 hours"}}})
	s.Pricing.BaseMinor = "2000"
	s.Pricing.Rules = nil
	s.Pricing.Surcharges = []PriceSurcharge{
		{Key: "wr100", Label: "Exactly 100% (+200%)", Kind: "percentage", Value: "200", When: leaf("wr", "eq", "exact_100")},
		{Key: "wr80", Label: "Above 80% (+100%)", Kind: "percentage", Value: "100", When: leaf("wr", "eq", "above_80")},
		{Key: "heroes_extra", Label: "Preferred heroes", Kind: "selection_count", Field: "heroes", Rates: []SelectionRate{{1, "50"}, {2, "40"}, {3, "30"}, {4, "20"}, {5, "10"}}},
		{Key: "h24", Label: "Within 24 hours (+25%)", Kind: "percentage", Value: "25", When: leaf("speed", "eq", "h24")},
		{Key: "h48", Label: "Within 48 hours (+15%)", Kind: "percentage", Value: "15", When: leaf("speed", "eq", "h48")},
	}
	s.Pricing.Cases[0].AmountMinor = "2000"
	for i := range c.Packages {
		for j := range c.Packages[i].Variants {
			c.Packages[i].Variants[j].ExcludedFields = append(c.Packages[i].Variants[j].ExcludedFields, "heroes", "wr", "speed")
		}
	}
	return c
}

func TestBaseSurchargesAllCombinations(t *testing.T) {
	t.Parallel()
	c := surchargeFixture()
	if issues := ValidateConfiguration(c, true); len(issues) > 0 {
		t.Fatal(issues)
	}
	heroes := []string{"a", "b", "c", "d", "e"}
	for wr, wrRate := range map[string]int{"any": 0, "above_80": 100, "exact_100": 200} {
		for speed, deliveryRate := range map[string]int{"any": 0, "h24": 25, "h48": 15} {
			for count, heroRate := range []int{0, 50, 40, 30, 20, 10} {
				t.Run(fmt.Sprintf("%s/%s/%d", wr, speed, count), func(t *testing.T) {
					t.Parallel()
					a := answers()
					encodedWR, err := json.Marshal(wr)
					if err != nil {
						t.Fatal(err)
					}
					a["wr"] = encodedWR
					encodedSpeed, err := json.Marshal(speed)
					if err != nil {
						t.Fatal(err)
					}
					a["speed"] = encodedSpeed
					encodedHeroes, err := json.Marshal(heroes[:count])
					if err != nil {
						t.Fatal(err)
					}
					a["heroes"] = encodedHeroes
					result := CalculateNew(Release{Configuration: c}, "boost", a, time.Now())
					want := fmt.Sprint(2000 + 20*(wrRate+deliveryRate+heroRate))
					if result.Outcome != "estimated" || result.AmountMinor != want {
						t.Fatalf("%+v want %s", result, want)
					}
					sum := new(big.Int)
					for _, line := range result.Lines {
						n, ok := new(big.Int).SetString(line.AmountMinor, 10)
						if !ok {
							t.Fatal(line)
						}
						sum.Add(sum, n)
					}
					if sum.String() != want {
						t.Fatal("breakdown mismatch", sum, want)
					}
				})
			}
		}
	}
}

func TestBaseSurchargeBoundsPrecisionAndFailClosed(t *testing.T) {
	t.Parallel()
	for _, tc := range []struct{ name, base, min, max, percent, want string }{
		{"minimum first", "70", "1000", "100000", "50", "1500"},
		{"maximum last", "2000", "1000", "2500", "50", "2500"},
		{"one final rounding", "100.25", "1", "100000", "0.5", "101"},
		{"overflow", "999999999999", "1", "999999999999", "1", ""},
		{"negative rejected", "2000", "1", "100000", "-1", ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c := surchargeFixture()
			p := c.Services[0].Pricing
			p.BaseMinor, p.MinimumMinor, p.MaximumMinor = tc.base, tc.min, tc.max
			p.Surcharges = []PriceSurcharge{{Key: "extra", Label: "Extra", Kind: "percentage", Value: tc.percent}}
			result := Calculate(Release{Configuration: c}, "boost", answers(), time.Now())
			if result.AmountMinor != tc.want || tc.want == "" && result.Outcome != "manual_review" {
				t.Fatal(result)
			}
		})
	}
	base := big.NewRat(2000, 1)
	rules := surchargeFixture().Services[0].Pricing.Surcharges
	a := Answers{"wr": json.RawMessage(`"exact_100"`), "speed": json.RawMessage(`"h24"`), "heroes": json.RawMessage(`["a"]`)}
	total, _, ok := applySurcharges(base, rules, a, fieldMap(surchargeFixture().Services[0].Fields))
	slices.Reverse(rules)
	reversed, _, reverseOK := applySurcharges(base, rules, a, fieldMap(surchargeFixture().Services[0].Fields))
	if !ok || !reverseOK || total.Cmp(reversed) != 0 || total.Cmp(big.NewRat(7500, 1)) != 0 || base.Cmp(big.NewRat(2000, 1)) != 0 {
		t.Fatal("order compounded or mutated base")
	}
}

func TestSurchargePublicationGuards(t *testing.T) {
	t.Parallel()
	for name, mutate := range map[string]func(*PricePlan){
		"unknown operation":     func(p *PricePlan) { p.Surcharges[0].Kind = "eval" },
		"duplicate key":         func(p *PricePlan) { p.Surcharges[0].Key = "heroes_extra" },
		"reserved key":          func(p *PricePlan) { p.Surcharges[0].Key = "minimum_base" },
		"huge percent":          func(p *PricePlan) { p.Surcharges[0].Value = "10001" },
		"later field condition": func(p *PricePlan) { p.Surcharges[0].When = leaf("player", "eq", "private") },
		"wrong counted field":   func(p *PricePlan) { p.Surcharges[2].Field = "wr" },
		"missing tier":          func(p *PricePlan) { p.Surcharges[2].Rates = p.Surcharges[2].Rates[:4] },
		"duplicate tier":        func(p *PricePlan) { p.Surcharges[2].Rates[4].Count = 1 },
		"negative tier":         func(p *PricePlan) { p.Surcharges[2].Rates[4].Percent = "-1" },
		"zero count":            func(p *PricePlan) { p.Surcharges[2].Rates[0].Count = 0 },
		"ambiguous value":       func(p *PricePlan) { p.Surcharges[2].Value = "10" },
		"too many":              func(p *PricePlan) { p.Surcharges = make([]PriceSurcharge, 21) },
	} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			c := surchargeFixture()
			mutate(c.Services[0].Pricing)
			if len(ValidateConfiguration(c, true)) == 0 {
				t.Fatal("invalid pricing published")
			}
		})
	}
}
