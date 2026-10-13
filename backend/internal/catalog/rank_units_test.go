package catalog

import (
	"encoding/json"
	"testing"
	"time"
)

func TestAbsoluteRankStarsPriceAcrossBoundaries(t *testing.T) {
	c := pricedFixture()
	start := func(n int) *int { return &n }
	c.References[0].Options = []Option{
		{Key: "mythic", Label: "Mythic", Units: 25, UnitStart: start(0)},
		{Key: "honor", Label: "Mythical Honor", Units: 25, UnitStart: start(25)},
		{Key: "glory", Label: "Mythical Glory", Units: 50, UnitStart: start(50)},
		{Key: "immortal", Label: "Mythical Immortal", Units: 150, UnitStart: start(100)},
	}
	for i := range c.Services[0].Fields {
		if c.Services[0].Fields[i].Key == "start_units" || c.Services[0].Fields[i].Key == "end_units" {
			c.Services[0].Fields[i].Max = "1000"
		}
	}
	p := c.Services[0].Pricing
	p.BaseMinor = "0"
	p.Rules = []PriceRule{{Key: "stars", Label: "Rank progression", Kind: "rank_interval", From: "from", To: "to", FromUnits: "start_units", ToUnits: "end_units", Intervals: []RankPrice{{"mythic", "2000"}, {"honor", "2500"}, {"glory", "6000"}, {"immortal", "22500"}}}}
	for _, tc := range []struct{ name, from, to, lo, hi, outcome, amount string }{
		{"mythic boundary", "mythic", "honor", "24", "25", "estimated", "80"},
		{"honor boundary", "honor", "glory", "49", "50", "estimated", "100"},
		{"glory boundary", "glory", "immortal", "99", "100", "estimated", "120"},
		{"same tier actual stars", "glory", "glory", "62", "75", "estimated", "1560"},
		{"cross tier actual stars", "honor", "glory", "40", "62", "estimated", "2440"},
		{"below tier", "glory", "glory", "12", "75", "invalid", ""},
		{"exclusive tier end", "honor", "glory", "50", "62", "invalid", ""},
		{"unchanged", "glory", "glory", "62", "62", "invalid", ""},
		{"backwards", "glory", "honor", "62", "40", "invalid", ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			a := answers()
			for key, value := range map[string]string{"from": tc.from, "to": tc.to, "start_units": tc.lo, "end_units": tc.hi} {
				encoded, err := json.Marshal(value)
				if err != nil {
					t.Fatal(err)
				}
				a[key] = encoded
			}
			got := CalculateNew(Release{Configuration: c}, "boost", a, time.Now())
			if got.Outcome != tc.outcome || got.AmountMinor != tc.amount {
				t.Fatalf("got %s/%s issues=%v; want %s/%s", got.Outcome, got.AmountMinor, got.Issues, tc.outcome, tc.amount)
			}
		})
	}
}

func TestRankOffsetBoundsAndLegacySemantics(t *testing.T) {
	for _, pair := range [][2]int{{-1, 25}, {1000001, 1}, {999999, 2}, {25, 0}} {
		var issues []Issue
		validateOptions([]Option{{Key: "rank", Label: "Rank", Units: pair[1], UnitStart: &pair[0]}}, "options", true, func(path, message string) { issues = append(issues, Issue{path, message}) })
		if len(issues) == 0 {
			t.Errorf("accepted invalid rank range %v", pair)
		}
	}
	c := pricedFixture()
	a := answers()
	a["start_units"] = json.RawMessage(`"5"`)
	if got := Calculate(Release{Configuration: c}, "boost", a, time.Now()); got.Outcome != "estimated" {
		t.Fatal("historical inclusive bound changed", got)
	}
}
