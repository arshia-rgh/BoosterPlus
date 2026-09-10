package catalog

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestReviewPublicationPolicyAndFeedback(t *testing.T) {
	t.Parallel()
	c := fixture()
	c.ReviewPolicy = &ReviewPolicy{Content: "Synthetic publication policy for isolated tests.", Fields: []Field{{Key: "communication", Label: "Communication", Type: "short_text", Stage: "order", MaxLength: 80}}, Rules: []Rule{}}
	if issues := ValidateConfiguration(c, true); len(issues) > 0 {
		t.Fatal(issues)
	}
	if got := ValidateReview(c, Answers{"communication": json.RawMessage(`"Clear communication"`)}); len(got.Issues) > 0 {
		t.Fatal(got.Issues)
	}
	if got := ValidateReview(c, Answers{"private_password": json.RawMessage(`"not allowed"`)}); len(got.Issues) == 0 {
		t.Fatal("unknown feedback accepted")
	}
	if got := ValidateReview(c, Answers{"communication": json.RawMessage(`true`)}); len(got.Issues) == 0 {
		t.Fatal("wrong feedback type accepted")
	}
	for _, change := range []func(*ReviewPolicy){func(p *ReviewPolicy) { p.Content = "" }, func(p *ReviewPolicy) { p.Content = strings.Repeat("界", 8001) }, func(p *ReviewPolicy) { p.Fields[0].Type = "attachment" }, func(p *ReviewPolicy) { p.Fields[0].Stage = "fulfillment" }, func(p *ReviewPolicy) { p.Fields[0].Stage = "estimate" }} {
		v := clone(c)
		change(v.ReviewPolicy)
		if len(ValidateConfiguration(v, true)) == 0 {
			t.Fatal("unsafe review policy published")
		}
	}
	c.ReviewPolicy.Fields = nil
	if len(ValidateConfiguration(c, true)) != 0 {
		t.Fatal("optional feedback attributes required")
	}
	c.ReviewPolicy = nil
	if len(ValidateReview(c, Answers{}).Issues) == 0 {
		t.Fatal("undeclared publication policy accepted")
	}
}
