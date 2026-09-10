package reviews

import (
	"context"
	"encoding/base64"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/review"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/reviewrevision"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ForOrder gives only the buyer their review and live eligibility for another revision.
func (s *Store) ForOrder(ctx context.Context, p *identity.Principal, id string) (OrderReview, error) {
	var out OrderReview
	err := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		out = OrderReview{OrderID: id}
		purchase, e := ownedOrder(ctx, tx.Client(), current, id)
		if e != nil {
			return e
		}
		release, e := released(ctx, tx.Client(), purchase.GameID)
		if e != nil {
			return e
		}
		out.Policy = policy(release)
		allowed, e := eligible(ctx, tx.Client(), purchase)
		if e != nil {
			return e
		}
		out.Eligible = allowed && current.User.Role == identity.RoleCustomer && out.Policy != nil
		row, e := tx.Review.Query().Where(review.OrderIDEQ(id), review.UserIDEQ(current.User.ID)).Only(ctx)
		if ent.IsNotFound(e) {
			return nil
		}
		if e != nil {
			return e
		}
		result, e := view(row, false)
		if e != nil {
			return e
		}
		out.Review = &result
		return nil
	})
	return out, err
}
func owned(ctx context.Context, c *ent.Client, p *identity.Principal, id string, admin bool) (*ent.Review, error) {
	q := c.Review.Query().Where(review.IDEQ(id))
	if !admin {
		q.Where(review.UserIDEQ(p.User.ID))
	}
	return q.Only(ctx)
}

// Get is private to the buyer or an administrator, including hidden feedback.
func (s *Store) Get(ctx context.Context, p *identity.Principal, id string, admin bool) (View, error) {
	var out View
	err := s.auth.AuthorizedTransaction(ctx, p, capability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := owned(ctx, tx.Client(), current, id, admin)
		if e != nil {
			return e
		}
		out, e = view(row, admin)
		return e
	})
	return out, err
}

// Listing is bounded to 50 private entries and a stable time/ID continuation.
type Listing struct {
	Items []Summary `json:"items"`
	Next  string    `json:"next"`
}

func cursor(value string) (time.Time, string, error) {
	if len(value) > 160 {
		return time.Time{}, "", ErrInvalid
	}
	raw, e := base64.RawURLEncoding.DecodeString(value)
	if e != nil {
		return time.Time{}, "", ErrInvalid
	}
	parts := strings.Split(string(raw), "\n")
	if len(parts) != 2 {
		return time.Time{}, "", ErrInvalid
	}
	at, e := time.Parse(time.RFC3339Nano, parts[0])
	if e != nil {
		return at, "", ErrInvalid
	}
	id, e := uuid.Parse(parts[1])
	if e != nil || id.String() != parts[1] {
		return at, "", ErrInvalid
	}
	return at, parts[1], nil
}
func continuation(at time.Time, id string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(at.Format(time.RFC3339Nano) + "\n" + id))
}

// List scopes customer histories at SQL and orders the administrator queue by latest activity.
func (s *Store) List(ctx context.Context, p *identity.Principal, admin bool, after, state string) (Listing, error) {
	out := Listing{Items: []Summary{}}
	if state != "" && review.StateValidator(review.State(state)) != nil {
		return out, ErrInvalid
	}
	var at time.Time
	var id string
	var err error
	if after != "" {
		at, id, err = cursor(after)
		if err != nil {
			return out, err
		}
	}
	err = s.auth.AuthorizedTransaction(ctx, p, capability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		out = Listing{Items: []Summary{}}
		q := tx.Review.Query().Limit(51)
		if state != "" {
			q.Where(review.StateEQ(review.State(state)))
		}
		if admin {
			q.Order(ent.Desc(review.FieldUpdatedAt), ent.Desc(review.FieldID))
			if after != "" {
				q.Where(review.Or(review.UpdatedAtLT(at), review.And(review.UpdatedAtEQ(at), review.IDLT(id))))
			}
		} else {
			q.Where(review.UserIDEQ(current.User.ID)).Order(ent.Desc(review.FieldCreatedAt), ent.Desc(review.FieldID))
			if after != "" {
				q.Where(review.Or(review.CreatedAtLT(at), review.And(review.CreatedAtEQ(at), review.IDLT(id))))
			}
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			last := rows[49]
			date := last.CreatedAt
			if admin {
				date = last.UpdatedAt
			}
			out.Next = continuation(date, last.ID)
			rows = rows[:50]
		}
		for _, row := range rows {
			out.Items = append(out.Items, summary(row))
		}
		return nil
	})
	return out, err
}

// Revision is owned feedback history; moderation notes remain administrator-only.
type Revision struct {
	Version        int             `json:"version"`
	Action         string          `json:"action"`
	State          string          `json:"state"`
	Rating         int             `json:"rating"`
	Body           string          `json:"body"`
	Answers        catalog.Answers `json:"answers"`
	Policy         Policy          `json:"policy"`
	Response       string          `json:"response"`
	ActorRole      string          `json:"actor_role"`
	CreatedAt      time.Time       `json:"created_at"`
	ReasonCode     string          `json:"reason_code,omitempty"`
	InternalReason string          `json:"internal_reason,omitempty"`
}

// History returns at most 50 consecutive private revision snapshots.
func (s *Store) History(ctx context.Context, p *identity.Principal, id string, admin bool, after int) ([]Revision, error) {
	if after < 0 || after >= 2147483647 {
		return nil, ErrInvalid
	}
	out := []Revision{}
	err := s.auth.AuthorizedTransaction(ctx, p, capability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		if _, e := owned(ctx, tx.Client(), current, id, admin); e != nil {
			return e
		}
		rows, e := tx.ReviewRevision.Query().Where(reviewrevision.ReviewIDEQ(id), reviewrevision.VersionGT(after)).Order(ent.Asc(reviewrevision.FieldVersion)).Limit(50).All(ctx)
		if e != nil {
			return e
		}
		out = []Revision{}
		for _, row := range rows {
			a, decodeErr := decode[catalog.Answers](row.Answers)
			if decodeErr != nil {
				return decodeErr
			}
			pinned, decodeErr := decode[Policy](row.Policy)
			if decodeErr != nil {
				return decodeErr
			}
			v := Revision{Version: row.Version, Action: row.Action, State: row.State, Rating: int(row.Rating), Body: row.Body, Answers: a, Policy: pinned, Response: row.Response, ActorRole: row.ActorRole, CreatedAt: row.CreatedAt}
			if admin {
				v.ReasonCode = row.ReasonCode
				v.InternalReason = row.InternalReason
			}
			out = append(out, v)
		}
		return nil
	})
	return out, err
}
