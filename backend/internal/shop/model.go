// Package shop implements administrator-declared products with manual delivery.
package shop

import (
	"errors"
	"fmt"
	"math/big"
	"regexp"
	"slices"
	"strings"
	"unicode/utf8"
)

// ErrInvalid rejects unsafe or unsupported product and recipient input.
var ErrInvalid = errors.New("shop input is invalid")
var keyPattern = regexp.MustCompile(`^[a-z][a-z0-9_-]{0,47}$`)
var amountPattern = regexp.MustCompile(`^[1-9][0-9]{0,11}$`)
var assetPattern = regexp.MustCompile(`^/catalog-assets/[a-z0-9][a-z0-9_-]{0,79}\.(png|jpg|webp|avif|svg)$`)

// Definition is a public publication unit, never a place for recipient values.
type Definition struct {
	Title       string           `json:"title"`
	Description string           `json:"description"`
	Category    string           `json:"category"`
	Asset       string           `json:"asset"`
	AssetAlt    string           `json:"asset_alt"`
	AssetSource string           `json:"asset_source"`
	Reviewed    bool             `json:"reviewed"`
	Variants    []Variant        `json:"variants"`
	Recipient   []RecipientField `json:"recipient"`
	Policy      Policy           `json:"policy"`
}

// Variant pins compatibility, exact minor-unit price and quantity bounds.
type Variant struct {
	Key             string `json:"key"`
	Label           string `json:"label"`
	Region          string `json:"region"`
	Platform        string `json:"platform"`
	Server          string `json:"server"`
	Currency        string `json:"currency"`
	UnitAmountMinor string `json:"unit_amount_minor"`
	MinQuantity     int    `json:"min_quantity"`
	MaxQuantity     int    `json:"max_quantity"`
	Enabled         bool   `json:"enabled"`
}

// RecipientField permits ordinary delivery identifiers, never credentials.
type RecipientField struct {
	Key       string `json:"key"`
	Label     string `json:"label"`
	Help      string `json:"help"`
	Required  bool   `json:"required"`
	MaxLength int    `json:"max_length"`
}

// Policy requires explicit commercial terms before publication.
type Policy struct {
	DeliveryMinHours   int    `json:"delivery_min_hours"`
	DeliveryMaxHours   int    `json:"delivery_max_hours"`
	ReservationMinutes int    `json:"reservation_minutes"`
	DeliveryTerms      string `json:"delivery_terms"`
	CancellationTerms  string `json:"cancellation_terms"`
	RefundTerms        string `json:"refund_terms"`
	Fees               string `json:"fees"`
	EvidenceRequired   bool   `json:"evidence_required"`
	ReviewEnabled      bool   `json:"review_enabled"`
	ReviewTerms        string `json:"review_terms"`
}

// Issue contains safe field-level guidance without echoing recipient input.
type Issue struct {
	Path    string `json:"path"`
	Message string `json:"message"`
}

func text(value string, minimum, maximum int) bool {
	return utf8.ValidString(value) && utf8.RuneCountInString(strings.TrimSpace(value)) >= minimum && utf8.RuneCountInString(value) <= maximum && !strings.ContainsRune(value, 0)
}

// Validate accepts bounded incomplete drafts; publication requires reviewed terms.
func Validate(value Definition, publish bool) []Issue {
	issues := []Issue{}
	add := func(path, message string) { issues = append(issues, Issue{path, message}) }
	minimum := 0
	if publish {
		minimum = 1
	}
	for _, field := range []struct {
		key, value string
		maximum    int
	}{{"title", value.Title, 120}, {"description", value.Description, 4000}, {"category", value.Category, 80}} {
		if !text(field.value, minimum, field.maximum) {
			add(field.key, "Provide bounded plain text.")
		}
	}
	if !text(value.AssetAlt, 0, 160) || !text(value.AssetSource, 0, 1000) || value.Asset != "" && (!assetPattern.MatchString(value.Asset) || !text(value.AssetAlt, 1, 160) || !text(value.AssetSource, 1, 1000)) {
		add("asset", "Choose approved artwork with alternative text and provenance.")
	}
	if publish && (!value.Reviewed || value.Asset == "") {
		add("reviewed", "Review artwork rights, product details and commercial terms before publishing.")
	}
	if len(value.Variants) > 30 || publish && len(value.Variants) == 0 {
		add("variants", "Publish one to thirty variants.")
	}
	seen := map[string]bool{}
	enabled := false
	for i, variant := range value.Variants {
		prefix := fmt.Sprintf("variants.%d", i)
		if !keyPattern.MatchString(variant.Key) || seen[variant.Key] {
			add(prefix+".key", "Use a unique stable variant key.")
		}
		seen[variant.Key] = true
		for _, field := range []struct {
			key, value string
			maximum    int
		}{{"label", variant.Label, 120}, {"region", variant.Region, 80}, {"platform", variant.Platform, 80}, {"server", variant.Server, 80}} {
			if !text(field.value, minimum, field.maximum) {
				add(prefix+"."+field.key, "Specify the supported compatibility value, or explicitly label it unrestricted.")
			}
		}
		enabled = enabled || variant.Enabled
		if publish || variant.Currency != "" || variant.UnitAmountMinor != "" {
			if !slices.Contains([]string{"USD", "EUR", "GBP"}, variant.Currency) {
				add(prefix+".currency", "Choose USD, EUR or GBP for this variant.")
			}
			if !amountPattern.MatchString(variant.UnitAmountMinor) {
				add(prefix+".unit_amount_minor", "Set an exact positive price in minor units.")
			}
		}
		if variant.MinQuantity < 1 || variant.MaxQuantity < variant.MinQuantity || variant.MaxQuantity > 100 {
			add(prefix+".quantity", "Choose an ordered quantity range from one to one hundred.")
		}
	}
	if publish && !enabled {
		add("variants", "Enable at least one variant before publishing.")
	}
	if len(value.Recipient) > 4 {
		add("recipient", "Use only the delivery identifiers necessary for this product.")
	}
	fields := map[string]bool{}
	for i, field := range value.Recipient {
		path := fmt.Sprintf("recipient.%d", i)
		if !slices.Contains([]string{"player_id", "server_id", "character_name", "delivery_note"}, field.Key) || fields[field.Key] {
			add(path+".key", "Choose a unique supported identifier; credentials are not permitted.")
		}
		fields[field.Key] = true
		if !text(field.Label, 1, 120) || !text(field.Help, 0, 400) || field.MaxLength < 1 || field.MaxLength > 160 {
			add(path, "Provide bounded labels, help and input length.")
		}
	}
	policy := value.Policy
	if policy.DeliveryMinHours < 0 || policy.DeliveryMinHours > 8760 || policy.DeliveryMaxHours < 0 || policy.DeliveryMaxHours > 8760 || policy.ReservationMinutes < 0 || policy.ReservationMinutes > 1440 {
		add("policy", "Keep delivery and reservation values within supported bounds.")
	}
	if publish {
		if policy.DeliveryMinHours < 1 || policy.DeliveryMaxHours < policy.DeliveryMinHours {
			add("policy.delivery", "Set an explicit ordered delivery estimate.")
		}
		if policy.ReservationMinutes < 15 {
			add("policy.reservation_minutes", "Set a reservation duration between fifteen minutes and one day.")
		}
		if !policy.EvidenceRequired {
			add("policy.evidence_required", "Manual delivery requires reviewed evidence.")
		}
	}
	for _, field := range []struct{ key, value string }{{"delivery_terms", policy.DeliveryTerms}, {"cancellation_terms", policy.CancellationTerms}, {"refund_terms", policy.RefundTerms}, {"fees", policy.Fees}, {"review_terms", policy.ReviewTerms}} {
		requiredLength := 0
		if publish && (field.key != "review_terms" || policy.ReviewEnabled) {
			requiredLength = 20
		}
		if !text(field.value, requiredLength, 4000) {
			add("policy."+field.key, "Provide explicit terms before publication.")
		}
	}
	return issues
}

// Total computes exact quantity multiplication without floating-point rounding.
func Total(variant Variant, quantity int) (string, error) {
	if !variant.Enabled || quantity < 1 || quantity > 100 || quantity < variant.MinQuantity || quantity > variant.MaxQuantity || !amountPattern.MatchString(variant.UnitAmountMinor) || !slices.Contains([]string{"USD", "EUR", "GBP"}, variant.Currency) {
		return "", ErrInvalid
	}
	amount, ok := new(big.Int).SetString(variant.UnitAmountMinor, 10)
	if !ok {
		return "", ErrInvalid
	}
	amount.Mul(amount, big.NewInt(int64(quantity)))
	if !amountPattern.MatchString(amount.String()) {
		return "", ErrInvalid
	}
	return amount.String(), nil
}

// ValidateRecipient never silently normalizes a different delivery destination.
func ValidateRecipient(fields []RecipientField, input map[string]string) error {
	allowed := map[string]RecipientField{}
	for _, field := range fields {
		allowed[field.Key] = field
		if field.Required && !text(input[field.Key], 1, field.MaxLength) {
			return ErrInvalid
		}
	}
	for key, value := range input {
		field, ok := allowed[key]
		if !ok || !text(value, 0, field.MaxLength) {
			return ErrInvalid
		}
	}
	return nil
}
