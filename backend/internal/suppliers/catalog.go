package suppliers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"unicode/utf8"
)

// Catalog loads whole catalogs, not one request per game/product. Callers commit
// the resulting snapshot atomically only after every required read succeeds.
func (c *Client) Catalog(ctx context.Context) (Catalog, error) {
	if c.connection.nexus() {
		raw, err := c.request(ctx, http.MethodGet, "/api/v1/catalog?include=metadata", nil, maxResponse)
		if err != nil {
			return Catalog{}, err
		}
		catalog, err := normalizeNexus(c.connection, raw)
		if err != nil {
			return Catalog{}, err
		}
		return c.nexusDynamic(ctx, catalog)
	}
	paths := []string{"/api/services", "/api/categories", "/api/forms", "/api/products?prices=true"}
	var values [4][]byte
	for i, path := range paths {
		raw, err := c.request(ctx, http.MethodGet, path, nil, maxResponse)
		if err != nil {
			return Catalog{}, err
		}
		values[i] = raw
	}
	return normalizeVendoria(c.connection, values)
}

type sourceField struct {
	ID       string          `json:"id"`
	Label    string          `json:"label"`
	Type     string          `json:"type"`
	Required bool            `json:"required"`
	Regex    string          `json:"regex"`
	Min      *Decimal        `json:"min"`
	Max      *Decimal        `json:"max"`
	Step     *Decimal        `json:"step"`
	Options  json.RawMessage `json:"options"`
}

func plain(value string, minimum, maximum int) bool {
	return utf8.ValidString(value) && len(strings.TrimSpace(value)) >= minimum && len(value) <= maximum && !strings.ContainsRune(value, 0)
}
func sourceID(value string) bool {
	return plain(value, 1, 240) && !strings.ContainsAny(value, " \r\n\t?#/\\") && value != "__proto__" && value != "constructor" && value != "prototype"
}
func secretField(id string) bool {
	key := strings.ToLower(id)
	for _, fragment := range []string{"password", "passwd", "secret", "token", "backup", "recovery", "code", "cookie"} {
		if strings.Contains(key, fragment) {
			return true
		}
	}
	return false
}
func normalizeFields(fields []sourceField, nexus bool) ([]Field, []string, error) {
	if len(fields) > 64 {
		return nil, nil, ErrEvidence
	}
	out, issues := []Field{}, []string{}
	seen := map[string]bool{}
	for _, source := range fields {
		if !sourceID(source.ID) || seen[source.ID] || !plain(source.Label, 1, 500) || len(source.Regex) > 1000 {
			return nil, nil, ErrEvidence
		}
		seen[source.ID] = true
		field := Field{ID: source.ID, Label: source.Label, Kind: source.Type, Required: source.Required, Secret: source.Type == "secret" || secretField(source.ID), Transient: nexus && source.Type == "secret", Pattern: source.Regex, Min: source.Min, Max: source.Max, Step: source.Step, Options: []Option{}}
		if field.Kind == "secret" {
			field.Kind = "text"
		}
		if !slices.Contains([]string{"text", "number", "select", "image"}, field.Kind) {
			issues = append(issues, "unsupported_field_type")
		}
		if field.Pattern != "" {
			if _, err := regexp.Compile(field.Pattern); err != nil {
				issues = append(issues, "field_pattern_needs_review")
			}
		}
		if field.Kind == "select" {
			if nexus {
				if json.Unmarshal(source.Options, &field.Options) != nil {
					return nil, nil, ErrEvidence
				}
			} else {
				var options []string
				if json.Unmarshal(source.Options, &options) != nil {
					return nil, nil, ErrEvidence
				}
				for _, option := range options {
					field.Options = append(field.Options, Option{ID: option, Label: option})
				}
			}
			if len(field.Options) == 0 || len(field.Options) > 2000 {
				issues = append(issues, "field_options_need_review")
			}
			options := map[string]bool{}
			for _, option := range field.Options {
				if !plain(option.ID, 1, 500) || !plain(option.Label, 1, 500) || options[option.ID] {
					return nil, nil, ErrEvidence
				}
				options[option.ID] = true
			}
		}
		out = append(out, field)
	}
	return out, issues, nil
}

func suggestedDelivery(fields []Field, kind string, loginDefault bool) string {
	for _, field := range fields {
		if field.Secret {
			return "account"
		}
	}
	if kind == "cdkey" || kind == "gift_card" {
		return "code"
	}
	if loginDefault {
		return "review"
	}
	return "id"
}

func parentID[T any](id string, parents map[string]T) string {
	for {
		index := strings.LastIndex(id, ":")
		if index < 1 {
			return ""
		}
		id = id[:index]
		if _, ok := parents[id]; ok {
			return id
		}
	}
}

type nexusMetadata struct {
	Region *struct {
		Global    bool     `json:"global"`
		Regions   []string `json:"regions"`
		Countries []string `json:"countries"`
		Excluded  []string `json:"excludedCountries"`
	} `json:"region"`
	PolicyKind string `json:"countryPolicyKind"`
	Policy     *struct {
		Kind      string   `json:"kind"`
		Countries []string `json:"countries"`
	} `json:"countryPolicy"`
}
type nexusProduct struct {
	ID              string        `json:"id"`
	Name            string        `json:"name"`
	Icon            string        `json:"icon"`
	Price           Decimal       `json:"price"`
	Fields          []sourceField `json:"deliveryData"`
	Type            string        `json:"type"`
	Platform        string        `json:"platform"`
	Description     string        `json:"description"`
	HaveInstruction bool          `json:"haveInstruction"`
	Amount          struct {
		Type string   `json:"type"`
		Min  *Decimal `json:"min"`
		Max  *Decimal `json:"max"`
		Step *Decimal `json:"step"`
	} `json:"amountType"`
	Metadata *nexusMetadata `json:"metadata"`
}

func normalizeNexus(connection Connection, raw []byte) (Catalog, error) {
	var source struct {
		Games      []Game         `json:"games"`
		Categories []Category     `json:"categories"`
		Products   []nexusProduct `json:"products"`
	}
	if decode(raw, &source) != nil || len(source.Games) > 10000 || len(source.Categories) > 30000 || len(source.Products) > 100000 {
		return Catalog{}, ErrEvidence
	}
	out := Catalog{Connection: connection, Games: source.Games, Categories: []Category{}, Products: []Product{}}
	games, categories, products := map[string]Game{}, map[string]Category{}, map[string]bool{}
	for _, game := range source.Games {
		if !sourceID(game.ID) || !plain(game.Name, 1, 500) {
			return Catalog{}, ErrEvidence
		}
		if _, exists := games[game.ID]; exists {
			return Catalog{}, ErrEvidence
		}
		games[game.ID] = game
	}
	for _, category := range source.Categories {
		category.GameID = parentID(category.ID, games)
		if !sourceID(category.ID) || category.GameID == "" || !plain(category.Name, 1, 500) {
			return Catalog{}, ErrEvidence
		}
		if _, exists := categories[category.ID]; exists {
			return Catalog{}, ErrEvidence
		}
		categories[category.ID] = category
		out.Categories = append(out.Categories, category)
	}
	for _, row := range source.Products {
		categoryID := parentID(row.ID, categories)
		if !sourceID(row.ID) || products[row.ID] || categoryID == "" || !plain(row.Name, 1, 500) || !plain(row.Description, 0, 32000) {
			return Catalog{}, ErrEvidence
		}
		products[row.ID] = true
		cost, err := row.Price.Rational()
		if err != nil {
			return Catalog{}, ErrEvidence
		}
		fields, issues, err := normalizeFields(row.Fields, true)
		if err != nil {
			return Catalog{}, err
		}
		quantity := Quantity{Kind: row.Amount.Type, Min: "1", Max: "1", Step: "1"}
		if quantity.Kind == "multiple" {
			quantity.Min = "0"
			quantity.Max = "0"
			quantity.Step = "0"
			if row.Amount.Min != nil {
				quantity.Min = *row.Amount.Min
			}
			if row.Amount.Max != nil {
				quantity.Max = *row.Amount.Max
			}
			if row.Amount.Step != nil {
				quantity.Step = *row.Amount.Step
			}
		} else if quantity.Kind != "one" {
			issues = append(issues, "quantity_needs_review")
		}
		if !slices.Contains([]string{"topup", "cdkey", "gift_card", "subscription"}, row.Type) {
			issues = append(issues, "product_type_needs_review")
		}
		region := Region{}
		if row.Metadata != nil {
			region.PolicyKind = row.Metadata.PolicyKind
			if r := row.Metadata.Region; r != nil {
				region.Global = r.Global
				region.Regions = r.Regions
				region.Countries = r.Countries
				region.ExcludedCountries = r.Excluded
			}
			if policy := row.Metadata.Policy; policy != nil {
				region.PolicyKind = policy.Kind
				region.PolicyCountries = policy.Countries
			}
		}
		offer := Offer{ID: "default", Name: "Standard", Cost: row.Price, Available: cost.Sign() > 0, SuggestedDelivery: suggestedDelivery(fields, row.Type, false), Fields: fields, Quantity: quantity, ReviewIssues: issues}
		out.Products = append(out.Products, Product{ID: row.ID, GameID: categories[categoryID].GameID, CategoryID: categoryID, Name: row.Name, Icon: row.Icon, Description: row.Description, Kind: row.Type, Platform: row.Platform, InstructionAvailable: row.HaveInstruction, Region: region, Offers: []Offer{offer}})
	}
	return out, nil
}

type vendoriaService struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Icon   string `json:"icon"`
	Closed bool   `json:"isClosed"`
}
type vendoriaCategory struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	ServiceID int64  `json:"serviceId"`
}
type vendoriaForm struct {
	ID          int64         `json:"id"`
	Name        string        `json:"name"`
	ServiceID   int64         `json:"serviceId"`
	Fields      []sourceField `json:"fields"`
	Request     bool          `json:"hasRequest"`
	Prompt      bool          `json:"hasGooglePrompt"`
	Exit        bool          `json:"hasGameExitRequest"`
	Archived    bool          `json:"isArchived"`
	Instruction string        `json:"instruction"`
}
type vendoriaProduct struct {
	ID          int64              `json:"id"`
	Name        string             `json:"name"`
	Icon        string             `json:"icon"`
	CategoryID  int64              `json:"categoryId"`
	Code        bool               `json:"haveCDKey"`
	Instruction string             `json:"instruction"`
	Prices      map[string]Decimal `json:"prices"`
}

func normalizeVendoria(connection Connection, values [4][]byte) (Catalog, error) {
	var services []vendoriaService
	var categories []vendoriaCategory
	var forms []vendoriaForm
	var products []vendoriaProduct
	if decode(values[0], &services) != nil || decode(values[1], &categories) != nil || decode(values[2], &forms) != nil || decode(values[3], &products) != nil || len(services) > 10000 || len(categories) > 30000 || len(forms) > 30000 || len(products) > 100000 {
		return Catalog{}, ErrEvidence
	}
	out := Catalog{Connection: connection, Games: []Game{}, Categories: []Category{}, Products: []Product{}}
	games := map[int64]vendoriaService{}
	groups := map[int64]vendoriaCategory{}
	methods := map[string]vendoriaForm{}
	seen := map[int64]bool{}
	for _, row := range services {
		if row.ID < 1 || !plain(row.Name, 1, 500) {
			return Catalog{}, ErrEvidence
		}
		if _, ok := games[row.ID]; ok {
			return Catalog{}, ErrEvidence
		}
		games[row.ID] = row
		out.Games = append(out.Games, Game{ID: strconv.FormatInt(row.ID, 10), Name: row.Name, Icon: vendoriaIcon(connection, row.Icon), Closed: row.Closed})
	}
	for _, row := range categories {
		if _, ok := games[row.ServiceID]; !ok {
			return Catalog{}, ErrEvidence
		}
		if _, ok := groups[row.ID]; ok {
			return Catalog{}, ErrEvidence
		}
		if row.ID < 1 || !plain(row.Name, 1, 500) {
			return Catalog{}, ErrEvidence
		}
		groups[row.ID] = row
		out.Categories = append(out.Categories, Category{ID: strconv.FormatInt(row.ID, 10), GameID: strconv.FormatInt(row.ServiceID, 10), Name: row.Name})
	}
	for _, row := range forms {
		key := strconv.FormatInt(row.ID, 10)
		if _, ok := methods[key]; ok {
			return Catalog{}, ErrEvidence
		}
		if row.ID < 1 || !plain(row.Name, 1, 500) || !plain(row.Instruction, 0, 64000) {
			return Catalog{}, ErrEvidence
		}
		methods[key] = row
	}
	for _, row := range products {
		category, ok := groups[row.CategoryID]
		if row.ID < 1 || seen[row.ID] || !plain(row.Name, 1, 500) || !plain(row.Instruction, 0, 64000) || len(row.Prices) > 1000 {
			return Catalog{}, ErrEvidence
		}
		seen[row.ID] = true
		kind := "topup"
		if row.Code {
			kind = "cdkey"
		}
		product := Product{ID: strconv.FormatInt(row.ID, 10), GameID: strconv.FormatInt(category.ServiceID, 10), CategoryID: strconv.FormatInt(row.CategoryID, 10), Name: row.Name, Icon: vendoriaIcon(connection, row.Icon), Kind: kind, Description: row.Instruction, Offers: []Offer{}}
		if !ok {
			// Some actual supplier rows retain a deleted category. Keep them in
			// the private import for review, without inventing a game mapping.
			product.GameID = ""
			product.ReviewIssues = []string{"supplier_category_missing"}
		}
		keys := make([]string, 0, len(row.Prices))
		for key := range row.Prices {
			keys = append(keys, key)
		}
		slices.Sort(keys)
		for _, key := range keys {
			form, exists := methods[key]
			if !exists || ok && form.ServiceID != category.ServiceID {
				return Catalog{}, ErrEvidence
			}
			fields, issues, err := normalizeFields(form.Fields, false)
			if err != nil {
				return Catalog{}, err
			}
			cost := row.Prices[key]
			amount, err := cost.Rational()
			if err != nil {
				return Catalog{}, ErrEvidence
			}
			delivery := suggestedDelivery(fields, kind, true)
			if delivery == "review" && strings.EqualFold(strings.TrimSpace(form.Name), "ID") && !form.Request && !form.Prompt {
				delivery = "id"
			}
			if delivery == "review" {
				issues = append(issues, "delivery_method_needs_review")
			}
			issues = append(issues, product.ReviewIssues...)
			product.Offers = append(product.Offers, Offer{ID: key, Name: form.Name, Cost: cost, Available: ok && amount.Sign() > 0 && !form.Archived && !games[category.ServiceID].Closed, SuggestedDelivery: delivery, Fields: fields, Quantity: Quantity{Kind: "multiple", Min: "1", Max: "0", Step: "1"}, Instruction: form.Instruction, CodeRequest: form.Request, GooglePrompt: form.Prompt, GameExit: form.Exit, ReviewIssues: issues})
		}
		out.Products = append(out.Products, product)
	}
	return out, nil
}

func vendoriaIcon(connection Connection, key string) string {
	if !sourceID(key) {
		return ""
	}
	return connection.origin() + "/api/icons/" + url.PathEscape(key)
}
