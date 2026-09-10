package catalog

// ReviewPolicy is administrator-declared publication policy and optional ordinary feedback fields.
// A published release versions the policy; no live moderation terms are invented by the application.
type ReviewPolicy struct {
	Content string  `json:"content"`
	Fields  []Field `json:"fields"`
	Rules   []Rule  `json:"rules"`
}

// Service reuses the typed evaluator for feedback, with no order or pricing side effects.
func (p ReviewPolicy) Service() ServiceDefinition {
	return IntakeForm{Name: "Purchase feedback", Fields: p.Fields, Rules: p.Rules}.Service()
}

func validateReviewPolicy(policy *ReviewPolicy, refs map[string]Reference, publish bool, add func(string, string)) {
	if policy == nil {
		return
	}
	if !validText(policy.Content, 1, 8000) {
		add("review_policy.content", "Declare the review publication policy in plain text (1–8,000 characters).")
	}
	validateForm(policy.Service(), refs, "review_policy", publish, add)
	for _, field := range policy.Fields {
		if field.Stage != "order" || field.Type == "attachment" {
			add("review_policy.fields", "Review feedback uses ordinary order-stage fields without images or credentials.")
		}
	}
}

// ValidateReview normalizes only the feedback declared in the accepted publication policy.
func ValidateReview(c Configuration, answers Answers) Validation {
	if c.ReviewPolicy == nil {
		return Validation{Answers: Answers{}, Issues: []Issue{{Path: "review_policy", Message: "A publication policy must be declared before submitting feedback."}}}
	}
	c.Intake = &IntakeForm{Name: "Purchase feedback", Fields: c.ReviewPolicy.Fields, Rules: c.ReviewPolicy.Rules}
	return ValidateIntake(c, answers, true)
}
