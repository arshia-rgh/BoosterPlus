package catalog

import (
	"encoding/json"
	"reflect"
	"testing"
)

func intakeFixture() Configuration {
	c := fixture()
	c.Services, c.Packages = nil, nil
	c.Intake = &IntakeForm{Name: "Account review", Fields: []Field{
		{Key: "region", Label: "Region", Type: "short_text", Stage: "order", Required: true, MaxLength: 80},
		{Key: "restricted", Label: "Restricted", Type: "boolean", Stage: "order"},
		{Key: "details", Label: "Restriction information", Type: "short_text", Stage: "order", MaxLength: 100, VisibleWhen: leaf("restricted", "eq", "true"), RequiredWhen: leaf("restricted", "eq", "true")},
	}, Rules: []Rule{{Key: "blocked", Kind: "reject", Message: "Restricted accounts need review elsewhere.", When: leaf("restricted", "eq", "true")}}}
	return c
}

func TestIntakeDraftAndSubmissionValidation(t *testing.T) {
	t.Parallel()
	c := intakeFixture()
	before := clone(c)
	if issues := ValidateConfiguration(c, true); len(issues) != 0 {
		t.Fatal(issues)
	}
	if got := ValidateIntake(c, Answers{}, false); len(got.Issues) != 0 {
		t.Fatal(got.Issues)
	}
	if got := ValidateIntake(c, Answers{}, true); len(got.Issues) == 0 {
		t.Fatal("missing required attribute accepted")
	}
	if !reflect.DeepEqual(c, before) {
		t.Fatal("draft validation mutated published configuration")
	}
	for _, a := range []Answers{
		{"unknown": json.RawMessage(`"private"`)},
		{"region": json.RawMessage(`true`)},
		{"restricted": json.RawMessage(`"yes"`)},
	} {
		if got := ValidateIntake(c, a, false); len(got.Issues) == 0 {
			t.Fatal("malformed draft accepted")
		}
	}
	a := Answers{"region": json.RawMessage(`"Test region"`), "restricted": json.RawMessage(`true`)}
	if got := ValidateIntake(c, a, false); len(got.Issues) != 0 {
		t.Fatal("incomplete draft rejected", got.Issues)
	}
	if got := ValidateIntake(c, a, true); len(got.Issues) == 0 {
		t.Fatal("conditional requirement or rejection rule bypassed")
	}
	a["details"] = json.RawMessage(`"Synthetic restriction"`)
	if got := ValidateIntake(c, a, true); len(got.Issues) == 0 {
		t.Fatal("combination rule bypassed")
	}
	a["restricted"] = json.RawMessage(`false`)
	got := ValidateIntake(c, a, true)
	if len(got.Issues) != 0 || got.Answers["details"] != nil {
		t.Fatal("hidden private value retained", got.Issues)
	}
	if got = ValidateIntake(Configuration{}, Answers{}, true); len(got.Issues) == 0 {
		t.Fatal("missing intake accepted")
	}
}

func TestIntakePublicationBoundaries(t *testing.T) {
	t.Parallel()
	for _, mutate := range []func(*IntakeForm){
		func(f *IntakeForm) { f.Name = "" },
		func(f *IntakeForm) { f.Fields = nil },
		func(f *IntakeForm) { f.Fields[0].Stage = "estimate" },
		func(f *IntakeForm) { f.Fields[0].Stage = "fulfillment" },
		func(f *IntakeForm) { f.Fields[0].Type = "attachment" },
		func(f *IntakeForm) { f.Fields[0].Type = "password" },
	} {
		c := intakeFixture()
		mutate(c.Intake)
		if len(ValidateConfiguration(c, true)) == 0 {
			t.Fatal("invalid intake published")
		}
	}
}
