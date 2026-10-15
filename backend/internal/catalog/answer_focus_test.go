package catalog

import (
	"encoding/json"
	"testing"
)

func TestCombinationRuleTargetsAnAnswer(t *testing.T) {
	for _, test := range []struct {
		rule Rule
		path string
	}{
		{Rule{Kind: "progression", From: "current", To: "target"}, "target"},
		{Rule{Kind: "disjoint", From: "roles", To: "heroes"}, "heroes"},
		{Rule{Kind: "reject", When: &Condition{Op: "all", Children: []Condition{{Field: "region"}}}}, "region"},
		{Rule{Kind: "reject", Key: "unavailable"}, "rules.unavailable"},
	} {
		if path := ruleAnswerPath(test.rule); path != test.path {
			t.Fatalf("got %s, want %s", path, test.path)
		}
	}
}

func TestRejectedCombinationKeepsItsRuleAndNamesTheEditableAnswer(t *testing.T) {
	c := linkedFixture()
	c.Services[0].Rules = []Rule{{Key: "reject_roaming", Kind: "reject", Message: "Choose another role for this service.", When: &Condition{Op: "eq", Field: "role", Values: []string{"Roaming"}}}}
	rejected := ValidateAnswers(c, "boost", "estimate", Answers{"role": json.RawMessage(`"Roaming"`)}, nil)
	if len(rejected.Issues) != 1 || rejected.Issues[0].Path != "role" || rejected.Issues[0].Message != "Choose another role for this service." {
		t.Fatal(rejected.Issues)
	}
	accepted := ValidateAnswers(c, "boost", "estimate", Answers{"role": json.RawMessage(`"Mid lane"`)}, nil)
	if len(accepted.Issues) != 0 {
		t.Fatal(accepted.Issues)
	}
}
