// Package reviews owns actual-buyer feedback, immutable revisions and explicit publication.
package reviews

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ErrInvalid deliberately omits customer text and private moderation reasons.
var ErrInvalid = errors.New("invalid review input")

// ErrConflict requires refreshing the review, policy or purchase eligibility.
var ErrConflict = errors.New("review or policy changed or unavailable")

// Store shares identity's live authorization fence for every private mutation.
type Store struct {
	client *ent.Client
	auth   *identity.Service
	now    func() time.Time
}

// New never migrates or creates purchase eligibility.
func New(client *ent.Client, auth *identity.Service, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{client, auth, now}
}
func validText(v string, lower, upper int) bool {
	return utf8.ValidString(v) && utf8.RuneCountInString(strings.TrimSpace(v)) >= lower && utf8.RuneCountInString(v) <= upper && !strings.ContainsRune(v, 0)
}
func validVersion(v int) bool { return v >= 1 && v < 2147483646 }
func document(v any) (map[string]any, error) {
	raw, e := json.Marshal(v)
	if e != nil {
		return nil, e
	}
	var out map[string]any
	e = json.Unmarshal(raw, &out)
	return out, e
}
func decode[T any](v map[string]any) (T, error) {
	var out T
	raw, e := json.Marshal(v)
	if e != nil {
		return out, e
	}
	e = json.Unmarshal(raw, &out)
	return out, e
}
func capability(admin bool) string {
	if admin {
		return "admin"
	}
	return "account"
}
func ownedOrder(ctx context.Context, c *ent.Client, p *identity.Principal, id string) (*ent.Order, error) {
	return c.Order.Query().Where(order.IDEQ(id), order.UserIDEQ(p.User.ID)).Only(ctx)
}
func eligible(ctx context.Context, c *ent.Client, row *ent.Order) (bool, error) {
	if (row.Kind != order.KindCustom && row.Kind != order.KindPackage) || row.State != order.StateCompleted || row.CurrentContract == "" {
		return false, nil
	}
	return c.OrderContract.Query().Where(ordercontract.IDEQ(row.CurrentContract), ordercontract.OrderIDEQ(row.ID), ordercontract.ActiveOrderIDEQ(row.ID), ordercontract.UserIDEQ(row.UserID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateSettled)).Exist(ctx)
}

// Policy is a copy of an actually published policy, with the reference data its fields need.
type Policy struct {
	ReleaseID  string               `json:"release_id"`
	Policy     catalog.ReviewPolicy `json:"policy"`
	References []catalog.Reference  `json:"references"`
}

func (p Policy) config() catalog.Configuration {
	return catalog.Configuration{ReviewPolicy: &p.Policy, References: p.References}
}

// released returns the last public release even when sales are archived; draft content stays private.
func released(ctx context.Context, c *ent.Client, id string) (catalog.Release, error) {
	g, e := c.Game.Get(ctx, id)
	if e != nil {
		return catalog.Release{}, e
	}
	if g.CurrentRelease == "" {
		return catalog.Release{}, ErrConflict
	}
	row, e := c.CatalogRelease.Get(ctx, g.CurrentRelease)
	if e != nil {
		return catalog.Release{}, e
	}
	if row.GameID != g.ID {
		return catalog.Release{}, ErrConflict
	}
	config, e := decode[catalog.Configuration](row.Configuration)
	if e != nil {
		return catalog.Release{}, e
	}
	return catalog.Release{ID: row.ID, GameID: g.ID, Slug: g.Slug, Version: row.Version, CreatedAt: row.CreatedAt, Paused: g.Paused || g.Archived, Configuration: config}, nil
}
func policy(release catalog.Release) *Policy {
	if release.Configuration.ReviewPolicy == nil {
		return nil
	}
	refs := release.Configuration.References
	if refs == nil {
		refs = []catalog.Reference{}
	}
	return &Policy{release.ID, *release.Configuration.ReviewPolicy, refs}
}

// Input explicitly accepts a release's review policy; version zero creates once per order.
type Input struct {
	RequestKey      string          `json:"request_key"`
	Version         int             `json:"version"`
	PolicyReleaseID string          `json:"policy_release_id"`
	Rating          int             `json:"rating"`
	Body            string          `json:"body"`
	Answers         catalog.Answers `json:"answers"`
	AcceptPolicy    bool            `json:"accept_policy"`
}

// Action cannot alter the customer's rating, wording or feedback attributes.
type Action struct {
	Version       int    `json:"version"`
	PolicyChecked bool   `json:"policy_checked"`
	ReasonCode    string `json:"reason_code"`
	Note          string `json:"note"`
	Response      string `json:"response"`
}

// Summary is a private queue/history entry. Never reuse this type for public responses.
type Summary struct {
	ID        string    `json:"id"`
	OrderID   string    `json:"order_id"`
	Version   int       `json:"version"`
	Game      string    `json:"game"`
	Slug      string    `json:"slug"`
	State     string    `json:"state"`
	Rating    int       `json:"rating"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func summary(row *ent.Review) Summary {
	return Summary{row.ID, row.OrderID, row.Version, row.GameName, row.Slug, string(row.State), int(row.Rating), row.CreatedAt, row.UpdatedAt}
}

// View is visible only to its buyer or an administrator; internal notes are administrator-only.
type View struct {
	Review         Summary         `json:"review"`
	Body           string          `json:"body"`
	Answers        catalog.Answers `json:"answers"`
	Policy         Policy          `json:"policy"`
	Response       string          `json:"response"`
	ReasonCode     string          `json:"reason_code,omitempty"`
	InternalReason string          `json:"internal_reason,omitempty"`
}

func view(row *ent.Review, admin bool) (View, error) {
	p, e := decode[Policy](row.Policy)
	if e != nil {
		return View{}, e
	}
	a, e := decode[catalog.Answers](row.Answers)
	if e != nil {
		return View{}, e
	}
	v := View{Review: summary(row), Body: row.Body, Answers: a, Policy: p, Response: row.Response}
	if admin {
		v.ReasonCode = row.ReasonCode
		v.InternalReason = row.InternalReason
	}
	return v, nil
}

// OrderReview includes live write eligibility and the policy offered for a new revision.
type OrderReview struct {
	OrderID  string  `json:"order_id"`
	Eligible bool    `json:"eligible"`
	Policy   *Policy `json:"policy"`
	Review   *View   `json:"review"`
}
