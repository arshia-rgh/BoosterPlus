package catalog

import (
	"encoding/json"
	"os"
	"testing"
	"time"
)

func preparedMLBB(t *testing.T) Configuration {
	t.Helper()
	data, err := os.ReadFile("../../../docs/catalog/MLBB_PREPARED_DRAFT.json")
	if err != nil {
		t.Fatal(err)
	}
	var envelope struct {
		Configuration Configuration `json:"configuration"`
	}
	if err := json.Unmarshal(data, &envelope); err != nil {
		t.Fatal(err)
	}
	return envelope.Configuration
}

func TestPreparedMLBBPublicationAndPrices(t *testing.T) {
	c := preparedMLBB(t)
	if c.Reviewed {
		t.Fatal("prepared catalog must still require publication review")
	}
	c.Reviewed = true
	if issues := ValidateConfiguration(c, true); len(issues) != 0 {
		t.Fatalf("publication: %v", issues)
	}
	for _, example := range c.Services[0].Pricing.Cases {
		t.Run(example.Key, func(t *testing.T) {
			got := CalculateNew(Release{Configuration: c}, "rank_boost", example.Answers, time.Now())
			if got.Outcome != example.Outcome || got.AmountMinor != example.AmountMinor {
				t.Fatalf("got %s %s (%v); want %s %s", got.Outcome, got.AmountMinor, got.Issues, example.Outcome, example.AmountMinor)
			}
		})
	}
}

func TestPreparedMLBBFixedScopeCannotBeCustomized(t *testing.T) {
	c := preparedMLBB(t)
	for _, pack := range c.Packages {
		t.Run(pack.Key, func(t *testing.T) {
			v := pack.Variants[0]
			a := Answers{"region": json.RawMessage(`"option_1"`), "server": json.RawMessage(`"option_1"`), "timezone": json.RawMessage(`"Asia/Manila"`), "availability": json.RawMessage(`"Weekdays after 18:00"`)}
			if got := ValidateNewAnswers(c, "rank_boost", "order", a, &v); len(got.Issues) != 0 {
				t.Fatal(got.Issues)
			}
			for _, key := range []string{"to_rank", "to_units", "fulfillment_mode", "requested_win_rate", "hero", "role", "delivery_max_hours"} {
				b := Answers{}
				for k, value := range a {
					b[k] = value
				}
				b[key] = json.RawMessage(`"not-included"`)
				if got := ValidateNewAnswers(c, "rank_boost", "order", b, &v); len(got.Issues) == 0 {
					t.Fatalf("accepted customized %s", key)
				}
			}
		})
	}
}

func TestPreparedMLBBInvalidRelationshipsAndHours(t *testing.T) {
	c := preparedMLBB(t)
	base := c.Services[0].Pricing.Cases[0].Answers
	for _, mutation := range []map[string]string{{"region": "option_4"}, {"delivery_min_hours": "100", "delivery_max_hours": "24"}, {"to_rank": "option_27", "to_units": "25"}, {"role": "option_3", "hero": "[\"option_1\"]"}} {
		a := Answers{}
		for k, value := range base {
			a[k] = value
		}
		for k, value := range mutation {
			if k == "hero" {
				a[k] = json.RawMessage(value)
			} else {
				encoded, err := json.Marshal(value)
				if err != nil {
					t.Fatal(err)
				}
				a[k] = encoded
			}
		}
		if got := CalculateNew(Release{Configuration: c}, "rank_boost", a, time.Now()); got.Outcome != "invalid" {
			t.Fatalf("accepted invalid selection %v: %v", mutation, got)
		}
	}
}
