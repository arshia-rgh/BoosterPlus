package catalog

import (
	"encoding/json"
	"fmt"
	"math/big"
	"regexp"
	"slices"
	"strings"
	"unicode/utf8"
)

var (
	keyPattern     = regexp.MustCompile(`^[a-z][a-z0-9_]{0,47}$`)
	slugPattern    = regexp.MustCompile(`^[a-z][a-z0-9-]{0,79}$`)
	decimalPattern = regexp.MustCompile(`^-?(0|[1-9][0-9]{0,11})(\.[0-9]{1,6})?$`)
	amountPattern  = regexp.MustCompile(`^[1-9][0-9]{0,11}$`)
	assetPattern   = regexp.MustCompile(`^/catalog-assets/[a-z0-9][a-z0-9_-]{0,79}\.(png|jpg|webp|avif|svg)$`)
)

func decimal(value string) (*big.Rat, bool) {
	if !decimalPattern.MatchString(value) {
		return nil, false
	}
	number, ok := new(big.Rat).SetString(value)
	return number, ok
}

func validText(value string, lower, upper int) bool {
	return utf8.ValidString(value) && utf8.RuneCountInString(strings.TrimSpace(value)) >= lower && utf8.RuneCountInString(value) <= upper && !strings.ContainsRune(value, 0)
}

func stage(value string) int {
	switch value {
	case "estimate":
		return 0
	case "order":
		return 1
	case "fulfillment":
		return 2
	default:
		return -1
	}
}

// ValidateConfiguration performs structural checks on saves and complete semantic
// checks on publication. Drafts may contain unfinished forms, never unbounded data.
func ValidateConfiguration(c Configuration, publish bool) []Issue {
	issues := []Issue{}
	add := func(path, message string) { issues = append(issues, Issue{path, message}) }
	if c.SchemaVersion != 1 {
		add("schema_version", "Unsupported configuration version.")
	}
	if !validText(c.Name, 1, 120) || !validText(c.Description, 0, 4000) {
		add("name", "Use a name of 1–120 characters and a description up to 4,000 characters.")
	}
	if c.Asset != "" && (!assetPattern.MatchString(c.Asset) || !validText(c.AssetAlt, 1, 160)) {
		add("asset", "Choose an approved /catalog-assets/ filename and descriptive alternative text.")
	}
	if len(c.References) > 20 || len(c.Services) > 12 || len(c.Packages) > 40 || len(c.FAQs) > 20 {
		add("configuration", "Catalog limits exceeded.")
		return issues
	}
	if publish && (!c.Reviewed || len(c.Services)+len(c.Packages) == 0 && c.Intake == nil) {
		add("reviewed", "Review actual catalog data, availability, prices and customer promises before publication.")
	}
	refs := map[string]Reference{}
	for i, ref := range c.References {
		path := fmt.Sprintf("references.%d", i)
		if _, exists := refs[ref.Key]; exists || !keyPattern.MatchString(ref.Key) || !validText(ref.Label, 1, 120) || !slices.Contains([]string{"rank", "hero", "role", "region", "server", "choice"}, ref.Kind) {
			add(path, "Use a unique stable key, label and supported catalog kind.")
		}
		refs[ref.Key] = ref
		validateOptions(ref.Options, path, publish, add)
	}
	services := map[string]ServiceDefinition{}
	validateIntake(c.Intake, refs, publish, add)
	for i, service := range c.Services {
		path := fmt.Sprintf("services.%d", i)
		if _, exists := services[service.Key]; exists || !keyPattern.MatchString(service.Key) || !validText(service.Name, 1, 120) || !validText(service.Description, 0, 4000) {
			add(path, "Use a unique service key, name and bounded description.")
		}
		services[service.Key] = service
		if service.Evaluator != "manual-review-v1" && service.Evaluator != "pricing-v1" {
			add(path+".evaluator", "Choose a supported versioned evaluator.")
		}
		validateForm(service, refs, path, publish, add)
		validatePricing(service, refs, path+".pricing", publish, add)
		validateFulfillment(service, refs, path, add)
		validateDelivery(service, refs, path+".delivery", add)
	}
	packageKeys := map[string]bool{}
	for i, pack := range c.Packages {
		path := fmt.Sprintf("packages.%d", i)
		if packageKeys[pack.Key] || !keyPattern.MatchString(pack.Key) || !validText(pack.Name, 1, 120) || !validText(pack.Description, 0, 4000) || len(pack.Variants) > 20 || (publish && len(pack.Variants) == 0) {
			add(path, "Use a unique package key, name and 1–20 variants.")
		}
		packageKeys[pack.Key] = true
		service, found := services[pack.Service]
		if publish && !found {
			add(path+".service", "Choose an existing service to define eligibility and required information.")
		}
		fields := fieldMap(service.Fields)
		keys := map[string]bool{}
		for j, variant := range pack.Variants {
			vp := fmt.Sprintf("%s.variants.%d", path, j)
			if keys[variant.Key] || !keyPattern.MatchString(variant.Key) || !validText(variant.Name, 1, 120) {
				add(vp, "Use unique variant keys and labels.")
			}
			keys[variant.Key] = true
			if publish && (!slices.Contains([]string{"USD", "EUR", "GBP"}, variant.Currency) || !amountPattern.MatchString(variant.AmountMinor)) {
				add(vp+".amount_minor", "Set a positive amount in minor units for USD, EUR or GBP; crypto conversion belongs to checkout.")
			}
			if variant.Capacity != nil && (*variant.Capacity < 0 || *variant.Capacity > 1000000) {
				add(vp+".capacity", "Capacity must be between 0 and 1,000,000, or absent for unlimited.")
			}
			if variant.DeliveryMinHours < 0 || variant.DeliveryMaxHours < variant.DeliveryMinHours || variant.DeliveryMaxHours > 8760 || (publish && variant.DeliveryMinHours == 0) {
				add(vp+".delivery_min_hours", "Set a delivery range between 1 and 8,760 hours.")
			}
			if len(variant.RequiredFields) > 40 {
				add(vp, "Too many required fields.")
			}
			seen := map[string]bool{}
			for _, key := range variant.RequiredFields {
				field, ok := fields[key]
				if publish && (!ok || seen[key] || field.Stage == "fulfillment" || field.Type == "attachment") {
					add(vp+".required_fields", "Required package inputs must be unique estimate/order fields with an available input handler.")
				}
				seen[key] = true
			}
			if !validConditionShape(variant.Eligibility) {
				add(vp, "Condition structure exceeds supported bounds.")
			}
			if publish {
				validateCondition(variant.Eligibility, fields, refs, vp+".eligibility", 1, add)
			}
		}
	}
	for i, faq := range c.FAQs {
		if !validText(faq.Question, 1, 200) || !validText(faq.Answer, 1, 4000) {
			add(fmt.Sprintf("faqs.%d", i), "Use a question of 1–200 characters and answer of 1–4,000 characters.")
		}
	}
	if publish && len(issues) == 0 {
		validatePriceCases(c, add)
	}
	return issues
}

func validateOptions(options []Option, path string, publish bool, add func(string, string)) {
	if len(options) > 300 || (publish && len(options) == 0) {
		add(path, "A published catalog requires 1–300 verified options.")
		return
	}
	keys := map[string]bool{}
	for _, option := range options {
		if keys[option.Key] || !keyPattern.MatchString(option.Key) || !validText(option.Label, 1, 120) || option.Units < 0 || option.Units > 1000000 {
			add(path, "Options require unique stable keys, labels and unit bounds between 0 and 1,000,000.")
		}
		keys[option.Key] = true
	}
}

func fieldMap(fields []Field) map[string]Field {
	result := map[string]Field{}
	for _, field := range fields {
		result[field.Key] = field
	}
	return result
}
func optionsFor(field Field, refs map[string]Reference) []Option {
	if field.Reference != "" {
		return refs[field.Reference].Options
	}
	return field.Options
}

func validateForm(service ServiceDefinition, refs map[string]Reference, path string, publish bool, add func(string, string)) {
	if len(service.Fields) > 40 || len(service.Rules) > 40 {
		add(path, "A service supports up to 40 fields and 40 combination rules.")
		return
	}
	fields := fieldMap(service.Fields)
	seen := map[string]bool{}
	for i, field := range service.Fields {
		fp := fmt.Sprintf("%s.fields.%d", path, i)
		if seen[field.Key] || !keyPattern.MatchString(field.Key) || !validText(field.Label, 1, 120) || !validText(field.Help, 0, 1000) || !validText(field.Unit, 0, 40) {
			add(fp, "Use a unique field key, label and bounded help/unit text.")
		}
		seen[field.Key] = true
		if !slices.Contains([]string{"select", "radio", "multiselect", "boolean", "integer", "decimal", "short_text", "long_text", "rank", "attachment"}, field.Type) || stage(field.Stage) < 0 {
			add(fp, "Choose a supported field type and collection stage.")
		}
		if len(field.Options) > 300 || field.MinLength < 0 || field.MaxLength < field.MinLength || field.MaxLength > 4000 || field.MinSelections < 0 || field.MaxSelections < field.MinSelections || field.MaxSelections > 300 {
			add(fp, "Field bounds are invalid.")
		}
		if !validConditionShape(field.VisibleWhen) || !validConditionShape(field.RequiredWhen) {
			add(fp, "Condition structure exceeds supported bounds.")
		}
		if len(field.Default) > 0 {
			var value any
			if err := json.Unmarshal(field.Default, &value); err != nil {
				add(fp+".default", "Invalid default JSON.")
			} else {
				valid := false
				switch typed := value.(type) {
				case string, bool:
					valid = true
				case []any:
					valid = true
					for _, item := range typed {
						if _, ok := item.(string); !ok {
							valid = false
						}
					}
				}
				if !valid {
					add(fp+".default", "Defaults must be text, booleans or lists of text values.")
				}
			}
		}
		if !publish {
			continue
		}
		if field.Reference != "" {
			ref, ok := refs[field.Reference]
			if !ok || len(field.Options) != 0 || (field.Type == "rank" && ref.Kind != "rank") || !slices.Contains([]string{"select", "radio", "rank", "multiselect"}, field.Type) {
				add(fp+".reference", "Use one existing compatible reference catalog without inline options.")
			}
		}
		if slices.Contains([]string{"select", "radio", "rank", "multiselect"}, field.Type) {
			validateOptions(optionsFor(field, refs), fp+".options", true, add)
		}
		if field.Type == "rank" && field.Reference == "" {
			add(fp, "Rank fields require an ordered rank reference.")
		}
		if field.Type == "multiselect" && (field.MaxSelections == 0 || field.MinSelections > len(optionsFor(field, refs))) {
			add(fp, "Set feasible multiselect bounds.")
		}
		if field.Type == "integer" || field.Type == "decimal" {
			lower, a := decimal(field.Min)
			upper, b := decimal(field.Max)
			stepValue, d := decimal(field.Step)
			if !a || !b || !d || lower.Cmp(upper) > 0 || stepValue.Sign() <= 0 || (field.Type == "integer" && (!lower.IsInt() || !upper.IsInt() || !stepValue.IsInt())) {
				add(fp, "Numeric fields need ordered exact bounds and a positive compatible step.")
			}
		}
		if (field.Type == "short_text" || field.Type == "long_text") && (field.MaxLength == 0 || (field.Type == "short_text" && field.MaxLength > 500)) {
			add(fp, "Set a positive text length limit (short text: at most 500).")
		}
		// Upload ownership cannot be proved before the private file service ships.
		if field.Type == "attachment" && (field.Required || field.RequiredWhen != nil || len(field.Default) > 0) {
			add(fp, "Attachments must remain optional until the authorized upload service is available.")
		}
		validateCondition(field.VisibleWhen, fields, refs, fp+".visible_when", stage(field.Stage), add)
		validateCondition(field.RequiredWhen, fields, refs, fp+".required_when", stage(field.Stage), add)
		if len(field.Default) > 0 {
			if field.Type == "attachment" || validateValue(field, field.Default, refs) != "" {
				add(fp+".default", "Default does not satisfy field validation.")
			}
		}
	}
	for _, rule := range service.Rules {
		if !validConditionShape(rule.When) {
			add(path, "Condition structure exceeds supported bounds.")
		}
	}
	if !publish {
		return
	}
	visiting, done := map[string]bool{}, map[string]bool{}
	var visit func(string) bool
	visit = func(key string) bool {
		if visiting[key] {
			return false
		}
		if done[key] {
			return true
		}
		visiting[key] = true
		field := fields[key]
		for _, condition := range []*Condition{field.VisibleWhen, field.RequiredWhen} {
			for _, dep := range conditionFields(condition) {
				if !visit(dep) {
					return false
				}
			}
		}
		visiting[key] = false
		done[key] = true
		return true
	}
	for _, field := range service.Fields {
		if !visit(field.Key) {
			add(path+".fields", "Field dependencies contain a cycle.")
			break
		}
	}
	ruleKeys := map[string]bool{}
	for i, rule := range service.Rules {
		rp := fmt.Sprintf("%s.rules.%d", path, i)
		if ruleKeys[rule.Key] || !keyPattern.MatchString(rule.Key) || !validText(rule.Message, 1, 300) {
			add(rp, "Use unique rule keys and a customer-safe explanation.")
		}
		ruleKeys[rule.Key] = true
		validateCondition(rule.When, fields, refs, rp+".when", 2, add)
		from, fromOK := fields[rule.From]
		to, toOK := fields[rule.To]
		switch rule.Kind {
		case "reject":
			if rule.When == nil {
				add(rp, "A rejection rule requires a condition.")
			}
		case "disjoint":
			if !fromOK || !toOK || from.Type != "multiselect" || to.Type != "multiselect" || from.Reference == "" || from.Reference != to.Reference {
				add(rp, "Disjoint rules require two multiselect fields from the same reference catalog.")
			}
		case "progression":
			if !fromOK || !toOK || from.Type != "rank" || to.Type != "rank" || from.Reference != to.Reference {
				add(rp, "Progression requires two ranks from the same ordered reference catalog.")
			}
			for _, key := range []string{rule.FromUnits, rule.ToUnits} {
				if key != "" {
					field, ok := fields[key]
					if !ok || field.Type != "integer" {
						add(rp, "Progression units must reference integer fields.")
					}
				}
			}
		default:
			add(rp, "Unsupported combination rule.")
		}
	}
}
