// Package privacy implements explicit-policy, owner-reviewed customer erasure and audited data export.
package privacy

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/privacyrequest"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

// ErrInvalid rejects malformed or unsupported privacy actions.
var ErrInvalid = errors.New("privacy input invalid")

// ErrConflict rejects stale requests, holds and absent policy.
var ErrConflict = errors.New("privacy request or policy changed")

// Store never infers retention periods or cascades financial records.
type Store struct {
	journalRequired bool
	journal         RecoveryJournal
	client          *ent.Client
	auth            *identity.Service
	now             func() time.Time
}

// New constructs privacy workflows without activating deletion.
func New(client *ent.Client, auth *identity.Service, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{client: client, auth: auth, now: now}
}

// View describes request progress without personal content.
type View struct {
	ManualHold       bool       `json:"manual_hold"`
	ID               string     `json:"id"`
	UserID           string     `json:"user_id"`
	Version          int        `json:"version"`
	State            string     `json:"state"`
	PolicyID         string     `json:"policy_id"`
	ReviewedPolicyID string     `json:"reviewed_policy_id"`
	HoldReason       string     `json:"hold_reason"`
	EligibleAt       *time.Time `json:"eligible_at"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// Listing is a bounded stable page.
type Listing struct {
	Requests []View `json:"requests"`
	Next     string `json:"next"`
}

// Change binds owner review and customer cancellation to a specific revision.
type Change struct {
	Version  int    `json:"version"`
	Action   string `json:"action"`
	Reason   string `json:"reason"`
	PolicyID string `json:"policy_id"`
}

// RequestInput records affirmative consent to the current published retention notice.
type RequestInput struct {
	PolicyID string `json:"policy_id"`
	Accept   bool   `json:"accept"`
}

func validID(v string) bool { id, e := uuid.Parse(v); return e == nil && id.String() == v }
func view(v *ent.PrivacyRequest, admin bool) View {
	reason := v.HoldReason
	if !admin && reason != "" {
		reason = "An owner hold requires review."
	}
	return View{v.ManualHold, v.ID, v.UserID, v.Version, v.State, v.PolicyID, v.ReviewedPolicyID, reason, v.EligibleAt, v.CreatedAt, v.UpdatedAt}
}
func (s *Store) audit(ctx context.Context, tx *ent.Tx, actor, action, id string) error {
	_, e := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(actor).SetAction("privacy_" + action).SetTargetID(id).SetCreatedAt(s.now()).SetMetadata(map[string]string{}).Save(ctx)
	return e
}
func policy(ctx context.Context, client *ent.Client) (sitecontent.View, sitecontent.Retention, error) {
	v, e := sitecontent.Published(ctx, client, "retention")
	if e != nil {
		return v, sitecontent.Retention{}, e
	}
	if v.ReleaseID == "" {
		return v, sitecontent.Retention{}, ErrConflict
	}
	r, e := sitecontent.DecodeRetention(v.Data)
	if e == nil && !r.Enabled {
		e = ErrConflict
	}
	return v, r, e
}

// Request requires recent self-verification and explicit current notice acceptance.
func (s *Store) Request(ctx context.Context, p *identity.Principal, input RequestInput) (out View, err error) {
	if !input.Accept || !validID(input.PolicyID) {
		return out, ErrInvalid
	}
	err = s.auth.RecentAccountTransaction(ctx, p, func(tx *ent.Tx, current *identity.Principal) error {
		if current.User.Role != identity.RoleCustomer {
			return identity.ErrForbidden
		}
		v, _, e := policy(ctx, tx.Client())
		if e != nil {
			return e
		}
		if v.ReleaseID != input.PolicyID {
			return ErrConflict
		}
		existing, e := tx.PrivacyRequest.Query().Where(privacyrequest.ActiveUserIDEQ(current.User.ID)).Only(ctx)
		if e == nil {
			out = view(existing, false)
			return nil
		}
		if !ent.IsNotFound(e) {
			return e
		}
		row, e := tx.PrivacyRequest.Create().SetUserID(current.User.ID).SetActiveUserID(current.User.ID).SetPolicyID(v.ReleaseID).SetCreatedAt(s.now()).SetUpdatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.audit(ctx, tx, current.User.ID, "requested", row.ID); e != nil {
			return e
		}
		out = view(row, false)
		return nil
	})
	return out, err
}

// List applies live account/owner authorization and never exposes another customer's request.
func (s *Store) List(ctx context.Context, p *identity.Principal, admin bool, after string) (out Listing, err error) {
	out.Requests = []View{}
	if after != "" && !validID(after) {
		return out, ErrInvalid
	}
	capability := "account"
	if admin {
		capability = "owner"
	}
	err = s.auth.AuthorizedTransaction(ctx, p, capability, false, func(tx *ent.Tx, current *identity.Principal) error {
		q := tx.PrivacyRequest.Query().Order(ent.Asc(privacyrequest.FieldID)).Limit(51)
		if !admin {
			q.Where(privacyrequest.UserIDEQ(current.User.ID))
		}
		if after != "" {
			q.Where(privacyrequest.IDGT(after))
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			out.Next = rows[49].ID
			rows = rows[:50]
		}
		for _, row := range rows {
			out.Requests = append(out.Requests, view(row, admin))
		}
		return nil
	})
	return out, err
}
