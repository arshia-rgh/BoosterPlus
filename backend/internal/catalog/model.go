// Package catalog owns administrator-defined offerings and immutable releases.
package catalog

import "encoding/json"

// Configuration is a complete publication unit. All its copy is customer-visible;
// credentials, internal costs and executable expressions are deliberately absent.
type Configuration struct {
	SchemaVersion int                 `json:"schema_version"`
	Name          string              `json:"name"`
	Description   string              `json:"description"`
	Asset         string              `json:"asset"`
	AssetAlt      string              `json:"asset_alt"`
	Reviewed      bool                `json:"reviewed"`
	References    []Reference         `json:"references"`
	Services      []ServiceDefinition `json:"services"`
	Packages      []Package           `json:"packages"`
	FAQs          []FAQ               `json:"faqs"`
}

// Reference contains stable option keys in display/progression order.
type Reference struct {
	Key     string   `json:"key"`
	Label   string   `json:"label"`
	Kind    string   `json:"kind"`
	Options []Option `json:"options"`
}

// Option defines a stable choice; Units bounds stars/points within a rank/division.
type Option struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Units int    `json:"units"`
}

// ServiceDefinition pins its form, catalogs and evaluator in the same release.
type ServiceDefinition struct {
	Key         string             `json:"key"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Evaluator   string             `json:"evaluator"`
	Fields      []Field            `json:"fields"`
	Rules       []Rule             `json:"rules"`
	Pricing     *PricePlan         `json:"pricing,omitempty"`
	Fulfillment *FulfillmentPolicy `json:"fulfillment,omitempty"`
	Delivery    *DeliveryPolicy    `json:"delivery,omitempty"`
}

// Field is declarative. Numeric answers and bounds use exact decimal strings.
type Field struct {
	Key           string          `json:"key"`
	Label         string          `json:"label"`
	Help          string          `json:"help"`
	Type          string          `json:"type"`
	Stage         string          `json:"stage"`
	Required      bool            `json:"required"`
	Reference     string          `json:"reference"`
	Options       []Option        `json:"options"`
	Min           string          `json:"min"`
	Max           string          `json:"max"`
	Step          string          `json:"step"`
	Unit          string          `json:"unit"`
	MinLength     int             `json:"min_length"`
	MaxLength     int             `json:"max_length"`
	MinSelections int             `json:"min_selections"`
	MaxSelections int             `json:"max_selections"`
	Default       json.RawMessage `json:"default,omitempty"`
	VisibleWhen   *Condition      `json:"visible_when,omitempty"`
	RequiredWhen  *Condition      `json:"required_when,omitempty"`
}

// Condition supports typed leaves and bounded all/any groups, never executable code.
type Condition struct {
	Op       string      `json:"op"`
	Field    string      `json:"field"`
	Values   []string    `json:"values"`
	Children []Condition `json:"children"`
}

// Rule rejects combinations or compares configured rank positions/unit counts.
type Rule struct {
	Key       string     `json:"key"`
	Kind      string     `json:"kind"`
	Message   string     `json:"message"`
	When      *Condition `json:"when,omitempty"`
	From      string     `json:"from"`
	To        string     `json:"to"`
	FromUnits string     `json:"from_units"`
	ToUnits   string     `json:"to_units"`
}

// Package variants carry exact positive amounts, never floating-point money.
type Package struct {
	Key         string    `json:"key"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Service     string    `json:"service"`
	Variants    []Variant `json:"variants"`
}

// Variant eligibility uses the referenced service's ordinary nonsecret answers.
type Variant struct {
	Key              string     `json:"key"`
	Name             string     `json:"name"`
	Currency         string     `json:"currency"`
	AmountMinor      string     `json:"amount_minor"`
	Capacity         *int       `json:"capacity,omitempty"`
	DeliveryMinHours int        `json:"delivery_min_hours"`
	DeliveryMaxHours int        `json:"delivery_max_hours"`
	RequiredFields   []string   `json:"required_fields"`
	Eligibility      *Condition `json:"eligibility,omitempty"`
}

// FAQ is plain text, rendered without HTML interpretation.
type FAQ struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

// Issue paths refer to configuration keys/indices, never submitted private values.
type Issue struct {
	Path    string `json:"path"`
	Message string `json:"message"`
}

// Answers contain strings (including exact decimals), booleans or string arrays.
type Answers map[string]json.RawMessage

// Validation is authoritative normalization, not an order or price quotation.
type Validation struct {
	Answers Answers `json:"answers"`
	Issues  []Issue `json:"issues"`
}
