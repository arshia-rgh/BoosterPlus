package catalog

import "slices"

// IntakeForm declares ordinary account-resale attributes, not credentials or commercial terms.
type IntakeForm struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Fields      []Field        `json:"fields"`
	Rules       []Rule         `json:"rules"`
	Summary     *IntakeSummary `json:"summary,omitempty"`
}

// IntakeSummary identifies seller claims offered for explicit staff review.
// Mapping a field never publishes it automatically.
type IntakeSummary struct {
	HeroCount      string `json:"hero_count"`
	SkinCollection string `json:"skin_collection"`
	SellingPoint   string `json:"selling_point"`
	HasSkins       string `json:"has_skins"`
}

// Service reuses the typed form evaluator without adding boosting or payment semantics.
func (f IntakeForm) Service() ServiceDefinition {
	return ServiceDefinition{Key: "account_intake", Name: f.Name, Description: f.Description, Evaluator: "manual-review-v1", Fields: slices.Clone(f.Fields), Rules: slices.Clone(f.Rules)}
}

func validateIntake(form *IntakeForm, refs map[string]Reference, publish bool, add func(string, string)) {
	if form == nil {
		return
	}
	if !validText(form.Name, 1, 120) || !validText(form.Description, 0, 4000) || publish && len(form.Fields) == 0 {
		add("intake", "Declare an account intake name, description and at least one published attribute.")
	}
	validateForm(form.Service(), refs, "intake", publish, add)
	for _, field := range form.Fields {
		if field.Stage != "order" || field.Type == "attachment" {
			add("intake.fields", "Intake uses ordinary order-stage fields. Upload ownership screenshots in the private review conversation; credentials use a later secure handoff.")
		}
	}
	if publish && form.Summary != nil {
		fields := fieldMap(form.Fields)
		for _, part := range []struct{ key, field, kind string }{
			{"hero_count", form.Summary.HeroCount, "integer"}, {"skin_collection", form.Summary.SkinCollection, "cosmetics"},
			{"selling_point", form.Summary.SellingPoint, "short_text"}, {"has_skins", form.Summary.HasSkins, "boolean"},
		} {
			if part.field != "" && fields[part.field].Type != part.kind {
				add("intake.summary."+part.key, "Choose an existing intake field of the matching type.")
			}
		}
	}
}

// ValidateIntake permits incomplete drafts while rejecting invalid values and unknown keys.
// Submission evaluates all required fields and combination rules from the pinned release.
func ValidateIntake(c Configuration, answers Answers, submit bool) Validation {
	if c.Intake == nil {
		return Validation{Answers: Answers{}, Issues: []Issue{{Path: "intake", Message: "Account submissions are not configured for this game."}}}
	}
	service := c.Intake.Service()
	if !submit {
		service.Rules = nil
		for i := range service.Fields {
			service.Fields[i].Required = false
			service.Fields[i].RequiredWhen = nil
		}
	}
	c.Services = []ServiceDefinition{service}
	return ValidateAnswers(c, service.Key, "order", answers, nil)
}
