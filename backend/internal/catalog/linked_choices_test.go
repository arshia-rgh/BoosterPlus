package catalog

import (
	"encoding/json"
	"testing"
)

func linkedFixture() Configuration {
	c := fixture()
	c.Packages = nil
	c.Services[0].Fields = []Field{
		{Key: "role", Label: "Role", Type: "select", Stage: "estimate", Options: []Option{{Key: "Mid lane", Label: "Mid lane"}, {Key: "Roaming", Label: "Roaming"}}},
		{Key: "heroes", Label: "Heroes", Type: "multiselect", Stage: "estimate", MaxSelections: 3, Options: []Option{{Key: "Mage", Label: "Mage"}, {Key: "Tank", Label: "Tank"}, {Key: "Flexible", Label: "Flexible"}}},
	}
	c.Services[0].Rules = []Rule{{Key: "roles", Kind: "linked_choices", From: "role", To: "heroes", LinkMode: "shared_parent", Message: "Choose compatible heroes and role.", Links: []ChoiceLink{{Parent: "Mid lane", Children: []string{"Mage", "Flexible"}}, {Parent: "Roaming", Children: []string{"Tank", "Flexible"}}}}}
	return c
}

func TestLinkedChoiceConfigurationAndOpaqueOptionValues(t *testing.T) {
	c := linkedFixture()
	if issues := ValidateConfiguration(c, true); len(issues) != 0 {
		t.Fatal(issues)
	}
	for _, value := range []string{"Mid lane", "آسیا", "Warrior III", "A/B", "constructor"} {
		if !validOptionKey(value) {
			t.Fatal("ordinary opaque option value rejected", value)
		}
	}
	for _, value := range []string{"", " Leading", "Trailing ", "Invisible\u200b", "Control\n", "\x00"} {
		if validOptionKey(value) {
			t.Fatal("ambiguous option value accepted")
		}
	}
	for name, change := range map[string]func(*Configuration){
		"missing mapping":  func(c *Configuration) { c.Services[0].Rules[0].Links = c.Services[0].Rules[0].Links[:1] },
		"ambiguous server": func(c *Configuration) { c.Services[0].Rules[0].LinkMode = "single_parent" },
		"unknown option": func(c *Configuration) {
			c.Services[0].Rules[0].Links[0].Children = append(c.Services[0].Rules[0].Links[0].Children, "unknown")
		},
		"duplicate child": func(c *Configuration) {
			c.Services[0].Rules[0].Links[0].Children = append(c.Services[0].Rules[0].Links[0].Children, "Mage")
		},
		"required shared role": func(c *Configuration) { c.Services[0].Fields[0].Required = true },
		"later stage":          func(c *Configuration) { c.Services[0].Fields[1].Stage = "order" },
		"cycle": func(c *Configuration) {
			other := c.Services[0].Rules[0]
			other.Key = "second"
			other.From, other.To = other.To, other.From
			c.Services[0].Rules = append(c.Services[0].Rules, other)
		},
	} {
		t.Run(name, func(t *testing.T) {
			modified := clone(c)
			change(&modified)
			if issues := ValidateConfiguration(modified, true); len(issues) == 0 {
				t.Fatal("invalid mapping published")
			}
		})
	}
}

func TestLinkedChoicesRejectCraftedInconsistentAnswers(t *testing.T) {
	c := linkedFixture()
	for _, test := range []struct {
		role, heroes string
		bad          bool
	}{
		{`"Mid lane"`, `["Mage"]`, false},
		{`"Roaming"`, `["Mage"]`, true},
		{`"Mid lane"`, `["Mage","Tank"]`, true},
		{"", `["Mage","Tank"]`, false},
		{"", `["Mage"]`, true},
		{"", `["Flexible"]`, false},
		{`"Roaming"`, `["Flexible"]`, false},
	} {
		input := Answers{"heroes": json.RawMessage(test.heroes)}
		if test.role != "" {
			input["role"] = json.RawMessage(test.role)
		}
		result := ValidateAnswers(c, "boost", "estimate", input, nil)
		if (len(result.Issues) > 0) != test.bad {
			t.Fatal("unexpected relationship validation", test, result.Issues)
		}
	}
}
