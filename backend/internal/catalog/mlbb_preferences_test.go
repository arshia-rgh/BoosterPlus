package catalog

import (
	"encoding/json"
	"os"
	"testing"
	"time"
)

func TestPreparedMLBBPreferences167(t *testing.T) {
	t.Parallel()
	raw, err := os.ReadFile("../../../docs/catalog/MLBB_PREFERENCES_2026-10-18.json")
	if err != nil {
		t.Fatal(err)
	}
	var prepared struct {
		Configuration Configuration `json:"configuration"`
	}
	if err = json.Unmarshal(raw, &prepared); err != nil {
		t.Fatal(err)
	}
	c := prepared.Configuration
	if c.Reviewed {
		t.Fatal("prepared draft must still require publication review")
	}
	c.Reviewed = true
	if issues := ValidateConfiguration(c, true); len(issues) > 0 {
		t.Fatal(issues)
	}
	s := c.Services[0]
	for _, example := range s.Pricing.Cases {
		r := CalculateNew(Release{Configuration: c}, s.Key, example.Answers, time.Now())
		if r.Outcome != example.Outcome || r.AmountMinor != example.AmountMinor {
			t.Fatalf("%s: %+v", example.Key, r)
		}
	}
	a := Answers{"attribute_1": json.RawMessage(`"10"`), "attribute_2": json.RawMessage(`"option_15"`), "has_skins": json.RawMessage(`false`), "attribute_4": json.RawMessage(`"option_1"`), "attribute_5": json.RawMessage(`"100"`), "selling_point": json.RawMessage(`"A carefully maintained account."`)}
	// The zero-skin route must not demand a hidden collection. Existing collector
	// rank options remain owner-authored and are selected from the saved catalog.
	for _, ref := range c.References {
		if ref.Key == "collection" {
			a["attribute_4"], err = json.Marshal(ref.Options[0].Key)
			if err != nil {
				t.Fatal(err)
			}
		}
	}
	if result := ValidateIntake(c, a, true); len(result.Issues) > 0 {
		t.Fatal(result.Issues)
	}
	a["has_skins"] = json.RawMessage(`true`)
	if result := ValidateIntake(c, a, true); len(result.Issues) == 0 {
		t.Fatal("missing skin groups accepted")
	}
	a["attribute_3"] = json.RawMessage(`{"groups":[{"category":"option_1","count":"2","names":["Aldous","Yu Zhong"]}]}`)
	if result := ValidateIntake(c, a, true); len(result.Issues) > 0 {
		t.Fatal(result.Issues)
	}
}
