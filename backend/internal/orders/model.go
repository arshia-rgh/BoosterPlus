// Package orders owns unpaid requests, quotes, accepted contracts and saved offers.
package orders

import (
	"encoding/json"
	"errors"
	"math/big"
	"regexp"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

// ErrConflict requires a fresh order/quote instead of silently overwriting state.
var ErrConflict = errors.New("order state or accepted price changed")

// Invalid reports customer-safe validation errors without echoing private values.
type Invalid struct{ Issues []catalog.Issue }

func (e *Invalid) Error() string { return "order validation failed" }
func invalid(path, message string) error {
	return &Invalid{[]catalog.Issue{{Path: path, Message: message}}}
}

var moneyPattern = regexp.MustCompile(`^[1-9][0-9]{0,11}$`)
var linePattern = regexp.MustCompile(`^-?(0|[1-9][0-9]{0,11})$`)

func text(value string, minimum, maximum int) bool {
	return utf8.ValidString(value) && utf8.RuneCountInString(strings.TrimSpace(value)) >= minimum && utf8.RuneCountInString(value) <= maximum && !strings.ContainsRune(value, 0)
}
func decode[T any](data map[string]any) (T, error) {
	var result T
	raw, err := json.Marshal(data)
	if err != nil {
		return result, err
	}
	err = json.Unmarshal(raw, &result)
	return result, err
}
func document(value any) (map[string]any, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	var data map[string]any
	err = json.Unmarshal(raw, &data)
	return data, err
}

// CreateInput carries selections and acceptance assertions, not price authority.
type CreateInput struct {
	RequestKey            string          `json:"request_key"`
	ReleaseID             string          `json:"release_id"`
	Slug                  string          `json:"slug"`
	Service               string          `json:"service"`
	Package               string          `json:"package"`
	Variant               string          `json:"variant"`
	Kind                  string          `json:"kind"`
	Answers               catalog.Answers `json:"answers"`
	CouponCode            string          `json:"coupon_code"`
	AcceptTerms           bool            `json:"accept_terms"`
	TermsVersion          string          `json:"terms_version"`
	ExpectedAmount        string          `json:"expected_amount"`
	ExpectedCouponVersion int             `json:"expected_coupon_version"`
}

// QuoteInput is an administrator's proposed agreement, never automatic charging.
type QuoteInput struct {
	PreviewHash      string              `json:"preview_hash,omitempty"`
	Version          int                 `json:"version"`
	AmountMinor      string              `json:"amount_minor"`
	Currency         string              `json:"currency"`
	Scope            string              `json:"scope"`
	Reason           string              `json:"reason"`
	Lines            []catalog.PriceLine `json:"lines"`
	DeliveryMinHours int                 `json:"delivery_min_hours"`
	DeliveryMaxHours int                 `json:"delivery_max_hours"`
	ExpiresAt        time.Time           `json:"expires_at"`
}

// Commercial is immutable once issued; acceptance copies it into a contract.
type Commercial struct {
	QuoteID          string              `json:"quote_id"`
	Revision         int                 `json:"revision"`
	Currency         string              `json:"currency"`
	SubtotalMinor    string              `json:"subtotal_minor"`
	AmountMinor      string              `json:"amount_minor"`
	Discount         *catalog.Discount   `json:"discount,omitempty"`
	Lines            []catalog.PriceLine `json:"lines"`
	Scope            string              `json:"scope"`
	Reason           string              `json:"reason"`
	DeliveryMinHours int                 `json:"delivery_min_hours"`
	DeliveryMaxHours int                 `json:"delivery_max_hours"`
	DeliveryBasis    string              `json:"delivery_basis,omitempty"`
	ExpiresAt        time.Time           `json:"expires_at"`
	TermsVersion     string              `json:"terms_version"`
}

// ListPrice contains only the immutable accepted amount, never an estimate or provider data.
type ListPrice struct {
	Currency    string `json:"currency"`
	AmountMinor string `json:"amount_minor"`
}

// Summary omits form snapshots and personal selections from bounded lists.
type Summary struct {
	Staff         *StaffSummary `json:"staff,omitempty"`
	AcceptedPrice *ListPrice    `json:"accepted_price,omitempty"`
	Unread        *bool         `json:"unread,omitempty"`
	ID            string        `json:"id"`
	Version       int           `json:"version"`
	Kind          string        `json:"kind"`
	State         string        `json:"state"`
	Slug          string        `json:"slug"`
	Service       string        `json:"service"`
	Package       string        `json:"package"`
	Variant       string        `json:"variant"`
	GameName      string        `json:"game_name"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

// StaffSummary contains internal references only in an authorized staff queue.
type StaffSummary struct {
	DeliveryState string `json:"delivery_state,omitempty"`
	CustomerID    string `json:"customer_id"`
	AssignedID    string `json:"assigned_id"`
	PaymentState  string `json:"payment_state"`
}

// QuoteView exposes the customer's agreement but excludes internal staff identity.
type QuoteView struct {
	ID    string     `json:"id"`
	State string     `json:"state"`
	Data  Commercial `json:"data"`
}

// ContractView exposes the accepted total and financial lifecycle, not provider secrets.
type ContractView struct {
	ID           string     `json:"id"`
	PaymentState string     `json:"payment_state"`
	Data         Commercial `json:"data"`
}

// Detail contains only data available to the order's customer or administrators.
type Detail struct {
	Order      Summary          `json:"order"`
	Offer      catalog.Release  `json:"offer"`
	Answers    catalog.Answers  `json:"answers"`
	Estimate   catalog.Estimate `json:"estimate"`
	CouponCode string           `json:"coupon_code"`
	Quote      *QuoteView       `json:"quote,omitempty"`
	Contract   *ContractView    `json:"contract,omitempty"`
}

// Listing has a stable chronological cursor.
type Listing struct {
	Orders []Summary `json:"orders"`
	Next   string    `json:"next"`
}

// Action binds a transition to the observed order and quote, with explicit consent.
type Action struct {
	Version      int    `json:"version"`
	QuoteID      string `json:"quote_id"`
	AcceptTerms  bool   `json:"accept_terms"`
	TermsVersion string `json:"terms_version"`
	Message      string `json:"message"`
}

// Revision replaces unaccepted ordinary choices, superseding any prior quote.
type Revision struct {
	Version    int             `json:"version"`
	Answers    catalog.Answers `json:"answers"`
	CouponCode string          `json:"coupon_code"`
}

// Event is private to the order but always customer-visible, never an internal note.
type Event struct {
	ID        string    `json:"id"`
	Version   int       `json:"version"`
	Action    string    `json:"action"`
	Message   string    `json:"message"`
	ActorRole string    `json:"actor_role"`
	CreatedAt time.Time `json:"created_at"`
}

func validateQuote(input QuoteInput, now time.Time) error {
	if len(input.PreviewHash) > 128 {
		return invalid("preview_hash", "Preview is invalid. Review the quote again.")
	}
	if !moneyPattern.MatchString(input.AmountMinor) || !slices.Contains([]string{"USD", "EUR", "GBP"}, input.Currency) {
		return invalid("amount_minor", "Choose a supported currency and a positive whole-minor-unit amount.")
	}
	if !text(input.Scope, 1, 4000) || !text(input.Reason, 1, 2000) {
		return invalid("scope", "Provide bounded customer-visible scope and an explanation for this quote.")
	}
	if input.DeliveryMinHours < 1 || input.DeliveryMaxHours < input.DeliveryMinHours || input.DeliveryMaxHours > 8760 {
		return invalid("delivery", "Provide an ordered delivery estimate of 1–8,760 hours.")
	}
	if !input.ExpiresAt.After(now.Add(5*time.Minute)) || input.ExpiresAt.After(now.Add(7*24*time.Hour)) {
		return invalid("expires_at", "Quote expiry must be more than five minutes and at most seven days from now.")
	}
	if len(input.Lines) > 20 {
		return invalid("lines", "At most 20 quoted line items are supported.")
	}
	if len(input.Lines) > 0 {
		sum := new(big.Int)
		keys := map[string]bool{}
		for _, line := range input.Lines {
			if !text(line.Key, 1, 48) || line.Key == "coupon" || keys[line.Key] || !text(line.Label, 1, 120) || !linePattern.MatchString(line.AmountMinor) {
				return invalid("lines", "Provide unique labeled whole-minor-unit line items.")
			}
			keys[line.Key] = true
			n, ok := new(big.Int).SetString(line.AmountMinor, 10)
			if !ok {
				return invalid("lines", "Invalid line amount.")
			}
			sum.Add(sum, n)
		}
		if sum.String() != input.AmountMinor {
			return invalid("lines", "Line items must exactly sum to the pre-discount quoted amount.")
		}
	}
	return nil
}
