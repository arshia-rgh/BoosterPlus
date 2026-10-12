package catalog

import (
	"encoding/json"
	"reflect"
	"slices"
)

func packageField(variant *Variant, key string) bool {
	if variant == nil || variant.PresetAnswers == nil {
		return true // Immutable legacy orders retain their original form semantics.
	}
	_, fixed := (*variant.PresetAnswers)[key]
	return fixed || slices.Contains(variant.RequiredFields, key)
}

func packageAnswers(variant *Variant, submitted Answers, fields map[string]Field, collectionStage string, add func(string, string)) Answers {
	if variant == nil || variant.PresetAnswers == nil {
		return submitted
	}
	merged := Answers{}
	for key, raw := range submitted {
		merged[key] = raw
	}
	for key, fixed := range *variant.PresetAnswers {
		if field, known := fields[key]; known && stage(field.Stage) > stage(collectionStage) {
			continue // A later fixed value is not customer-submitted early data.
		}
		if raw, ok := submitted[key]; ok && !sameAnswer(raw, fixed) {
			add(key, "This is a fixed part of the package and cannot be changed.")
		}
		merged[key] = slices.Clone(fixed)
	}
	return merged
}

func sameAnswer(left, right json.RawMessage) bool {
	var a, b any
	return json.Unmarshal(left, &a) == nil && json.Unmarshal(right, &b) == nil && reflect.DeepEqual(a, b)
}

func validatePackageScope(variant Variant, service ServiceDefinition, refs map[string]Reference, path string, publish bool, add func(string, string)) {
	if len(variant.ExcludedFields) > 40 {
		add(path+".excluded_fields", "Package scope cannot exceed 40 fields.")
		return
	}
	if variant.PresetAnswers == nil {
		if publish {
			add(path+".preset_answers", "Define this offer's fixed contents and delivery information before publishing. Existing orders keep their agreed contents.")
		}
		return
	}
	if len(*variant.PresetAnswers) > 40 || len(variant.ExcludedFields) > 40 {
		add(path+".preset_answers", "Package scope cannot exceed 40 fields.")
		return
	}
	if !publish {
		return
	}
	fields := fieldMap(service.Fields)
	if service.Fulfillment != nil && service.Fulfillment.Mode == "selection" && !packageField(&variant, service.Fulfillment.Field) {
		add(path+".preset_answers."+service.Fulfillment.Field, "Include the play mode so this package can be delivered using its fulfillment policy.")
	}
	seen := map[string]bool{}
	for _, key := range variant.ExcludedFields {
		field, ok := fields[key]
		if !ok || field.Stage == "fulfillment" || seen[key] {
			add(path+".excluded_fields."+key, "Choose unique estimate/order fields that this offer does not include.")
		}
		seen[key] = true
	}
	for key, raw := range *variant.PresetAnswers {
		field, ok := fields[key]
		p := path + ".preset_answers." + key
		if !ok || field.Stage == "fulfillment" || field.Type == "attachment" {
			add(p, "Use a non-secret estimate/order field for a fixed package value.")
			continue
		}
		if message := validateValue(field, raw, refs); message != "" {
			add(p, message)
		} else if IsWinRateField(field) && !validWinRate(answerString(raw)) {
			add(p, "Set an explicit win-rate preference for this offer.")
		}
		for _, dependency := range conditionFields(field.VisibleWhen) {
			if _, fixed := (*variant.PresetAnswers)[dependency]; !fixed {
				add(p, "Fixed contents cannot depend on a customer's answer. Fix the visibility condition's fields too.")
			}
		}
		if !matches(field.VisibleWhen, *variant.PresetAnswers, fields) {
			add(p, "This fixed value is hidden by its visibility condition. Change the condition's fixed values or exclude the field.")
		}
	}
	for _, field := range service.Fields {
		if field.Stage == "fulfillment" {
			continue
		}
		count := 0
		if _, fixed := (*variant.PresetAnswers)[field.Key]; fixed {
			count++
		}
		if slices.Contains(variant.RequiredFields, field.Key) {
			count++
			for _, key := range conditionFields(field.VisibleWhen) {
				if !packageField(&variant, key) {
					add(path+".preset_answers."+field.Key, "Delivery information must not depend on an excluded field.")
				}
			}
		}
		if seen[field.Key] {
			count++
		}
		if count != 1 {
			add(path+".preset_answers."+field.Key, "Choose exactly one: fixed value, customer delivery information, or not included in this offer.")
		}
	}
	// Missing customer information is expected here; contradictions among fixed
	// values are not. Normal order validation checks the completed combination.
	validated := ValidateAnswers(Configuration{Services: []ServiceDefinition{service}, References: references(refs)}, service.Key, "order", Answers{}, &variant)
	for _, issue := range validated.Issues {
		if issue.Path == "eligibility" && !slices.ContainsFunc(conditionFields(variant.Eligibility), func(key string) bool { return slices.Contains(variant.RequiredFields, key) }) {
			add(path+".eligibility", "The fixed contents do not satisfy this offer's eligibility condition.")
			continue
		}
		if _, fixed := (*variant.PresetAnswers)[issue.Path]; fixed || !slices.Contains(variant.RequiredFields, issue.Path) && issue.Path != "eligibility" {
			add(path+".preset_answers."+issue.Path, issue.Message)
		}
	}
}

func references(refs map[string]Reference) []Reference {
	result := make([]Reference, 0, len(refs))
	for _, ref := range refs {
		result = append(result, ref)
	}
	return result
}
