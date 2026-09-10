package catalog

import (
	"encoding/json"
	"errors"
	"slices"
)

// FulfillmentPolicy pins the meaning of a mode selection in its catalog release.
// Missing policies keep historical catalogs readable but cannot grant game access.
type FulfillmentPolicy struct {
	Mode          string   `json:"mode"`
	Field         string   `json:"field"`
	AccountValue  string   `json:"account_value"`
	TogetherValue string   `json:"together_value"`
	SecretHours   int      `json:"secret_hours"`
	ShareFields   []string `json:"share_fields"`
}

// ErrFulfillmentPolicy prevents mode inference from field names or mutable drafts.
var ErrFulfillmentPolicy = errors.New("service fulfillment policy unavailable")

func validateFulfillment(service ServiceDefinition, refs map[string]Reference, path string, add func(string, string)) {
	p := service.Fulfillment
	if p == nil {
		return
	}
	path += ".fulfillment"
	if !slices.Contains([]string{"account", "together", "selection"}, p.Mode) {
		add(path, "Choose account, together or an explicit selection mapping.")
	}
	if (p.Mode == "account" || p.Mode == "selection") && (p.SecretHours < 1 || p.SecretHours > 720) {
		add(path, "Temporary game access must expire within 1–720 hours.")
	}
	if p.Mode == "together" && p.SecretHours != 0 {
		add(path, "Play together does not collect game credentials.")
	}
	if p.Mode != "selection" && (p.Field != "" || p.AccountValue != "" || p.TogetherValue != "") {
		add(path, "Fixed modes cannot also map a form selection.")
	}
	fields := fieldMap(service.Fields)
	if p.Mode == "selection" {
		f, ok := fields[p.Field]
		if !ok || (f.Type != "select" && f.Type != "radio") || !f.Required || f.VisibleWhen != nil || f.Stage == "fulfillment" {
			add(path, "Mode must use an always-visible required select/radio field collected before payment.")
		} else {
			options := optionsFor(f, refs)
			if len(options) != 2 || p.AccountValue == p.TogetherValue || !slices.ContainsFunc(options, func(o Option) bool { return o.Key == p.AccountValue }) || !slices.ContainsFunc(options, func(o Option) bool { return o.Key == p.TogetherValue }) {
				add(path, "Map the two distinct declared choices to account and together.")
			}
		}
	}
	if len(p.ShareFields) > 40 {
		add(path, "Share at most 40 named ordinary fields with assigned staff.")
	}
	seen := map[string]bool{}
	for _, key := range p.ShareFields {
		f, ok := fields[key]
		if !ok || seen[key] || f.Type == "attachment" {
			add(path, "Share unique existing ordinary fields; files use explicit proof sharing.")
		}
		seen[key] = true
	}
}

// FulfillmentMode resolves a validated immutable policy without interpreting labels.
func FulfillmentMode(service ServiceDefinition, answers Answers) (string, error) {
	p := service.Fulfillment
	if p == nil {
		return "", ErrFulfillmentPolicy
	}
	switch p.Mode {
	case "account", "together":
		return p.Mode, nil
	case "selection":
		var value string
		if err := json.Unmarshal(answers[p.Field], &value); err != nil {
			return "", ErrFulfillmentPolicy
		}
		if value == p.AccountValue && value != "" {
			return "account", nil
		}
		if value == p.TogetherValue && value != "" {
			return "together", nil
		}
	}
	return "", ErrFulfillmentPolicy
}
