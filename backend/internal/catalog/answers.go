package catalog

import (
	"encoding/json"
	"math/big"
	"slices"
	"strings"

	"github.com/google/uuid"
)

func validateValue(field Field, raw json.RawMessage, refs map[string]Reference) string {
	if string(raw) == "null" {
		return "Choose a value of the correct type."
	}
	if field.Type == "attachment" {
		var ids []string
		if field.Stage != "order" {
			return "Use the dedicated evidence upload for this stage."
		}
		if err := json.Unmarshal(raw, &ids); err != nil || len(ids) != 1 {
			return "Attach one checked image or remove the optional image."
		}
		id, err := uuid.Parse(ids[0])
		if err != nil || id.String() != ids[0] || id.Version() != 4 {
			return "Choose an image through the private upload control."
		}
		return ""
	}
	if field.Type == "boolean" {
		var value bool
		if err := json.Unmarshal(raw, &value); err != nil {
			return "Choose yes or no."
		}
		return ""
	}
	if field.Type == "multiselect" {
		var values []string
		if err := json.Unmarshal(raw, &values); err != nil || len(values) < field.MinSelections || len(values) > field.MaxSelections {
			return "Choose a valid number of options."
		}
		seen := map[string]bool{}
		for _, value := range values {
			if seen[value] || !slices.ContainsFunc(optionsFor(field, refs), func(o Option) bool { return o.Key == value }) {
				return "Choose unique, available options."
			}
			seen[value] = true
		}
		return ""
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return "Use a text or exact decimal value."
	}
	if IsWinRateField(field) && (field.Type == "win_rate" || value == "any" || strings.Contains(value, ":")) {
		if !validWinRate(value) {
			return "Choose a win-rate option and enter valid percentages from 0 to 100. A range must go from lower to higher."
		}
		return ""
	}
	switch field.Type {
	case "select", "radio", "rank":
		if !slices.ContainsFunc(optionsFor(field, refs), func(o Option) bool { return o.Key == value }) {
			return "Choose an available option."
		}
	case "short_text", "long_text":
		if !validText(value, field.MinLength, field.MaxLength) {
			return "Text does not satisfy the configured length limits."
		}
	case "integer", "decimal":
		number, ok := decimal(value)
		lower, minOK := decimal(field.Min)
		upper, maxOK := decimal(field.Max)
		stepValue, stepOK := decimal(field.Step)
		if !ok || !minOK || !maxOK || !stepOK || stepValue.Sign() <= 0 || number.Cmp(lower) < 0 || number.Cmp(upper) > 0 || (field.Type == "integer" && !number.IsInt()) {
			return "Use a number within the configured bounds."
		}
		if !new(big.Rat).Quo(new(big.Rat).Sub(number, lower), stepValue).IsInt() {
			return "Use the configured numeric step."
		}
	default:
		return "Unsupported input type."
	}
	return ""
}

// ValidateAnswers removes hidden answers, applies visible defaults and rejects
// unknown keys and later-stage data. File ownership is enforced transactionally
// by order creation/revision; public validation is never an access grant.
func ValidateAnswers(c Configuration, serviceKey, collectionStage string, submitted Answers, variant *Variant) Validation {
	result := Validation{Answers: Answers{}, Issues: []Issue{}}
	add := func(path, message string) { result.Issues = append(result.Issues, Issue{path, message}) }
	index := slices.IndexFunc(c.Services, func(s ServiceDefinition) bool { return s.Key == serviceKey })
	if index < 0 || stage(collectionStage) < 0 || len(submitted) > 40 {
		add("form", "Select an available service and collection stage.")
		return result
	}
	service := c.Services[index]
	fields := fieldMap(service.Fields)
	submitted = packageAnswers(variant, submitted, fields, collectionStage, add)
	refs := map[string]Reference{}
	for _, ref := range c.References {
		refs[ref.Key] = ref
	}
	for key := range submitted {
		field, ok := fields[key]
		switch {
		case !ok:
			add("form", "An unknown field was submitted.")
		case stage(field.Stage) > stage(collectionStage):
			add(key, "This information belongs to a later collection stage.")
		case field.Stage != "fulfillment" && !packageField(variant, key):
			add(key, "This field is not part of this fixed package's delivery information.")
		}
	}
	visiting, done := map[string]bool{}, map[string]bool{}
	var normalize func(string)
	normalize = func(key string) {
		if done[key] || visiting[key] {
			return
		}
		visiting[key] = true
		field, ok := fields[key]
		if !ok || stage(field.Stage) > stage(collectionStage) {
			return
		}
		if field.Stage != "fulfillment" && !packageField(variant, key) {
			done[key] = true
			return
		}
		for _, condition := range []*Condition{field.VisibleWhen, field.RequiredWhen} {
			for _, dependency := range conditionFields(condition) {
				normalize(dependency)
			}
		}
		done[key] = true
		if !matches(field.VisibleWhen, result.Answers, fields) {
			return
		}
		raw := submitted[key]
		if len(raw) == 0 && (variant == nil || variant.PresetAnswers == nil || field.Stage == "fulfillment") {
			raw = field.Default
		}
		required := field.Required || (field.RequiredWhen != nil && matches(field.RequiredWhen, result.Answers, fields)) || (variant != nil && slices.Contains(variant.RequiredFields, key))
		if len(raw) == 0 || string(raw) == `""` {
			if required {
				add(key, "This field is required.")
			}
			return
		}
		if field.Type == "cosmetics" {
			issues := validateCosmetics(field, raw, refs, required)
			if len(issues) > 0 {
				result.Issues = append(result.Issues, issues...)
				return
			}
			result.Answers[key] = slices.Clone(raw)
			return
		}
		if message := validateValue(field, raw, refs); message != "" {
			add(key, message)
			return
		}
		if required {
			var text string
			if err := json.Unmarshal(raw, &text); err == nil && strings.TrimSpace(text) == "" {
				add(key, "This field is required.")
				return
			}
			if field.Type == "multiselect" {
				var choices []string
				if err := json.Unmarshal(raw, &choices); err == nil && len(choices) == 0 {
					add(key, "Select at least one option.")
					return
				}
			}
		}
		// Preserve exact decimal strings; typed numeric conditions compare rational values.
		result.Answers[key] = slices.Clone(raw)
	}
	for _, field := range service.Fields {
		normalize(field.Key)
	}
	for _, rule := range service.Rules {
		pending := false
		for _, key := range []string{rule.From, rule.To, rule.FromUnits, rule.ToUnits} {
			if key != "" && stage(fields[key].Stage) > stage(collectionStage) {
				pending = true
			}
			if key != "" && fields[key].Stage != "fulfillment" && !packageField(variant, key) {
				pending = true
			}
		}
		if pending {
			continue
		}
		if !matches(rule.When, result.Answers, fields) {
			continue
		}
		bad := false
		switch rule.Kind {
		case "ordered_numbers":
			lower, lowerOK := decimal(answerString(result.Answers[rule.From]))
			upper, upperOK := decimal(answerString(result.Answers[rule.To]))
			if lowerOK && upperOK && lower.Cmp(upper) > 0 {
				add(rule.To, rule.Message)
			}
		case "linked_choices":
			if !matches(fields[rule.From].VisibleWhen, result.Answers, fields) || !matches(fields[rule.To].VisibleWhen, result.Answers, fields) {
				continue
			}
			if invalidLinkedChoices(rule, result.Answers) {
				add(rule.To, rule.Message)
			}
		case "reject":
			bad = true
		case "disjoint":
			var from, to []string
			if a := json.Unmarshal(result.Answers[rule.From], &from); a == nil {
				if b := json.Unmarshal(result.Answers[rule.To], &to); b == nil {
					bad = slices.ContainsFunc(from, func(value string) bool { return slices.Contains(to, value) })
				}
			}
		case "progression":
			bad = invalidProgression(rule, fields, refs, result.Answers)
		}
		if bad {
			add(ruleAnswerPath(rule), rule.Message)
		}
	}
	if variant != nil && collectionStage != "estimate" && !matches(variant.Eligibility, result.Answers, fields) {
		add("eligibility", "These selections are not eligible for the chosen package variant.")
	}
	if request := service.DeliveryRequest; request != nil {
		lower, lok := decimal(answerString(result.Answers[request.Minimum]))
		upper, hik := decimal(answerString(result.Answers[request.Maximum]))
		if lok && hik && lower.Cmp(upper) > 0 && !slices.ContainsFunc(result.Issues, func(issue Issue) bool { return issue.Path == request.Maximum }) {
			add(request.Maximum, "Maximum delivery hours must be at least the minimum hours you requested.")
		}
	}
	return result
}

// Point combination failures at an editable answer, not an internal rule key.
func ruleAnswerPath(rule Rule) string {
	for _, key := range []string{rule.To, rule.From, rule.ToUnits, rule.FromUnits} {
		if key != "" {
			return key
		}
	}
	var conditionField func(*Condition) string
	conditionField = func(condition *Condition) string {
		if condition == nil {
			return ""
		}
		if condition.Field != "" {
			return condition.Field
		}
		for i := range condition.Children {
			if key := conditionField(&condition.Children[i]); key != "" {
				return key
			}
		}
		return ""
	}
	if key := conditionField(rule.When); key != "" {
		return key
	}
	return "rules." + rule.Key
}

// ValidateNewAnswers validates newly selected order preferences. The ordinary
// validator remains compatible with exact numeric win rates in immutable older
// orders and published pricing cases. New selections must use an explicit mode;
// even a legacy scalar default must be reviewed instead of implying a guarantee.
// Inspecting normalized answers preserves hidden/later-stage field semantics.
func ValidateNewAnswers(c Configuration, serviceKey, collectionStage string, submitted Answers, variant *Variant) Validation {
	if variant != nil && variant.PresetAnswers == nil {
		return Validation{Answers: Answers{}, Issues: []Issue{{Path: "package", Message: "This package is being reviewed by staff. Please choose another offer or request a custom boost."}}}
	}
	result := ValidateAnswers(c, serviceKey, collectionStage, submitted, variant)
	for _, service := range c.Services {
		if service.Key != serviceKey {
			continue
		}
		for _, field := range service.Fields {
			raw, present := result.Answers[field.Key]
			if !present || !IsWinRateField(field) {
				continue
			}
			if !validWinRate(answerString(raw)) {
				delete(result.Answers, field.Key)
				result.Issues = append(result.Issues, Issue{Path: field.Key, Message: "Choose no preference, a range, below, above, or exactly 100% for this new request."})
			}
		}
	}
	return result
}

func invalidProgression(rule Rule, fields map[string]Field, refs map[string]Reference, answers Answers) bool {
	var from, to string
	if a := json.Unmarshal(answers[rule.From], &from); a != nil {
		return false
	}
	if b := json.Unmarshal(answers[rule.To], &to); b != nil {
		return false
	}
	options := optionsFor(fields[rule.From], refs)
	start := slices.IndexFunc(options, func(o Option) bool { return o.Key == from })
	end := slices.IndexFunc(options, func(o Option) bool { return o.Key == to })
	if start < 0 || end < 0 {
		return true
	}
	units := func(key string, option Option) (*big.Rat, bool) {
		if key == "" {
			return new(big.Rat), true
		}
		var value string
		if err := json.Unmarshal(answers[key], &value); err != nil {
			return nil, false
		}
		number, ok := decimal(value)
		unitStart, limit := 0, option.Units
		if option.UnitStart != nil {
			unitStart = *option.UnitStart
			limit += unitStart - 1
		}
		return number, ok && number.IsInt() && number.Cmp(new(big.Rat).SetInt64(int64(unitStart))) >= 0 && number.Cmp(new(big.Rat).SetInt64(int64(limit))) <= 0
	}
	left, a := units(rule.FromUnits, options[start])
	right, b := units(rule.ToUnits, options[end])
	return !a || !b || start > end || (start == end && left.Cmp(right) >= 0)
}
