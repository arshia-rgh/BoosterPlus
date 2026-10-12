package catalog

import (
	"encoding/json"
	"testing"
)

func TestDeliveryHoursRangeValidation(t *testing.T) {
	c := fixture()
	c.Packages = nil
	c.Services[0].Fields = []Field{
		{Key: "minimum", Label: "Minimum hours", Type: "integer", Stage: "estimate", Required: true, Min: "1", Max: "720", Step: "1"},
		{Key: "maximum", Label: "Maximum hours", Type: "integer", Stage: "estimate", Required: true, Min: "1", Max: "720", Step: "1"},
	}
	c.Services[0].Rules = []Rule{{Key: "hours", Kind: "ordered_numbers", From: "minimum", To: "maximum", Message: "Maximum hours must be at least minimum hours."}}
	c.Services[0].DeliveryRequest = &DeliveryRequest{Minimum: "minimum", Maximum: "maximum", Basis: DeliveryBasis}
	if issues := ValidateConfiguration(c, true); len(issues) != 0 {
		t.Fatal(issues)
	}
	for _, pair := range []struct {
		minimum, maximum string
		valid            bool
	}{
		{"12", "24", true}, {"24", "24", true}, {"24", "12", false}, {"0", "12", false}, {"12", "721", false}, {"12.5", "24", false}, {"", "24", false},
	} {
		lo, err := json.Marshal(pair.minimum)
		if err != nil {
			t.Fatal(err)
		}
		hi, err := json.Marshal(pair.maximum)
		if err != nil {
			t.Fatal(err)
		}
		result := ValidateAnswers(c, "boost", "estimate", Answers{"minimum": lo, "maximum": hi}, nil)
		if (len(result.Issues) == 0) != pair.valid {
			t.Fatal(pair, result.Issues)
		}
		if pair.minimum == "24" && pair.maximum == "12" && result.Issues[0].Path != "maximum" {
			t.Fatal("Reversed range must focus its maximum field")
		}
	}
	c.Services[0].Rules = nil
	if result := ValidateNewAnswers(c, "boost", "order", Answers{"minimum": json.RawMessage(`"24"`), "maximum": json.RawMessage(`"12"`)}, nil); len(result.Issues) != 1 || result.Issues[0].Path != "maximum" {
		t.Fatal("declared delivery request did not enforce its order", result)
	}
	c.Services[0].Fields[1].Stage = "order"
	if issues := ValidateConfiguration(c, true); len(issues) == 0 {
		t.Fatal("Range spanning stages published")
	}
}
