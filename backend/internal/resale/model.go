// Package resale owns reviewed account offers, unique inventory and protected ownership delivery.
package resale

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/accountpricing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

// ErrInvalid rejects malformed commerce input without reflecting private data.
var ErrInvalid = errors.New("invalid account commerce input")

// ErrConflict requires refreshing an unavailable or changed agreement.
var ErrConflict = errors.New("account commerce changed or unavailable")

const maxVersion = 2147483646

var coinCode = regexp.MustCompile(`^[a-z0-9]{1,32}$`)
var currencyCode = regexp.MustCompile(`^[A-Z]{3}$`)
var minorAmount = regexp.MustCompile(`^[1-9][0-9]{0,11}$`)

// Store shares transactional identity checks and the existing envelope keyring.
type Store struct {
	client *ent.Client
	auth   *identity.Service
	keys   *vault.Keyring
	now    func() time.Time
}

// New constructs account commerce without migrations or default commercial terms.
func New(client *ent.Client, auth *identity.Service, keys *vault.Keyring, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{client, auth, keys, now}
}
func (s *Store) instant() time.Time { return s.now().UTC().Truncate(time.Microsecond) }
func validID(id string) bool        { value, err := uuid.Parse(id); return err == nil && value.String() == id }
func text(value string, minimum, maximum int) bool {
	return utf8.ValidString(value) && utf8.RuneCountInString(strings.TrimSpace(value)) >= minimum && utf8.RuneCountInString(value) <= maximum && !strings.ContainsRune(value, 0)
}
func version(value int) bool { return value >= 1 && value < maxVersion }
func document(value any) (map[string]any, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	var result map[string]any
	err = json.Unmarshal(raw, &result)
	return result, err
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
func (s *Store) audit(ctx context.Context, tx *ent.Tx, p *identity.Principal, action, id string) error {
	_, err := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(p.User.ID).SetAction("resale_" + action).SetTargetID(id).SetMetadata(map[string]string{}).SetCreatedAt(s.instant()).Save(ctx)
	return err
}

// SellerTerms explicitly price a direct crypto obligation; no wallet balance or assumed exchange rate.
type SellerTerms struct {
	Commission           *accountpricing.Seller `json:"commission,omitempty"`
	Model                string                 `json:"model"`
	Currency             string                 `json:"currency"`
	Network              string                 `json:"network"`
	Amount               string                 `json:"amount"`
	ProceedsBasis        string                 `json:"proceeds_basis"`
	Fees                 string                 `json:"fees"`
	TransferRequirements string                 `json:"transfer_requirements"`
	DisputeTerms         string                 `json:"dispute_terms"`
	WithdrawalTerms      string                 `json:"withdrawal_terms"`
	PayoutDelayHours     int                    `json:"payout_delay_hours"`
	PayoutDeadlineHours  int                    `json:"payout_deadline_hours"`
}

func validateTerms(v SellerTerms) error {
	if v.Model != "consignment" && v.Model != "buy_first" {
		return ErrInvalid
	}
	amount, err := nowpayments.Decimal(v.Amount).Rational()
	if err != nil || amount.Sign() <= 0 || !coinCode.MatchString(v.Currency) || !text(v.Network, 1, 64) || v.PayoutDelayHours < 0 || v.PayoutDeadlineHours < 1 || v.PayoutDelayHours >= v.PayoutDeadlineHours || v.PayoutDeadlineHours > 8760 {
		return ErrInvalid
	}
	for _, value := range []string{v.ProceedsBasis, v.Fees, v.TransferRequirements, v.DisputeTerms, v.WithdrawalTerms} {
		if !text(value, 20, 2000) {
			return ErrInvalid
		}
	}
	return nil
}

// OfferInput binds an owner proposal to the reviewed submission revision.
type OfferInput struct {
	RequestKey        string      `json:"request_key"`
	SubmissionVersion int         `json:"submission_version"`
	Terms             SellerTerms `json:"terms"`
	ExpiresAt         time.Time   `json:"expires_at"`
}

// OfferChange carries explicit acceptance or a versioned owner decision.
type OfferChange struct {
	Version int    `json:"version"`
	Accept  bool   `json:"accept"`
	Note    string `json:"note"`
}

// OfferView is private commercial history, with no seller identifiers.
type OfferView struct {
	ID                string      `json:"id"`
	SubmissionID      string      `json:"submission_id"`
	Version           int         `json:"version"`
	Terms             SellerTerms `json:"terms"`
	State             string      `json:"state"`
	ExpiresAt         time.Time   `json:"expires_at"`
	AcceptedAt        *time.Time  `json:"accepted_at"`
	ControlVerifiedAt *time.Time  `json:"control_verified_at"`
	CreatedAt         time.Time   `json:"created_at"`
}

func offerView(row *ent.SellerOffer) (OfferView, error) {
	terms, err := decode[SellerTerms](row.Data)
	return OfferView{row.ID, row.SubmissionID, row.Version, terms, row.State, row.ExpiresAt, row.AcceptedAt, row.ControlVerifiedAt, row.CreatedAt}, err
}

// Product contains only material explicitly reviewed for public account resale.
type Product struct {
	Commission           *accountpricing.Buyer `json:"commission,omitempty"`
	Title                string                `json:"title"`
	Description          string                `json:"description"`
	Region               string                `json:"region"`
	Rank                 string                `json:"rank"`
	Attributes           []Attribute           `json:"attributes"`
	MediaIDs             []string              `json:"media_ids"`
	CoverMediaID         string                `json:"cover_media_id,omitempty"`
	Currency             string                `json:"currency"`
	AmountMinor          string                `json:"amount_minor"`
	SaleTerms            string                `json:"sale_terms"`
	TransferRequirements string                `json:"transfer_requirements"`
	DisputeTerms         string                `json:"dispute_terms"`
	AcknowledgementTerms string                `json:"acknowledgement_terms"`
	DisputeHours         int                   `json:"dispute_hours"`
	DeliveryMinHours     int                   `json:"delivery_min_hours"`
	DeliveryMaxHours     int                   `json:"delivery_max_hours"`
}

// Attribute is an explicitly published account characteristic.
type Attribute struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

func productIssues(v Product) []catalog.Issue {
	issues := []catalog.Issue{}
	add := func(field, message string) {
		issues = append(issues, catalog.Issue{Path: "product." + field, Message: message})
	}
	for _, field := range []struct {
		key, value string
		min, max   int
	}{
		{"title", v.Title, 1, 120}, {"description", v.Description, 20, 4000}, {"region", v.Region, 1, 80}, {"rank", v.Rank, 1, 80},
		{"sale_terms", v.SaleTerms, 20, 2000}, {"transfer_requirements", v.TransferRequirements, 20, 2000}, {"dispute_terms", v.DisputeTerms, 20, 2000}, {"acknowledgement_terms", v.AcknowledgementTerms, 20, 2000},
	} {
		if !text(field.value, field.min, field.max) {
			add(field.key, "Complete this listing field within its stated length.")
		}
	}
	if !currencyCode.MatchString(v.Currency) {
		add("currency", "Choose the listing currency.")
	}
	if !minorAmount.MatchString(v.AmountMinor) {
		add("amount_minor", "Enter a valid listing price.")
	}
	if v.DisputeHours < 1 || v.DisputeHours > 720 {
		add("dispute_hours", "Enter 1–720 inspection hours.")
	}
	if v.DeliveryMinHours < 1 || v.DeliveryMaxHours < v.DeliveryMinHours || v.DeliveryMaxHours > 720 {
		add("delivery_max_hours", "Complete a valid delivery range of 1–720 hours.")
	}
	if len(v.Attributes) > 30 {
		add("attributes", "Keep at most 30 account characteristics.")
	}
	labels := map[string]bool{}
	for _, item := range v.Attributes {
		if !text(item.Label, 1, 80) || !text(item.Value, 1, 300) || labels[item.Label] {
			add("attributes", "Check characteristic names and values; names must be unique.")
			break
		}
		labels[item.Label] = true
	}
	if len(v.MediaIDs) > 8 {
		add("media_ids", "Choose at most eight reviewed images.")
	}
	media := map[string]bool{}
	for _, id := range v.MediaIDs {
		if !validID(id) || media[id] {
			add("media_ids", "Choose valid, distinct reviewed images.")
			break
		}
		media[id] = true
	}
	if v.CoverMediaID != "" && !media[v.CoverMediaID] {
		add("cover_media_id", "Choose a title image from the selected gallery.")
	}
	return issues
}
