package suppliers

// Catalog is an untrusted private import snapshot, not a public shop publication.
// Products without a current price are retained rather than silently omitted.
type Catalog struct {
	Connection Connection `json:"connection"`
	Games      []Game     `json:"games"`
	Categories []Category `json:"categories"`
	Products   []Product  `json:"products"`
}

// Game identifies a supplier service; mapping it to a PLAYORA game is explicit.
type Game struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Icon   string `json:"icon"`
	Closed bool   `json:"closed"`
}

// Category retains the supplier hierarchy without guessing countries from names.
type Category struct {
	ID     string `json:"id"`
	GameID string `json:"game_id"`
	Name   string `json:"name"`
}

// Product retains all offers, including separate Vendoria forms and prices.
type Product struct {
	ID                   string   `json:"id"`
	GameID               string   `json:"game_id"`
	CategoryID           string   `json:"category_id"`
	Name                 string   `json:"name"`
	Icon                 string   `json:"icon"`
	Description          string   `json:"description"`
	Kind                 string   `json:"kind"`
	Platform             string   `json:"platform"`
	InstructionAvailable bool     `json:"instruction_available"`
	Region               Region   `json:"region"`
	Offers               []Offer  `json:"offers"`
	ReviewIssues         []string `json:"review_issues"`
}

// Region separates display groupings from authoritative country eligibility.
type Region struct {
	Global            bool     `json:"global"`
	Regions           []string `json:"regions"`
	Countries         []string `json:"countries"`
	ExcludedCountries []string `json:"excluded_countries"`
	PolicyKind        string   `json:"policy_kind"`
	PolicyCountries   []string `json:"policy_countries"`
}

// Offer is an available purchase method, subject to explicit staff review.
type Offer struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Cost              Decimal  `json:"cost"`
	Available         bool     `json:"available"`
	SuggestedDelivery string   `json:"suggested_delivery"`
	Fields            []Field  `json:"fields"`
	Quantity          Quantity `json:"quantity"`
	Instruction       string   `json:"instruction"`
	CodeRequest       bool     `json:"code_request"`
	GooglePrompt      bool     `json:"google_prompt"`
	GameExit          bool     `json:"game_exit"`
	ReviewIssues      []string `json:"review_issues"`
}

// Quantity preserves fractional supplier denominations without truncating them.
type Quantity struct {
	Kind string  `json:"kind"`
	Min  Decimal `json:"min"`
	Max  Decimal `json:"max"`
	Step Decimal `json:"step"`
}

// Field is a declarative input, never supplier HTML or executable validation.
// Secret means masked input; all recipient values still require private storage.
type Field struct {
	ID        string   `json:"id"`
	Label     string   `json:"label"`
	Kind      string   `json:"kind"`
	Required  bool     `json:"required"`
	Secret    bool     `json:"secret"`
	Transient bool     `json:"transient"`
	Pattern   string   `json:"pattern,omitempty"`
	Min       *Decimal `json:"min,omitempty"`
	Max       *Decimal `json:"max,omitempty"`
	Step      *Decimal `json:"step,omitempty"`
	Options   []Option `json:"options"`
}

// Option retains a stable provider value separately from its visible label.
type Option struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}
