package conversations

import (
	"context"
	"encoding/json"
	"slices"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationread"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/communication"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Store keeps private communication independent from payment and credential storage.
type Store struct {
	client *ent.Client
	auth   *identity.Service
	now    func() time.Time
}

// New uses a test-injected clock only when supplied by the server's constructor.
func New(client *ent.Client, auth *identity.Service, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{client, auth, now}
}
func capability(admin bool) string {
	if admin {
		return "admin"
	}
	return "self"
}
func audience(admin bool) conversationread.Audience {
	if admin {
		return conversationread.AudienceStaff
	}
	return conversationread.AudiencePublic
}
func owned(ctx context.Context, client *ent.Client, p *identity.Principal, id string, admin bool) (*ent.Conversation, error) {
	if err := identity.Require(p, capability(admin)); err != nil {
		return nil, err
	}
	row, err := client.Conversation.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if !admin && row.UserID != p.User.ID && row.Kind != conversation.KindFulfillment {
		return nil, &ent.NotFoundError{}
	}
	if err = communication.Member(ctx, client, p, row, admin); err != nil {
		return nil, err
	}
	return row, nil
}
func visible(ctx context.Context, client *ent.Client, p *identity.Principal, row *ent.Conversation, admin bool) (View, error) {
	result := View{BoosterShared: row.BoosterShared, ID: row.ID, Kind: string(row.Kind), Subject: row.Subject, Slug: row.Slug, State: string(row.State), Version: row.PublicVersion, Sequence: row.PublicSequence, UpdatedAt: row.PublicUpdatedAt, CreatedAt: row.CreatedAt}
	if row.SubmissionID != nil {
		result.SubmissionID = *row.SubmissionID
	}
	if row.FulfillmentOrderID != nil {
		result.OrderID = *row.FulfillmentOrderID
	}
	if row.OrderID != nil {
		result.OrderID = *row.OrderID
	}
	if row.LinkedOrderID != nil {
		result.LinkedOrderID = *row.LinkedOrderID
	}
	if admin {
		result.Version = row.Version
		result.Sequence = row.Sequence
		result.UpdatedAt = row.UpdatedAt
		result.AssignedTo = row.AssignedTo
	}
	marker, err := client.ConversationRead.Query().Where(conversationread.ConversationIDEQ(row.ID), conversationread.UserIDEQ(p.User.ID), conversationread.AudienceEQ(audience(admin))).Only(ctx)
	if err != nil && !ent.IsNotFound(err) {
		return View{}, err
	}
	result.Unread = result.Sequence
	if marker != nil {
		result.Unread = max(0, result.Sequence-marker.Sequence)
	}
	return result, nil
}

// Get reads an owned thread; administrative visibility requires the explicit staff route.
func (s *Store) Get(ctx context.Context, p *identity.Principal, id string, admin bool) (View, error) {
	p, err := s.auth.Recheck(ctx, p, capability(admin))
	if err != nil {
		return View{}, err
	}
	row, err := owned(ctx, s.client, p, id, admin)
	if err != nil {
		return View{}, err
	}
	return visible(ctx, s.client, p, row, admin)
}

// List returns bounded inbox entries without message bodies or internal previews.
func (s *Store) List(ctx context.Context, p *identity.Principal, admin bool, after, state, assigned, orderID string, customer ...string) (Listing, error) {
	result := Listing{Conversations: []View{}}
	p, err := s.auth.Recheck(ctx, p, capability(admin))
	if err != nil {
		return result, err
	}
	if len(customer) > 1 {
		return result, ErrConflict
	}
	q := s.client.Conversation.Query().Order(ent.Desc(conversation.FieldID)).Limit(51)
	if !admin {
		if err = identity.Require(p, "account"); err != nil {
			return result, err
		}
		q.Where(conversation.UserIDEQ(p.User.ID))
	}
	if len(customer) == 1 && customer[0] != "" {
		if !admin {
			return result, identity.ErrForbidden
		}
		id, e := uuid.Parse(customer[0])
		if e != nil || id.String() != customer[0] {
			return result, ErrConflict
		}
		q.Where(conversation.UserIDEQ(customer[0]))
	}
	if after != "" {
		if _, parseErr := uuid.Parse(after); parseErr != nil {
			return result, ErrConflict
		}
		q.Where(conversation.IDLT(after))
	}
	if state != "" {
		if !slices.Contains([]string{"open", "waiting", "resolved"}, state) {
			return result, ErrConflict
		}
		q.Where(conversation.StateEQ(conversation.State(state)))
	}
	if assigned != "" {
		if !admin {
			return result, identity.ErrForbidden
		}
		switch assigned {
		case "me":
			q.Where(conversation.AssignedToEQ(p.User.ID))
		case "unassigned":
			q.Where(conversation.AssignedToEQ(""))
		default:
			return result, ErrConflict
		}
	}
	if orderID != "" {
		if _, parseErr := uuid.Parse(orderID); parseErr != nil {
			return result, ErrConflict
		}
		q.Where(conversation.Or(conversation.OrderIDEQ(orderID), conversation.LinkedOrderIDEQ(orderID), conversation.FulfillmentOrderIDEQ(orderID)))
	}
	rows, err := q.All(ctx)
	if err != nil {
		return result, err
	}
	if len(rows) > 50 {
		result.Next = rows[49].ID
		rows = rows[:50]
	}
	for _, row := range rows {
		v, viewErr := visible(ctx, s.client, p, row, admin)
		if viewErr != nil {
			return result, viewErr
		}
		result.Conversations = append(result.Conversations, v)
	}
	return result, nil
}

// Create creates an order's single thread or an idempotent authenticated pre-sales thread.
func (s *Store) Create(ctx context.Context, p *identity.Principal, admin bool, input CreateInput) (View, error) {
	key, err := uuid.Parse(input.RequestKey)
	if err != nil {
		return View{}, invalid("request_key", "Use a UUID retry key.")
	}
	input.RequestKey = key.String()
	if !slices.Contains([]string{"order", "presales"}, input.Kind) || !text(input.Subject, 1, 160) || len(input.Slug) > 80 {
		return View{}, invalid("subject", "Choose a conversation type and a subject of 1–160 characters.")
	}
	raw, err := json.Marshal(input)
	if err != nil {
		return View{}, err
	}
	digest := s.auth.RequestDigest("conversation-create", raw)
	var result View
	err = s.auth.AuthorizedTransaction(ctx, p, capability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		if !admin {
			if e := identity.Require(current, "account"); e != nil {
				return e
			}
		}
		existing, e := tx.Conversation.Query().Where(conversation.CreatedByEQ(current.User.ID), conversation.RequestKeyEQ(input.RequestKey)).Only(ctx)
		if e == nil {
			if existing.RequestHash != digest {
				return ErrConflict
			}
			if !admin && existing.UserID != current.User.ID {
				return identity.ErrForbidden
			}
			result, e = visible(ctx, tx.Client(), current, existing, admin)
			return e
		}
		if !ent.IsNotFound(e) {
			return e
		}
		customerID := current.User.ID
		slug := input.Slug
		if input.Kind == "order" {
			q := tx.Order.Query().Where(order.IDEQ(input.OrderID))
			if !admin {
				q.Where(order.UserIDEQ(current.User.ID))
			}
			o, readErr := q.Only(ctx)
			if readErr != nil {
				return readErr
			}
			customerID = o.UserID
			slug = o.Slug
			existing, e = tx.Conversation.Query().Where(conversation.OrderIDEQ(o.ID)).Only(ctx)
			if e == nil {
				result, e = visible(ctx, tx.Client(), current, existing, admin)
				return e
			}
			if !ent.IsNotFound(e) {
				return e
			}
		} else {
			if input.OrderID != "" {
				return ErrConflict
			}
			if slug != "" {
				if _, e = catalog.New(tx.Client(), s.auth).Published(ctx, slug); e != nil {
					return e
				}
			}
		}
		now := s.now().UTC()
		id, idErr := uuid.NewV7()
		if idErr != nil {
			return idErr
		}
		create := tx.Conversation.Create().SetID(id.String()).SetUserID(customerID).SetKind(conversation.Kind(input.Kind)).SetSubject(input.Subject).SetSlug(slug).SetRequestKey(input.RequestKey).SetRequestHash(digest).SetCreatedBy(current.User.ID).SetCreatedAt(now).SetUpdatedAt(now).SetPublicUpdatedAt(now)
		if input.Kind == "order" {
			create.SetOrderID(input.OrderID)
		}
		row, e := create.Save(ctx)
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current, row.ID, "conversation_created", now); e != nil {
			return e
		}
		result, e = visible(ctx, tx.Client(), current, row, admin)
		return e
	})
	return result, err
}
func audit(ctx context.Context, tx *ent.Tx, p *identity.Principal, id, action string, now time.Time) error {
	_, err := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(p.User.ID).SetAction(action).SetTargetID(id).SetMetadata(map[string]string{}).SetCreatedAt(now).Save(ctx)
	return err
}

// Change updates staff state/assignment or links a pre-sales thread to the same customer's order.
func (s *Store) Change(ctx context.Context, p *identity.Principal, id, action string, input Change) (View, error) {
	if !slices.Contains([]string{"state", "assign", "link", "sharing"}, action) {
		return View{}, ErrConflict
	}
	if action != "sharing" && input.BoosterShared != nil {
		return View{}, ErrConflict
	}
	var result View
	err := s.auth.StaffTransaction(ctx, p, action == "sharing", func(tx *ent.Tx, current *identity.Principal) error {
		row, e := owned(ctx, tx.Client(), current, id, true)
		if e != nil {
			return e
		}
		if row.Version != input.Version || row.Version >= 2147483646 {
			return ErrConflict
		}
		now := s.now().UTC()
		update := tx.Conversation.Update().Where(conversation.IDEQ(id), conversation.VersionEQ(input.Version)).AddVersion(1).SetUpdatedAt(now)
		switch action {
		case "sharing":
			if row.Kind != conversation.KindFulfillment || row.FulfillmentOrderID == nil || input.BoosterShared == nil || input.State != "" || input.AssignedTo != "" || input.OrderID != "" {
				return ErrConflict
			}
			if *input.BoosterShared {
				work, readErr := tx.Fulfillment.Query().Where(fulfillment.OrderIDEQ(*row.FulfillmentOrderID)).Only(ctx)
				if readErr != nil {
					return readErr
				}
				staff, readErr := tx.User.Get(ctx, work.AssignedID)
				if readErr != nil {
					return readErr
				}
				if readErr = communication.AssignedUser(ctx, tx.Client(), staff, *row.FulfillmentOrderID, row.UserID); readErr != nil {
					return readErr
				}
			}
			update.SetBoosterShared(*input.BoosterShared).AddPublicVersion(1).SetPublicUpdatedAt(now)
		case "state":
			if !slices.Contains([]string{"open", "waiting", "resolved"}, input.State) || input.AssignedTo != "" || input.OrderID != "" {
				return ErrConflict
			}
			update.SetState(conversation.State(input.State)).AddPublicVersion(1).SetPublicUpdatedAt(now)
		case "assign":
			if input.State != "" || input.OrderID != "" {
				return ErrConflict
			}
			if input.AssignedTo != "" {
				staff, lookupErr := tx.User.Query().Where(user.IDEQ(input.AssignedTo), user.RoleIn(identity.RoleAdmin, identity.RoleOwner), user.SuspendedEQ(false), user.MfaEnabledEQ(true)).Only(ctx)
				if lookupErr != nil {
					return lookupErr
				}
				update.SetAssignedTo(staff.ID)
			} else {
				update.SetAssignedTo("")
			}
		case "link":
			if row.Kind != conversation.KindPresales || row.LinkedOrderID != nil || input.State != "" || input.AssignedTo != "" {
				return ErrConflict
			}
			o, lookupErr := tx.Order.Query().Where(order.IDEQ(input.OrderID), order.UserIDEQ(row.UserID)).Only(ctx)
			if lookupErr != nil {
				return lookupErr
			}
			update.SetLinkedOrderID(o.ID).AddPublicVersion(1).SetPublicUpdatedAt(now)
		}
		count, e := update.Save(ctx)
		if e != nil {
			return e
		}
		if count != 1 {
			return ErrConflict
		}
		if e = audit(ctx, tx, current, id, "conversation_"+action, now); e != nil {
			return e
		}
		row, e = tx.Conversation.Get(ctx, id)
		if e != nil {
			return e
		}
		result, e = visible(ctx, tx.Client(), current, row, true)
		return e
	})
	return result, err
}
