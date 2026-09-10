package catalog

import (
	"math/big"
	"regexp"
	"slices"
	"time"
)

var couponCodePattern = regexp.MustCompile(`^[A-Z0-9][A-Z0-9_-]{2,39}$`)

// CouponDefinition is a versioned administrator policy. Limits count all held
// and redeemed claims across revisions of the same coupon, never UI counters.
type CouponDefinition struct {
	Code            string    `json:"code"`
	Name            string    `json:"name"`
	Enabled         bool      `json:"enabled"`
	Kind            string    `json:"kind"`
	Value           string    `json:"value"`
	Currency        string    `json:"currency"`
	StartsAt        time.Time `json:"starts_at"`
	EndsAt          time.Time `json:"ends_at"`
	MinimumSubtotal string    `json:"minimum_subtotal"`
	MaximumDiscount string    `json:"maximum_discount"`
	GlobalLimit     int       `json:"global_limit"`
	CustomerLimit   int       `json:"customer_limit"`
	Games           []string  `json:"games"`
	Services        []string  `json:"services"`
	Packages        []string  `json:"packages"`
	Categories      []string  `json:"categories"`
}

// Discount shows an indicative result, not a reserved redemption or site credit.
type Discount struct {
	CouponID    string `json:"coupon_id"`
	Version     int    `json:"version"`
	Code        string `json:"code"`
	AmountMinor string `json:"amount_minor"`
	Indicative  bool   `json:"indicative"`
}

func validateCoupon(c CouponDefinition) []Issue {
	issues := []Issue{}
	add := func(field, message string) { issues = append(issues, Issue{field, message}) }
	if !couponCodePattern.MatchString(c.Code) || !validText(c.Name, 1, 120) {
		add("code", "Use a unique uppercase coupon code (3–40 letters, digits, underscores or hyphens) and a name.")
	}
	value, ok := decimal(c.Value)
	if !ok || value.Sign() <= 0 || !slices.Contains([]string{"fixed", "percentage"}, c.Kind) || (c.Kind == "fixed" && !value.IsInt()) || (c.Kind == "percentage" && value.Cmp(big.NewRat(100, 1)) > 0) {
		add("value", "Use a positive whole-minor-unit discount or a percentage above zero and at most 100.")
	}
	if !slices.Contains([]string{"USD", "EUR", "GBP"}, c.Currency) {
		add("currency", "Choose the pricing currency for eligibility, minimum subtotal and maximum discount.")
	}
	minimum, a := decimal(c.MinimumSubtotal)
	if !a || minimum.Sign() < 0 || !minimum.IsInt() {
		add("minimum_subtotal", "Use a nonnegative whole-minor-unit minimum subtotal.")
	}
	if c.MaximumDiscount != "" {
		maximum, b := decimal(c.MaximumDiscount)
		if !b || maximum.Sign() <= 0 || !maximum.IsInt() {
			add("maximum_discount", "Use a positive whole-minor-unit maximum discount, or leave it empty.")
		}
	}
	if c.StartsAt.Year() < 2020 || c.EndsAt.Year() > 9999 || !c.EndsAt.After(c.StartsAt) {
		add("ends_at", "Provide an ordered start/end window with explicit timezone offsets.")
	}
	if c.GlobalLimit < 0 || c.GlobalLimit > 1000000 || c.CustomerLimit < 0 || c.CustomerLimit > 1000000 {
		add("global_limit", "Usage limits must be 0 (unlimited) through 1,000,000.")
	}
	for field, values := range map[string][]string{"games": c.Games, "services": c.Services, "packages": c.Packages, "categories": c.Categories} {
		if len(values) > 40 {
			add(field, "At most 40 eligibility entries are allowed.")
			continue
		}
		seen := map[string]bool{}
		for _, value := range values {
			valid := keyPattern.MatchString(value)
			if field == "games" {
				valid = slugPattern.MatchString(value)
			}
			if field == "categories" {
				valid = slices.Contains([]string{"boosting", "account_resale"}, value)
			}
			if !valid || seen[value] {
				add(field, "Use unique, supported eligibility keys.")
			}
			seen[value] = true
		}
	}
	if len(c.Categories) == 0 {
		add("categories", "Choose at least one category; boosting is the default. Resale discounts are funded by the platform.")
	}
	if (len(c.Services) > 0 || len(c.Packages) > 0) && len(c.Games) == 0 {
		add("games", "Restrict games when targeting service or package keys.")
	}
	return issues
}

func couponAmount(c CouponDefinition, subtotal *big.Rat, currency, game, service, pack, category string, now time.Time) (*big.Rat, bool) {
	if len(validateCoupon(c)) > 0 || !c.Enabled || now.Before(c.StartsAt) || !now.Before(c.EndsAt) || currency != c.Currency || !slices.Contains(c.Categories, category) {
		return nil, false
	}
	for _, scope := range []struct {
		value   string
		choices []string
	}{{game, c.Games}, {service, c.Services}, {pack, c.Packages}} {
		if len(scope.choices) > 0 && !slices.Contains(scope.choices, scope.value) {
			return nil, false
		}
	}
	minimum, _ := decimal(c.MinimumSubtotal)
	if subtotal == nil || subtotal.Cmp(minimum) < 0 || subtotal.Cmp(big.NewRat(1, 1)) <= 0 {
		return nil, false
	}
	discount, _ := decimal(c.Value)
	if c.Kind == "percentage" {
		discount.Mul(discount, subtotal)
		discount.Quo(discount, big.NewRat(100, 1))
	}
	if c.MaximumDiscount != "" {
		maximum, _ := decimal(c.MaximumDiscount)
		if discount.Cmp(maximum) > 0 {
			discount.Set(maximum)
		}
	}
	limit := new(big.Rat).Sub(subtotal, big.NewRat(1, 1))
	if discount.Cmp(limit) > 0 {
		discount.Set(limit)
	}
	total := new(big.Rat).Sub(subtotal, discount)
	if rounded(total).Cmp(rounded(subtotal)) >= 0 {
		return nil, false
	}
	return total, true
}
