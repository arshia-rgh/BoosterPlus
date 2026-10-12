package catalog

import (
	"encoding/json"
	"reflect"
	"slices"
	"testing"
)

func TestFixedPackageContentsAndDeliveryBoundary(t *testing.T) {
	t.Parallel()
	c := fixture()
	v := &c.Packages[0].Variants[0]
	before := clone(c)
	for _, tc := range []struct {
		name    string
		answers Answers
		path    string
	}{
		{"delivery only", Answers{"mode": json.RawMessage(`"solo"`)}, ""},
		{"equal fixed values", answers(), ""},
		{"required delivery", Answers{}, "mode"},
		{"altered scope", Answers{"mode": json.RawMessage(`"solo"`), "to": json.RawMessage(`"bronze"`)}, "to"},
		{"excluded default injection", Answers{"mode": json.RawMessage(`"solo"`), "rate": json.RawMessage(`"99"`)}, "rate"},
		{"hidden injection", Answers{"mode": json.RawMessage(`"solo"`), "hero": json.RawMessage(`"first"`)}, "hero"},
		{"private stage", Answers{"mode": json.RawMessage(`"solo"`), "player": json.RawMessage(`"private"`)}, "player"},
		{"wrong eligibility", Answers{"mode": json.RawMessage(`"duo"`)}, "eligibility"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			result := ValidateNewAnswers(c, "boost", "order", tc.answers, v)
			if tc.path == "" && len(result.Issues) != 0 || tc.path != "" && !slices.ContainsFunc(result.Issues, func(issue Issue) bool { return issue.Path == tc.path }) {
				t.Fatalf("unexpected issues: %v", result.Issues)
			}
			if !reflect.DeepEqual(result.Answers["to"], (*v.PresetAnswers)["to"]) || result.Answers["rate"] != nil {
				t.Fatal("fixed contents were changed or unrelated custom defaults leaked")
			}
		})
	}
	if !reflect.DeepEqual(c, before) {
		t.Fatal("validation mutated the catalog")
	}
	// Fulfillment still validates additional private-stage data against the frozen release.
	input := Answers{"mode": json.RawMessage(`"solo"`), "player": json.RawMessage(`"synthetic-id"`)}
	if got := ValidateAnswers(c, "boost", "fulfillment", input, v); len(got.Issues) != 0 || got.Answers["player"] == nil {
		t.Fatal(got.Issues)
	}
}

func TestFixedPackagePublicationRequiresExplicitScope(t *testing.T) {
	t.Parallel()
	for _, tc := range []struct {
		name   string
		change func(*Configuration, *Variant)
	}{
		{"legacy", func(_ *Configuration, v *Variant) { v.PresetAnswers = nil }},
		{"missing classification", func(_ *Configuration, v *Variant) { v.ExcludedFields = nil }},
		{"both fixed and editable", func(_ *Configuration, v *Variant) { v.RequiredFields = append(v.RequiredFields, "to") }},
		{"duplicate exclusion", func(_ *Configuration, v *Variant) { v.ExcludedFields = append(v.ExcludedFields, "hero") }},
		{"unknown preset", func(_ *Configuration, v *Variant) { (*v.PresetAnswers)["unknown"] = json.RawMessage(`"x"`) }},
		{"private preset", func(_ *Configuration, v *Variant) { (*v.PresetAnswers)["player"] = json.RawMessage(`"private"`) }},
		{"invalid preset", func(_ *Configuration, v *Variant) { (*v.PresetAnswers)["to"] = json.RawMessage(`"missing"`) }},
		{"contradictory progression", func(_ *Configuration, v *Variant) { (*v.PresetAnswers)["to"] = json.RawMessage(`"bronze"`) }},
		{"customer can hide promise", func(c *Configuration, _ *Variant) { c.Services[0].Fields[2].VisibleWhen = leaf("mode", "eq", "solo") }},
		{"hidden promise", func(c *Configuration, _ *Variant) { c.Services[0].Fields[2].VisibleWhen = leaf("from", "eq", "silver") }},
		{"impossible delivery visibility", func(c *Configuration, _ *Variant) { c.Services[0].Fields[0].VisibleWhen = leaf("one", "eq", "true") }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			c := fixture()
			tc.change(&c, &c.Packages[0].Variants[0])
			if issues := ValidateConfiguration(c, true); len(issues) == 0 {
				t.Fatal("unsafe or incomplete fixed scope published")
			}
		})
	}
}

func TestLegacyFixedOrdersStayReadableButCannotBeNewlyPurchased(t *testing.T) {
	t.Parallel()
	c := fixture()
	v := &c.Packages[0].Variants[0]
	v.PresetAnswers, v.ExcludedFields = nil, nil
	if issues := ValidateConfiguration(c, false); len(issues) != 0 {
		t.Fatal("legacy draft could not be saved for review", issues)
	}
	if result := ValidateNewAnswers(c, "boost", "order", answers(), v); len(result.Issues) != 1 || result.Issues[0].Path != "package" {
		t.Fatal("new purchase accepted incomplete scope", result)
	}
	if result := ValidateAnswers(c, "boost", "order", answers(), v); len(result.Issues) != 0 {
		t.Fatal("immutable legacy agreement changed", result)
	}
}

func TestFixedScopeRepairPathsAndEarlyStage(t *testing.T) {
	t.Parallel()
	c := fixture()
	v := &c.Packages[0].Variants[0]
	(*v.PresetAnswers)["mode"] = json.RawMessage(`"solo"`)
	v.RequiredFields = nil
	(*v.PresetAnswers)["to"] = json.RawMessage(`"missing"`)
	if issues := ValidateConfiguration(c, true); !slices.ContainsFunc(issues, func(i Issue) bool { return i.Path == "packages.0.variants.0.preset_answers.to" }) {
		t.Fatal(issues)
	}
	(*v.PresetAnswers)["to"] = json.RawMessage(`"silver"`)
	c.Services[0].Fields[0].Stage = "order"
	result := ValidateAnswers(c, "boost", "estimate", Answers{}, v)
	if len(result.Issues) != 0 || result.Answers["mode"] != nil {
		t.Fatal("later preset leaked into early collection", result)
	}
}
