package catalog

import (
	"encoding/json"
	"fmt"
	"slices"
	"testing"
)

func TestSellerCosmeticsBoundsAndRepairPaths(t *testing.T) {
	t.Parallel()
	c := fixture()
	c.Intake = &IntakeForm{Name: "Account details", Fields: []Field{{Key: "skins", Label: "Skins", Type: "cosmetics", Stage: "order", Required: true, Options: []Option{{Key: "Collector", Label: "Collector"}, {Key: "Epic", Label: "Epic"}}}}}
	valid := `{"groups":[{"category":"Collector","count":"2","names":["Aldous","Yu Zhong"]}]}`
	if issues := ValidateConfiguration(c, true); len(issues) > 0 {
		t.Fatal(issues)
	}
	for _, tc := range []struct{ name, raw, path string }{
		{"valid", valid, ""},
		{"empty", `{"groups":[]}`, "skins"},
		{"unknown shape", `{"groups":[],"secret":"no"}`, "skins"},
		{"scalar", `"old"`, "skins"},
		{"category", `{"groups":[{"category":"missing","count":"1","names":["Aldous"]}]}`, "skins.groups.0.category"},
		{"count mismatch", `{"groups":[{"category":"Collector","count":"2","names":["Aldous"]}]}`, "skins.groups.0.count"},
		{"fraction", `{"groups":[{"category":"Collector","count":"1.1","names":["Aldous"]}]}`, "skins.groups.0.count"},
		{"duplicates", `{"groups":[{"category":"Collector","count":"2","names":["Aldous","Aldous"]}]}`, "skins.groups.0.names"},
		{"duplicate category", `{"groups":[{"category":"Collector","count":"1","names":["Aldous"]},{"category":"Collector","count":"1","names":["Yu Zhong"]}]}`, "skins.groups.1.category"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			result := ValidateIntake(c, Answers{"skins": json.RawMessage(tc.raw)}, true)
			if tc.path == "" && len(result.Issues) > 0 || tc.path != "" && !slices.ContainsFunc(result.Issues, func(i Issue) bool { return i.Path == tc.path }) {
				t.Fatal(result.Issues)
			}
		})
	}
	if result := ValidateIntake(c, Answers{}, false); len(result.Issues) > 0 {
		t.Fatal("incomplete private draft rejected", result.Issues)
	}
	c.Services[0].Fields = append(c.Services[0].Fields, c.Intake.Fields[0])
	if issues := ValidateConfiguration(c, false); len(issues) == 0 {
		t.Fatal("cosmetics accepted as boost field")
	}
}

func TestLargeAndEmptyCosmeticCollectionsRemainBounded(t *testing.T) {
	t.Parallel()
	collection := CosmeticCollection{Groups: []CosmeticGroup{}}
	if issues := CosmeticCollectionIssues(collection); len(issues) > 0 {
		t.Fatal("explicit zero rejected", issues)
	}
	names := make([]string, 500)
	for i := range names {
		names[i] = fmt.Sprintf("Skin %d", i+1)
	}
	collection.Groups = []CosmeticGroup{{Category: "Epic", Count: "500", Names: names}, {Category: "Collector", Count: "500", Names: names}}
	if issues := CosmeticCollectionIssues(collection); len(issues) > 0 {
		t.Fatal(issues)
	}
	collection.Groups = append(collection.Groups, CosmeticGroup{Category: "Rare", Count: "1", Names: []string{"One more"}})
	if issues := CosmeticCollectionIssues(collection); len(issues) == 0 {
		t.Fatal("unbounded collection accepted")
	}
	if issues := CosmeticCollectionIssues(CosmeticCollection{Groups: make([]CosmeticGroup, 61)}); len(issues) == 0 {
		t.Fatal("unbounded groups accepted")
	}
}
