package conversations

import (
	"context"
	"encoding/base64"
	"slices"
	"strings"
	"time"

	"entgo.io/ent/dialect/sql"
	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/communication"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ListFilters applies discovery before pagination, never over a partial client page.
type ListFilters struct {
	After    string
	State    string
	Assigned string
	OrderID  string
	Customer string
	Search   string
	Kind     string
	Unread   string
}

// List returns bounded audience-scoped metadata; bodies/internal previews are never searched.
func (s *Store) List(ctx context.Context, p *identity.Principal, admin bool, input ListFilters) (Listing, error) {
	result := Listing{Conversations: []View{}}
	p, err := s.auth.Recheck(ctx, p, capability(admin))
	if err != nil {
		return result, err
	}
	updated := conversation.FieldPublicUpdatedAt
	if admin {
		updated = conversation.FieldUpdatedAt
	}
	q := s.client.Conversation.Query().Order(ent.Desc(updated), ent.Desc(conversation.FieldID)).Limit(51)
	if !admin {
		if err = identity.Require(p, "account"); err != nil {
			return result, err
		}
		q.Where(conversation.UserIDEQ(p.User.ID))
	}
	if input.Customer != "" {
		if !admin {
			return result, identity.ErrForbidden
		}
		id, e := uuid.Parse(input.Customer)
		if e != nil || id.String() != input.Customer {
			return result, ErrConflict
		}
		q.Where(conversation.UserIDEQ(input.Customer))
	}
	if input.After != "" {
		instant, id, e := s.listPosition(ctx, p, admin, input.After)
		if e != nil {
			return result, e
		}
		q.Where(func(selector *sql.Selector) {
			selector.Where(sql.Or(sql.LT(selector.C(updated), instant), sql.And(sql.EQ(selector.C(updated), instant), sql.LT(selector.C(conversation.FieldID), id))))
		})
	}
	if input.State != "" {
		if !slices.Contains([]string{"open", "waiting", "resolved"}, input.State) {
			return result, ErrConflict
		}
		q.Where(conversation.StateEQ(conversation.State(input.State)))
	}
	if input.Assigned != "" {
		if !admin {
			return result, identity.ErrForbidden
		}
		switch input.Assigned {
		case "me":
			q.Where(conversation.AssignedToEQ(p.User.ID))
		case "unassigned":
			q.Where(conversation.AssignedToEQ(""))
		default:
			return result, ErrConflict
		}
	}
	if input.OrderID != "" {
		id, e := uuid.Parse(input.OrderID)
		if e != nil || id.String() != input.OrderID {
			return result, ErrConflict
		}
		q.Where(conversation.Or(conversation.OrderIDEQ(input.OrderID), conversation.LinkedOrderIDEQ(input.OrderID), conversation.FulfillmentOrderIDEQ(input.OrderID)))
	}
	if input.Kind != "" {
		if !slices.Contains([]string{"order", "presales", "submission", "fulfillment"}, input.Kind) {
			return result, ErrConflict
		}
		q.Where(conversation.KindEQ(conversation.Kind(input.Kind)))
	}
	search := strings.TrimSpace(input.Search)
	if !text(input.Search, 0, 160) {
		return result, invalid("search", "Use at most 160 characters for a subject or full reference.")
	}
	if search != "" {
		subject := conversation.SubjectContainsFold(search)
		if id, e := uuid.Parse(search); e == nil {
			ref := id.String()
			q.Where(conversation.Or(subject, conversation.IDEQ(ref), conversation.OrderIDEQ(ref), conversation.LinkedOrderIDEQ(ref), conversation.FulfillmentOrderIDEQ(ref), conversation.SubmissionIDEQ(ref)))
		} else {
			q.Where(subject)
		}
	}
	if input.Unread != "" && input.Unread != "true" && input.Unread != "false" {
		return result, ErrConflict
	}
	if input.Unread == "true" {
		q.Where(func(selector *sql.Selector) {
			selector.Where(communication.HasUnread(selector.C(conversation.FieldID), p.User.ID, admin))
		})
	}
	rows, err := q.All(ctx)
	if err != nil {
		return result, err
	}
	if len(rows) > 50 {
		row := rows[49]
		instant := row.PublicUpdatedAt
		if admin {
			instant = row.UpdatedAt
		}
		result.Next = base64.RawURLEncoding.EncodeToString([]byte(instant.UTC().Format(time.RFC3339Nano) + "|" + row.ID))
		rows = rows[:50]
	}
	for _, row := range rows {
		value, e := visible(ctx, s.client, p, row, admin)
		if e != nil {
			return Listing{}, e
		}
		result.Conversations = append(result.Conversations, value)
	}
	if _, err = s.auth.Recheck(ctx, p, capability(admin)); err != nil {
		return Listing{}, err
	}
	return result, nil
}

// listPosition accepts old UUID bookmarks only after resource membership is checked.
// New cursors carry a stable timestamp/id boundary; neither form grants authority.
func (s *Store) listPosition(ctx context.Context, p *identity.Principal, admin bool, value string) (time.Time, string, error) {
	if id, err := uuid.Parse(value); err == nil && id.String() == value {
		row, e := owned(ctx, s.client, p, value, admin)
		if e != nil {
			return time.Time{}, "", e
		}
		if admin {
			return row.UpdatedAt, row.ID, nil
		}
		return row.PublicUpdatedAt, row.ID, nil
	}
	if len(value) > 160 {
		return time.Time{}, "", ErrConflict
	}
	raw, e := base64.RawURLEncoding.DecodeString(value)
	if e != nil {
		return time.Time{}, "", ErrConflict
	}
	stamp, ref, ok := strings.Cut(string(raw), "|")
	if !ok {
		return time.Time{}, "", ErrConflict
	}
	instant, e := time.Parse(time.RFC3339Nano, stamp)
	if e != nil {
		return time.Time{}, "", ErrConflict
	}
	id, e := uuid.Parse(ref)
	if e != nil || id.String() != ref {
		return time.Time{}, "", ErrConflict
	}
	return instant, ref, nil
}
