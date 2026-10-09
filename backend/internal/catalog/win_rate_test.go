package catalog

import (
	"encoding/json"
	"reflect"
	"testing"
	"time"
)

func TestWinRatePreferenceValidation(t *testing.T) {
	field := Field{Key: "requested_win_rate", Type: "win_rate", Stage: "estimate"}
	for _, value := range []string{"any", "range:0:100", "range:65.5:80", "below:100", "below:0.1", "above:0", "above:99.9", "exact:100"} {
		raw, err := json.Marshal(value)
		if err != nil {
			t.Fatal(err)
		}
		if issue := validateValue(field, raw, nil); issue != "" {
			t.Errorf("valid %q: %s", value, issue)
		}
	}
	for _, raw := range []string{`"75"`, `"exact:75"`, `"range:80:80"`, `"range:80:60"`, `"range:0:100.1"`, `"range:-1:50"`, `"below:0"`, `"above:100"`, `"above:75.55"`, `"above:7e1"`, `"above:075"`, `"range:50:70:90"`, `"any:50"`, `""`, `null`, `75`, `true`, `[]`, `{}`} {
		if issue := validateValue(field, json.RawMessage(raw), nil); issue == "" {
			t.Errorf("accepted invalid %s", raw)
		}
	}
}

func TestLegacyWinRateDoesNotChangeOtherNumericFields(t *testing.T) {
	legacy := Field{Key: "requested_win_rate", Type: "decimal", Unit: "%", Min: "0", Max: "100", Step: "0.1"}
	for _, raw := range []string{`"75.10"`, `"range:65:80"`, `"any"`} {
		if issue := validateValue(legacy, json.RawMessage(raw), nil); issue != "" {
			t.Fatalf("legacy %s: %s", raw, issue)
		}
	}
	ordinary := legacy
	ordinary.Key = "completion_percentage"
	if issue := validateValue(ordinary, json.RawMessage(`"range:65:80"`), nil); issue == "" {
		t.Fatal("ordinary decimal accepted preference")
	}
}

func TestLegacyWinRatePricingCannotDropSurcharge(t *testing.T) {
	field := Field{Key: "requested_win_rate", Type: "decimal", Unit: "%", Min: "0", Max: "100", Step: "0.1"}
	service := ServiceDefinition{Evaluator: "pricing-v1", Fields: []Field{field}, Pricing: &PricePlan{Currency: "USD", BaseMinor: "1000", MinimumMinor: "1", MaximumMinor: "100000", Rules: []PriceRule{{Kind: "fixed", Value: "500", When: &Condition{Op: "gte", Field: field.Key, Values: []string{"80"}}}}}}
	for _, value := range []string{`"range:80:90"`, `"above:85"`, `"exact:100"`, `"any"`} {
		outcome, _, amount, _, _ := evaluatePrice(Configuration{}, service, Answers{field.Key: json.RawMessage(value)})
		if outcome != "manual_review" || amount != "" {
			t.Fatalf("new request %s silently evaluated legacy pricing: %s %s", value, outcome, amount)
		}
	}
	outcome, _, amount, _, _ := evaluatePrice(Configuration{}, service, Answers{field.Key: json.RawMessage(`"85"`)})
	if outcome != "estimated" || amount != "1500" {
		t.Fatalf("legacy exact calculation changed: %s %s", outcome, amount)
	}
}

func TestNewWinRateSelectionBoundaries(t *testing.T) {
	legacy := Field{Key: "requested_win_rate", Type: "decimal", Stage: "estimate", Unit: "%", Min: "0", Max: "100", Step: "0.1"}
	for _, kind := range []string{"decimal", "win_rate"} {
		for _, value := range []string{`"85"`, `"100"`, `"any"`, `"range:65:80"`, `"below:80"`, `"above:65"`, `"exact:100"`} {
			t.Run(kind+"/"+value, func(t *testing.T) {
				field := legacy
				field.Type = kind
				c := Configuration{Services: []ServiceDefinition{{Key: "boost", Fields: []Field{field}}}}
				submitted := Answers{field.Key: json.RawMessage(value)}
				got := ValidateNewAnswers(c, "boost", "order", submitted, nil)
				invalid := value == `"85"` || value == `"100"`
				if (len(got.Issues) > 0) != invalid || (got.Answers[field.Key] == nil) != invalid {
					t.Fatalf("invalid=%v: %+v", invalid, got)
				}
				if string(submitted[field.Key]) != value {
					t.Fatal("validation changed the caller's historical input")
				}
			})
		}
	}
}

func TestNewWinRateNormalizationBoundaries(t *testing.T) {
	legacy := Field{Key: "requested_win_rate", Type: "decimal", Stage: "estimate", Unit: "%", Min: "0", Max: "100", Step: "0.1", Default: json.RawMessage(`"75"`)}
	for _, scenario := range []struct {
		name   string
		change func(*Field)
		stage  string
		issues int
	}{
		{"visible scalar default", func(*Field) {}, "order", 1},
		{"hidden scalar default", func(f *Field) { f.VisibleWhen = &Condition{Op: "eq", Field: "show", Values: []string{"true"}} }, "order", 0},
		{"future scalar default", func(f *Field) { f.Stage = "fulfillment" }, "order", 0},
		{"ordinary percent", func(f *Field) { f.Key = "completion_percentage" }, "order", 0},
		{"different bounds", func(f *Field) { f.Max = "200" }, "order", 0},
		{"different unit", func(f *Field) { f.Unit = "points" }, "order", 0},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			field := legacy
			scenario.change(&field)
			c := Configuration{Services: []ServiceDefinition{{Key: "boost", Fields: []Field{{Key: "show", Type: "boolean", Stage: "estimate"}, field}}}}
			answers := Answers{"show": json.RawMessage("false")}
			got := ValidateNewAnswers(c, "boost", scenario.stage, answers, nil)
			if len(got.Issues) != scenario.issues {
				t.Fatalf("unexpected normalization issues: %+v", got)
			}
			if scenario.issues > 0 && got.Answers[field.Key] != nil {
				t.Fatal("invalid legacy default was retained")
			}
			if scenario.issues == 0 && !reflect.DeepEqual(got, ValidateAnswers(c, "boost", scenario.stage, answers, nil)) {
				t.Fatal("hidden, future or ordinary numeric semantics changed")
			}
		})
	}
	// Hidden submitted scalars are removed before strict checks. Later-stage
	// submissions retain the ordinary stage error without a second WR error.
	legacy.VisibleWhen = &Condition{Op: "eq", Field: "show", Values: []string{"true"}}
	c := Configuration{Services: []ServiceDefinition{{Key: "boost", Fields: []Field{{Key: "show", Type: "boolean", Stage: "estimate"}, legacy}}}}
	answers := Answers{"show": json.RawMessage("false"), legacy.Key: json.RawMessage(`"85"`)}
	if got := ValidateNewAnswers(c, "boost", "order", answers, nil); len(got.Issues) != 0 || got.Answers[legacy.Key] != nil {
		t.Fatalf("hidden answer affected new validation: %+v", got)
	}
	c.Services[0].Fields[1].Stage = "fulfillment"
	if got, old := ValidateNewAnswers(c, "boost", "order", answers, nil), ValidateAnswers(c, "boost", "order", answers, nil); !reflect.DeepEqual(got, old) || len(got.Issues) != 1 {
		t.Fatalf("stage exclusion changed: %+v", got)
	}
}

func TestNewCalculationPreservesHistoricalWinRate(t *testing.T) {
	field := Field{Key: "requested_win_rate", Type: "decimal", Stage: "estimate", Unit: "%", Min: "0", Max: "100", Step: "0.1"}
	service := ServiceDefinition{Key: "boost", Evaluator: "pricing-v1", Fields: []Field{field}, Pricing: &PricePlan{Currency: "USD", BaseMinor: "1000", MinimumMinor: "1", MaximumMinor: "100000", Rules: []PriceRule{{Key: "winrate", Kind: "fixed", Value: "500", When: &Condition{Op: "gte", Field: field.Key, Values: []string{"80"}}}}}}
	release := Release{ID: "historical", Configuration: Configuration{Services: []ServiceDefinition{service}}}
	answers := Answers{field.Key: json.RawMessage(`"85"`)}
	now := time.Date(2026, time.October, 8, 0, 0, 0, 0, time.UTC)
	if got := Calculate(release, "boost", answers, now); got.Outcome != "estimated" || got.AmountMinor != "1500" || len(got.Issues) != 0 {
		t.Fatalf("historical published calculation changed: %+v", got)
	}
	if got := CalculateNew(release, "boost", answers, now); got.Outcome != "invalid" || got.AmountMinor != "" || len(got.Issues) != 1 || got.Answers[field.Key] != nil {
		t.Fatalf("new calculation accepted a scalar guarantee: %+v", got)
	}
	if got := ValidateAnswers(release.Configuration, "boost", "fulfillment", answers, nil); len(got.Issues) != 0 {
		t.Fatalf("historical fulfillment validation changed: %+v", got)
	}
	answers[field.Key] = json.RawMessage(`"range:80:90"`)
	if got := CalculateNew(release, "boost", answers, now); got.Outcome != "manual_review" || got.AmountMinor != "" || len(got.Issues) != 0 {
		t.Fatalf("new preference dropped historical surcharge instead of requesting review: %+v", got)
	}
}
