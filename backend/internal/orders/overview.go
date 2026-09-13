package orders

import (
	"context"
	"net/http"
	"time"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationread"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// SessionSummary exposes schedule context without staff identities or private history.
type SessionSummary struct {
	ID       string    `json:"id"`
	OrderID  string    `json:"order_id"`
	State    string    `json:"state"`
	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
	Timezone string    `json:"timezone"`
}

// UnreadThread excludes message bodies, staff notes and staff-only sequence values.
type UnreadThread struct {
	ID      string `json:"id"`
	Subject string `json:"subject"`
	Unread  int    `json:"unread"`
}

// Overview is a bounded customer work summary, never a staff-wide dashboard.
type Overview struct {
	Attention     []Summary        `json:"attention"`
	Active        []Summary        `json:"active"`
	Upcoming      []SessionSummary `json:"upcoming"`
	MoreAttention bool             `json:"more_attention"`
	MoreActive    bool             `json:"more_active"`
	MoreUpcoming  bool             `json:"more_upcoming"`
	Messages      []UnreadThread   `json:"messages"`
	MoreMessages  bool             `json:"more_messages"`
}

func (s *Store) unreadThreads(ctx context.Context, userID string) ([]UnreadThread, bool, error) {
	rows, err := s.client.Conversation.Query().Where(conversation.UserIDEQ(userID), conversation.PublicSequenceGT(0), func(selector *sql.Selector) {
		marker := sql.Table(conversationread.Table)
		read := sql.Select(marker.C(conversationread.FieldID)).From(marker).Where(sql.And(
			sql.EQ(marker.C(conversationread.FieldUserID), userID), sql.EQ(marker.C(conversationread.FieldAudience), string(conversationread.AudiencePublic)),
			sql.ColumnsEQ(marker.C(conversationread.FieldConversationID), selector.C(conversation.FieldID)),
			sql.ColumnsGTE(marker.C(conversationread.FieldSequence), selector.C(conversation.FieldPublicSequence)),
		))
		selector.Where(sql.Not(sql.Exists(read)))
	}).Order(ent.Desc(conversation.FieldPublicUpdatedAt), ent.Desc(conversation.FieldID)).Limit(6).All(ctx)
	if err != nil {
		return nil, false, err
	}
	items := make([]UnreadThread, 0, min(len(rows), 5))
	for _, row := range rows[:min(len(rows), 5)] {
		marker, readErr := s.client.ConversationRead.Query().Where(conversationread.UserIDEQ(userID), conversationread.ConversationIDEQ(row.ID), conversationread.AudienceEQ(conversationread.AudiencePublic)).Only(ctx)
		if readErr != nil && !ent.IsNotFound(readErr) {
			return nil, false, readErr
		}
		unread := row.PublicSequence
		if marker != nil {
			unread = max(0, unread-marker.Sequence)
		}
		if unread > 0 {
			items = append(items, UnreadThread{row.ID, row.Subject, unread})
		}
	}
	return items, len(rows) > 5, nil
}

func (s *Store) overviewOrders(ctx context.Context, userID string, states ...order.State) ([]Summary, bool, error) {
	rows, err := s.client.Order.Query().Where(order.UserIDEQ(userID), order.StateIn(states...)).
		Order(ent.Desc(order.FieldUpdatedAt), ent.Desc(order.FieldID)).Limit(6).All(ctx)
	if err != nil {
		return nil, false, err
	}
	items := make([]Summary, 0, min(len(rows), 5))
	for _, row := range rows[:min(len(rows), 5)] {
		items = append(items, summary(row))
	}
	return items, len(rows) > 5, nil
}

// AccountOverview prioritizes action across all owned orders, not just a history page.
func (s *Store) AccountOverview(ctx context.Context, p *identity.Principal) (Overview, error) {
	result := Overview{Attention: []Summary{}, Active: []Summary{}, Upcoming: []SessionSummary{}, Messages: []UnreadThread{}}
	p, err := s.auth.Recheck(ctx, p, "account")
	if err != nil {
		return result, err
	}
	result.Attention, result.MoreAttention, err = s.overviewOrders(ctx, p.User.ID, order.StateNeedsInformation, order.StateQuoted, order.StateAwaitingPayment)
	if err != nil {
		return result, err
	}
	result.Active, result.MoreActive, err = s.overviewOrders(ctx, p.User.ID, order.StateSubmitted, order.StateQueued, order.StateInProgress, order.StateOnHold)
	if err != nil {
		return result, err
	}
	rows, err := s.client.Booking.Query().Where(booking.UserIDEQ(p.User.ID), booking.StateIn(booking.StateProposed, booking.StateConfirmed), booking.EndsAtGT(s.instant())).
		Order(ent.Asc(booking.FieldStartsAt), ent.Asc(booking.FieldID)).Limit(6).All(ctx)
	if err != nil {
		return result, err
	}
	result.MoreUpcoming = len(rows) > 5
	for _, row := range rows[:min(len(rows), 5)] {
		result.Upcoming = append(result.Upcoming, SessionSummary{row.ID, row.OrderID, string(row.State), row.StartsAt, row.EndsAt, row.Timezone})
	}
	result.Messages, result.MoreMessages, err = s.unreadThreads(ctx, p.User.ID)
	if err != nil {
		return result, err
	}
	_, err = s.auth.Recheck(ctx, p, "account")
	return result, err
}

func (s *Store) overview(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	result, err := s.AccountOverview(r.Context(), p)
	if err != nil {
		return err
	}
	return write(w, result)
}
