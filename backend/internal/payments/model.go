// Package payments owns direct checkout and durable provider evidence, never wallets.
package payments

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"regexp"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/paymentroutes"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// ErrInvalid and ErrConflict contain no provider or customer secrets.
var ErrInvalid = errors.New("invalid payment request")

// ErrConflict prevents stale financial state changes.
var ErrConflict = errors.New("payment state changed")

// ErrUnavailable keeps checkout closed when merchant configuration is absent.
var ErrUnavailable = errors.New("payments unavailable")

const maxVersion = 2147483646

var codePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,31}$`)
var providerPattern = regexp.MustCompile(`^[1-9][0-9]{0,31}$`)
var minorPattern = regexp.MustCompile(`^[1-9][0-9]{0,11}$`)

// Provider is implemented by the authenticated NOWPayments boundary. Tests inject isolated fixtures.
type Provider interface {
	CreateInvoice(context.Context, nowpayments.InvoiceRequest) (nowpayments.Invoice, error)
	VerifyWebhook([]byte, string) (nowpayments.Notice, error)
	GetPayment(context.Context, string) (nowpayments.Payment, error)
	ListPayments(context.Context, int) (nowpayments.PaymentPage, error)
}

// Store shares identity's short transaction fence. Provider I/O never holds it.
type Store struct {
	client          *ent.Client
	auth            *identity.Service
	provider        Provider
	account         string
	enabled         bool
	now             func() time.Time
	outgoing        OutgoingProvider
	outgoingEnabled bool
}

// New creates financial services without applying schema or activating checkout by default.
func New(client *ent.Client, auth *identity.Service, provider Provider, account string, enabled bool, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{client: client, auth: auth, provider: provider, account: account, enabled: enabled, now: now}
}
func (s *Store) instant() time.Time { return s.now().UTC().Truncate(time.Microsecond) }
func validID(id string) bool        { value, err := uuid.Parse(id); return err == nil && value.String() == id }
func validText(v string, minimum, maximum int) bool {
	return utf8.ValidString(v) && utf8.RuneCountInString(strings.TrimSpace(v)) >= minimum && utf8.RuneCountInString(v) <= maximum && !strings.ContainsRune(v, 0)
}
func document(value any) (map[string]any, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	var result map[string]any
	err = json.Unmarshal(raw, &result)
	return result, err
}
func decode[T any](value map[string]any) (T, error) {
	var result T
	raw, err := json.Marshal(value)
	if err != nil {
		return result, err
	}
	err = json.Unmarshal(raw, &result)
	return result, err
}
func enqueue(ctx context.Context, tx *ent.Tx, kind, key string, ref any) error {
	raw, err := json.Marshal(ref)
	if err != nil {
		return err
	}
	_, err = jobs.EnqueueEntTx(ctx, tx, kind, key, raw)
	return err
}
func (s *Store) fenced(ctx context.Context, fn func(*ent.Tx) error) error {
	tx, err := s.client.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, "UPDATE auth_controls SET version=version+1 WHERE id=1")
	if err == nil {
		var count int64
		count, err = result.RowsAffected()
		if err == nil && count != 1 {
			err = ErrUnavailable
		}
	}
	if err == nil {
		err = fn(tx)
	}
	if err != nil {
		return errors.Join(err, tx.Rollback())
	}
	return tx.Commit()
}
func (s *Store) audit(ctx context.Context, tx *ent.Tx, p *identity.Principal, action, id string) error {
	actor, reference := "", "system"
	if p != nil {
		actor = p.User.ID
		reference = p.User.ID
	}
	_, err := tx.AuthAudit.Create().SetID(rand.Text()).SetActorID(actor).SetActorReference(reference).SetAction("payments." + action).SetTargetID(id).SetMetadata(map[string]string{}).SetCreatedAt(s.instant()).Save(ctx)
	return err
}

// Route preserves legacy payment routes and staff payout choices. Selection is
// set only on new immutable attempts whose coin is chosen at hosted checkout.
type Route struct {
	Selection string `json:"selection,omitempty"`
	Code      string `json:"code"`
	Label     string `json:"label"`
	Network   string `json:"network"`
}

// Policy records explicit fees, validity and rate choices before customer acceptance.
type Policy struct {
	Remedies      *Remedies `json:"remedies"`
	Label         string    `json:"label"`
	Text          string    `json:"text"`
	Currencies    []string  `json:"currencies"`
	Routes        []Route   `json:"routes"`
	FeeMode       string    `json:"fee_mode"`
	RateMode      string    `json:"rate_mode"`
	WindowMinutes int       `json:"window_minutes"`
}

func validatePolicy(p Policy) error {
	if !validText(p.Label, 1, 120) || !validText(p.Text, 20, 8000) || len(p.Currencies) < 1 || len(p.Currencies) > 3 || len(p.Routes) > paymentroutes.Maximum || !slices.Contains([]string{"merchant", "customer"}, p.FeeMode) || !slices.Contains([]string{"fixed", "floating"}, p.RateMode) || p.WindowMinutes < 15 || p.WindowMinutes > 1440 {
		return ErrInvalid
	}
	seen := map[string]bool{}
	for _, currency := range p.Currencies {
		if !slices.Contains([]string{"USD", "EUR", "GBP"}, currency) || seen[currency] {
			return ErrInvalid
		}
		seen[currency] = true
	}
	clear(seen)
	for _, route := range p.Routes {
		if known, ok := paymentroutes.Find(route.Code); ok && known.Network != route.Network {
			return ErrInvalid
		}
		if route.Selection != "" || !codePattern.MatchString(route.Code) || strings.ContainsAny(route.Code, "_-") || !codePattern.MatchString(route.Network) || !validText(route.Label, 1, 80) || seen[route.Code] {
			return ErrInvalid
		}
		seen[route.Code] = true
	}
	return nil
}

// PolicyView is an immutable public checkout agreement.
type PolicyView struct {
	ID   string `json:"id"`
	Data Policy `json:"data"`
}

// Settings exposes operational configuration without merchant credentials.
type Settings struct {
	OutgoingEnabled bool        `json:"outgoing_enabled"`
	Version         int         `json:"version"`
	Draft           Policy      `json:"draft"`
	Published       *PolicyView `json:"published"`
	Configured      bool        `json:"configured"`
	Enabled         bool        `json:"enabled"`
}

// PolicyInput carries a staff revision, explicit action and approved text.
type PolicyInput struct {
	Version int    `json:"version"`
	Action  string `json:"action"`
	Data    Policy `json:"data"`
}

// StartInput acknowledges the shown policy and immutable contract before creating an attempt.
type StartInput struct {
	ContractID   string `json:"contract_id"`
	PolicyID     string `json:"policy_id"`
	AcceptPolicy bool   `json:"accept_policy"`
}

// Attempt is a safe customer projection; mode/account credentials and internal leases are absent.
type Attempt struct {
	NativeCheckout    bool       `json:"native_checkout"`
	InstructionStatus string     `json:"instruction_status"`
	Deposit           *Deposit   `json:"deposit"`
	ID                string     `json:"id"`
	OrderID           string     `json:"order_id"`
	State             string     `json:"state"`
	Issue             string     `json:"issue"`
	Currency          string     `json:"currency"`
	AmountMinor       string     `json:"amount_minor"`
	Route             Route      `json:"route"`
	Policy            PolicyView `json:"policy"`
	CheckoutURL       string     `json:"checkout_url"`
	CreatedAt         time.Time  `json:"created_at"`
	ExpiresAt         time.Time  `json:"expires_at"`
}

func attemptView(row *ent.PaymentAttempt) (Attempt, error) {
	route, err := decode[Route](row.Route)
	if err != nil {
		return Attempt{}, err
	}
	policy, err := decode[Policy](row.Policy)
	if err != nil {
		return Attempt{}, err
	}
	view := Attempt{ID: row.ID, OrderID: row.OrderID, State: row.State, Issue: row.Issue, Currency: row.Currency, AmountMinor: row.AmountMinor, Route: route, Policy: PolicyView{row.PolicyID, normalizedPolicy(policy)}, CheckoutURL: row.CheckoutURL, CreatedAt: row.CreatedAt, ExpiresAt: row.ExpiresAt, NativeCheckout: row.NativeCheckout, InstructionStatus: "not_applicable"}
	if row.NativeCheckout {
		view.CheckoutURL = ""
		view.InstructionStatus = "preparing"
	}
	return view, nil
}

// Receipt records exact received crypto separately from its allocated order currency.
type Receipt struct {
	RefundableAmount  *string   `json:"refundable_amount,omitempty"`
	ID                string    `json:"id"`
	State             string    `json:"state"`
	Currency          string    `json:"currency"`
	Network           string    `json:"network"`
	Amount            string    `json:"amount"`
	AllocatedCurrency string    `json:"allocated_currency"`
	AllocatedMinor    string    `json:"allocated_minor"`
	CreatedAt         time.Time `json:"created_at"`
}

// History is bounded to an order's immutable commercial attempt history.
type History struct {
	ServerTime time.Time   `json:"server_time"`
	Enabled    bool        `json:"enabled"`
	Policy     *PolicyView `json:"policy"`
	Attempts   []Attempt   `json:"attempts"`
	Receipts   []Receipt   `json:"receipts"`
}
