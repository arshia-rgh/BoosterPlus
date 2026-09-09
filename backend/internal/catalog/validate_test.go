package catalog

import (
	"encoding/json"
	"strings"
	"testing"
)

func fixture() Configuration {
	return Configuration{SchemaVersion: 1, Name: "Synthetic test game", Reviewed: true,
		References: []Reference{{Key: "ranks", Label: "Ranks", Kind: "rank", Options: []Option{{Key: "bronze", Label: "Bronze", Units: 5}, {Key: "silver", Label: "Silver", Units: 10}}}, {Key: "heroes", Label: "Heroes", Kind: "hero", Options: []Option{{Key: "first", Label: "First"}, {Key: "second", Label: "Second"}}}},
		Services: []ServiceDefinition{{Key: "boost", Name: "Boost", Evaluator: "manual-review-v1", Fields: []Field{
			{Key: "mode", Label: "Mode", Type: "select", Stage: "estimate", Required: true, Options: []Option{{Key: "solo", Label: "Solo"}, {Key: "duo", Label: "Duo"}}},
			{Key: "from", Label: "From", Type: "rank", Stage: "estimate", Required: true, Reference: "ranks"},
			{Key: "to", Label: "To", Type: "rank", Stage: "estimate", Required: true, Reference: "ranks"},
			{Key: "start_units", Label: "Starting units", Type: "integer", Stage: "estimate", Required: true, Min: "0", Max: "10", Step: "1", Default: json.RawMessage(`"0"`)},
			{Key: "end_units", Label: "Target units", Type: "integer", Stage: "estimate", Required: true, Min: "0", Max: "10", Step: "1", Default: json.RawMessage(`"0"`)},
			{Key: "rate", Label: "Rate", Type: "decimal", Stage: "estimate", Min: "50", Max: "100", Step: "0.1"},
			{Key: "one", Label: "One hero", Type: "boolean", Stage: "estimate"},
			{Key: "hero", Label: "Hero", Type: "select", Stage: "estimate", Reference: "heroes", VisibleWhen: leaf("one", "eq", "true"), RequiredWhen: leaf("one", "eq", "true")},
			{Key: "allowed", Label: "Allowed", Type: "multiselect", Stage: "estimate", Reference: "heroes", MaxSelections: 2},
			{Key: "excluded", Label: "Excluded", Type: "multiselect", Stage: "estimate", Reference: "heroes", MaxSelections: 2},
			{Key: "note", Label: "Notes", Type: "short_text", Stage: "order", MaxLength: 100},
			{Key: "player", Label: "Player", Type: "short_text", Stage: "fulfillment", MaxLength: 100, Required: true},
			{Key: "screenshot", Label: "Screenshot", Type: "attachment", Stage: "order"},
		}, Rules: []Rule{{Key: "forward", Kind: "progression", Message: "Target must advance within rank limits.", From: "from", To: "to", FromUnits: "start_units", ToUnits: "end_units"}, {Key: "overlap", Kind: "disjoint", Message: "Heroes cannot overlap.", From: "allowed", To: "excluded"}}}},
		Packages: []Package{{Key: "pack", Name: "Test pack", Service: "boost", Variants: []Variant{{Key: "basic", Name: "Test variant", Currency: "USD", AmountMinor: "1234", DeliveryMinHours: 1, DeliveryMaxHours: 5, Eligibility: leaf("mode", "eq", "solo"), RequiredFields: []string{"mode"}}}}}}
}
func leaf(field, op string, values ...string) *Condition {
	return &Condition{Field: field, Op: op, Values: values}
}
func answers() Answers {
	return Answers{"mode": json.RawMessage(`"solo"`), "from": json.RawMessage(`"bronze"`), "to": json.RawMessage(`"silver"`)}
}
func clone(c Configuration) Configuration {
	raw, err := json.Marshal(c)
	if err != nil {
		panic(err)
	}
	var result Configuration
	if err = json.Unmarshal(raw, &result); err != nil {
		panic(err)
	}
	return result
}

func TestPublicationValidation(t *testing.T) {
	t.Parallel()
	if issues := ValidateConfiguration(fixture(), true); len(issues) != 0 {
		t.Fatal(issues)
	}
	cases := []struct {
		name   string
		change func(*Configuration)
	}{
		{"unreviewed", func(c *Configuration) { c.Reviewed = false }},
		{"empty ranks", func(c *Configuration) { c.References[0].Options = nil }},
		{"duplicate options", func(c *Configuration) {
			c.References[0].Options = append(c.References[0].Options, c.References[0].Options[0])
		}},
		{"missing reference", func(c *Configuration) { c.Services[0].Fields[1].Reference = "missing" }},
		{"cycle", func(c *Configuration) { c.Services[0].Fields[6].VisibleWhen = leaf("hero", "eq", "first") }},
		{"unknown field", func(c *Configuration) { c.Services[0].Fields[7].VisibleWhen = leaf("missing", "eq", "true") }},
		{"later stage", func(c *Configuration) { c.Services[0].Fields[0].VisibleWhen = leaf("player", "eq", "text") }},
		{"impossible interval", func(c *Configuration) {
			c.Services[0].Fields[7].VisibleWhen = &Condition{Op: "all", Children: []Condition{*leaf("rate", "gt", "90"), *leaf("rate", "lt", "60")}}
		}},
		{"impossible options", func(c *Configuration) {
			c.Services[0].Fields[7].VisibleWhen = &Condition{Op: "all", Children: []Condition{*leaf("mode", "eq", "solo"), *leaf("mode", "eq", "duo")}}
		}},
		{"off grid equality", func(c *Configuration) { c.Services[0].Fields[7].VisibleWhen = leaf("rate", "eq", "50.01") }},
		{"wrong comparator", func(c *Configuration) { c.Services[0].Fields[7].VisibleWhen = leaf("mode", "gt", "1") }},
		{"unbounded step", func(c *Configuration) { c.Services[0].Fields[5].Step = "0" }},
		{"wrong default", func(c *Configuration) { c.Services[0].Fields[0].Default = json.RawMessage(`"bad"`) }},
		{"secret type", func(c *Configuration) { c.Services[0].Fields[0].Type = "password" }},
		{"required upload", func(c *Configuration) { c.Services[0].Fields[12].Required = true }},
		{"price zero", func(c *Configuration) { c.Packages[0].Variants[0].AmountMinor = "0" }},
		{"price decimal", func(c *Configuration) { c.Packages[0].Variants[0].AmountMinor = "1.25" }},
		{"price overflow", func(c *Configuration) { c.Packages[0].Variants[0].AmountMinor = "1000000000000" }},
		{"missing currency", func(c *Configuration) { c.Packages[0].Variants[0].Currency = "" }},
		{"inverted delivery", func(c *Configuration) { c.Packages[0].Variants[0].DeliveryMinHours = 10 }},
		{"negative capacity", func(c *Configuration) { v := -1; c.Packages[0].Variants[0].Capacity = &v }},
		{"external asset", func(c *Configuration) { c.Asset = "https://example.test/a.png"; c.AssetAlt = "Game" }},
		{"path traversal", func(c *Configuration) { c.Asset = "/catalog-assets/../secret.png"; c.AssetAlt = "Game" }},
		{"executable evaluator", func(c *Configuration) { c.Services[0].Evaluator = "eval(1)" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c := clone(fixture())
			tc.change(&c)
			if got := ValidateConfiguration(c, true); len(got) == 0 {
				t.Fatal("invalid configuration accepted")
			}
		})
	}
}

func TestConditionLimitsAndSatisfiability(t *testing.T) {
	t.Parallel()
	c := fixture()
	fields := fieldMap(c.Services[0].Fields)
	refs := map[string]Reference{}
	for _, ref := range c.References {
		refs[ref.Key] = ref
	}
	for _, tc := range []struct {
		condition *Condition
		possible  bool
	}{
		{&Condition{Op: "any", Children: []Condition{*leaf("rate", "lt", "40"), *leaf("rate", "gt", "99.9")}}, true},
		{&Condition{Op: "all", Children: []Condition{*leaf("rate", "gt", "99.9"), *leaf("rate", "lt", "100")}}, false},
		{&Condition{Op: "all", Children: []Condition{*leaf("mode", "in", "solo", "duo"), *leaf("mode", "eq", "duo")}}, true},
		{leaf("rate", "gt", "100"), false},
		{leaf("rate", "eq", "50.00"), true},
		{&Condition{Op: "all", Children: []Condition{*leaf("allowed", "in", "first"), *leaf("allowed", "in", "second")}}, true},
	} {
		if got := possible(tc.condition, fields, refs); got != tc.possible {
			t.Fatalf("possible %v, want %v", got, tc.possible)
		}
	}
	deep := leaf("mode", "eq", "solo")
	for range 8 {
		deep = &Condition{Op: "all", Children: []Condition{*deep}}
	}
	c.Services[0].Fields[7].VisibleWhen = deep
	if len(ValidateConfiguration(c, false)) == 0 {
		t.Fatal("deep draft accepted")
	}
}

func TestAnswerNormalizationAndBoundaries(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name   string
		change func(Answers)
		stage  string
		bad    bool
	}{
		{"valid", func(Answers) {}, "estimate", false},
		{"unknown", func(a Answers) { a["malicious"] = json.RawMessage(`"value"`) }, "estimate", true},
		{"wrong type", func(a Answers) { a["mode"] = json.RawMessage(`true`) }, "estimate", true},
		{"unknown option", func(a Answers) { a["mode"] = json.RawMessage(`"admin"`) }, "estimate", true},
		{"hidden stale field", func(a Answers) { a["hero"] = json.RawMessage(`"obsolete"`) }, "estimate", false},
		{"conditional missing", func(a Answers) { a["one"] = json.RawMessage(`true`) }, "estimate", true},
		{"conditional present", func(a Answers) { a["one"] = json.RawMessage(`true`); a["hero"] = json.RawMessage(`"first"`) }, "estimate", false},
		{"duplicate multi", func(a Answers) { a["allowed"] = json.RawMessage(`["first","first"]`) }, "estimate", true},
		{"overlap", func(a Answers) {
			a["allowed"] = json.RawMessage(`["first"]`)
			a["excluded"] = json.RawMessage(`["first"]`)
		}, "estimate", true},
		{"units exceed tier", func(a Answers) { a["start_units"] = json.RawMessage(`"6"`) }, "estimate", true},
		{"same tier forward", func(a Answers) { a["to"] = json.RawMessage(`"bronze"`); a["end_units"] = json.RawMessage(`"2"`) }, "estimate", false},
		{"same tier reverse", func(a Answers) { a["to"] = json.RawMessage(`"bronze"`) }, "estimate", true},
		{"decimal step", func(a Answers) { a["rate"] = json.RawMessage(`"75.15"`) }, "estimate", true},
		{"decimal valid", func(a Answers) { a["rate"] = json.RawMessage(`"75.10"`) }, "estimate", false},
		{"exponent", func(a Answers) { a["rate"] = json.RawMessage(`"1e2"`) }, "estimate", true},
		{"JSON number", func(a Answers) { a["rate"] = json.RawMessage(`75.1`) }, "estimate", true},
		{"null", func(a Answers) { a["one"] = json.RawMessage(`null`) }, "estimate", true},
		{"late stage", func(a Answers) { a["player"] = json.RawMessage(`"private"`) }, "order", true},
		{"upload key", func(a Answers) { a["screenshot"] = json.RawMessage(`"private/file.png"`) }, "order", true},
		{"long text", func(a Answers) { a["note"] = json.RawMessage(`"` + strings.Repeat("x", 101) + `"`) }, "order", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			a := answers()
			tc.change(a)
			got := ValidateAnswers(fixture(), "boost", tc.stage, a, nil)
			if (len(got.Issues) > 0) != tc.bad {
				t.Fatalf("issues %v", got.Issues)
			}
			if tc.name == "hidden stale field" && got.Answers["hero"] != nil {
				t.Fatal("hidden value retained")
			}
		})
	}
	c := fixture()
	a := answers()
	a["mode"] = json.RawMessage(`"duo"`)
	if len(ValidateAnswers(c, "boost", "order", a, &c.Packages[0].Variants[0]).Issues) == 0 {
		t.Fatal("ineligible package accepted")
	}
	a["rate"] = json.RawMessage(`"75.10"`)
	if !matches(leaf("rate", "eq", "75.1"), a, fieldMap(c.Services[0].Fields)) {
		t.Fatal("exact decimal equality failed")
	}
}

func TestUnreachableVisibilityAndDraftDefaults(t *testing.T) {
	t.Parallel()
	c := fixture()
	c.Services[0].Fields[6].VisibleWhen = leaf("mode", "eq", "solo")
	c.Services[0].Fields[7].VisibleWhen = &Condition{Op: "all", Children: []Condition{*leaf("mode", "eq", "duo"), *leaf("one", "eq", "true")}}
	if issues := ValidateConfiguration(c, true); len(issues) == 0 {
		t.Fatal("condition depending on a hidden field was accepted")
	}
	c = fixture()
	c.Services[0].Fields[0].Default = json.RawMessage(`{"unsupported":"object"}`)
	if issues := ValidateConfiguration(c, false); len(issues) == 0 {
		t.Fatal("draft stored an unsupported default type")
	}
}
