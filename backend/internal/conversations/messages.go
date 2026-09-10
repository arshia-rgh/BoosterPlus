package conversations

import (
	"context"
	"encoding/json"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationread"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

func messageView(row *ent.ConversationMessage, admin bool) Message {
	result := Message{ID: row.ID, Sequence: row.Sequence, SenderLabel: row.SenderLabel, SenderRole: row.SenderRole, Visibility: string(row.Visibility), Body: row.Body, CreatedAt: row.CreatedAt}
	if admin {
		result.SenderID = row.SenderID
	} else if row.PublicSequence != nil {
		result.Sequence = *row.PublicSequence
		if row.SenderRole != "customer" {
			result.SenderRole = "staff"
		}
	}
	return result
}

// Messages pages persisted visible messages; internal notes cannot influence customer pagination.
func (s *Store) Messages(ctx context.Context, p *identity.Principal, id string, admin bool, after int) (Messages, error) {
	result := Messages{Messages: []Message{}}
	row, err := owned(ctx, s.client, p, id, admin)
	if err != nil {
		return result, err
	}
	if after < 0 {
		return result, ErrConflict
	}
	query := s.client.ConversationMessage.Query().Where(conversationmessage.ConversationIDEQ(id)).Limit(51)
	if admin {
		result.Latest = row.Sequence
		query.Where(conversationmessage.SequenceGT(after)).Order(ent.Asc(conversationmessage.FieldSequence))
	} else {
		result.Latest = row.PublicSequence
		query.Where(conversationmessage.VisibilityEQ(conversationmessage.VisibilityPublic), conversationmessage.PublicSequenceGT(after)).Order(ent.Asc(conversationmessage.FieldPublicSequence))
	}
	rows, err := query.All(ctx)
	if err != nil {
		return result, err
	}
	if len(rows) > 50 {
		result.Next = messageView(rows[49], admin).Sequence
		rows = rows[:50]
	}
	for _, message := range rows {
		result.Messages = append(result.Messages, messageView(message, admin))
	}
	return result, nil
}

// Send makes the message, counters, audit and activity notice one atomic effect.
func (s *Store) Send(ctx context.Context, p *identity.Principal, id string, admin bool, input SendInput) (Message, error) {
	key, err := uuid.Parse(input.RequestKey)
	if err != nil {
		return Message{}, invalid("request_key", "Use a UUID retry key.")
	}
	input.RequestKey = key.String()
	input.Body = strings.TrimSpace(input.Body)
	if !text(input.Body, 1, 4000) {
		return Message{}, invalid("body", "Write a message of 1–4,000 characters. Use the secure credential workflow for secrets.")
	}
	if input.Visibility != "public" && input.Visibility != "internal" {
		return Message{}, ErrConflict
	}
	if input.Visibility == "internal" && !admin {
		return Message{}, identity.ErrForbidden
	}
	raw, err := json.Marshal(input)
	if err != nil {
		return Message{}, err
	}
	digest := s.auth.RequestDigest("conversation-message", raw)
	var result Message
	err = s.auth.AuthorizedTransaction(ctx, p, capability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := owned(ctx, tx.Client(), current, id, admin)
		if e != nil {
			return e
		}
		existing, e := tx.ConversationMessage.Query().Where(conversationmessage.ConversationIDEQ(id), conversationmessage.SenderIDEQ(current.User.ID), conversationmessage.RequestKeyEQ(input.RequestKey)).Only(ctx)
		if e == nil {
			if existing.RequestHash != digest || !admin && existing.Visibility == conversationmessage.VisibilityInternal {
				return ErrConflict
			}
			result = messageView(existing, admin)
			return nil
		}
		if !ent.IsNotFound(e) {
			return e
		}
		if row.Version >= 2147483646 || row.Sequence >= 2147483646 {
			return ErrConflict
		}
		now := s.now().UTC()
		label, role := "Customer", "customer"
		if admin {
			label = current.User.StaffAlias
			if label == "" {
				label = "Booster Plus support"
			}
			role = current.User.Role
		}
		create := tx.ConversationMessage.Create().SetConversationID(id).SetSenderID(current.User.ID).SetSenderRole(role).SetSenderLabel(label).SetVisibility(conversationmessage.Visibility(input.Visibility)).SetSequence(row.Sequence + 1).SetRequestKey(input.RequestKey).SetRequestHash(digest).SetBody(input.Body).SetCreatedAt(now)
		update := tx.Conversation.Update().Where(conversation.IDEQ(id), conversation.VersionEQ(row.Version)).AddVersion(1).AddSequence(1).SetUpdatedAt(now)
		if input.Visibility == "public" {
			create.SetPublicSequence(row.PublicSequence + 1)
			update.AddPublicSequence(1).AddPublicVersion(1).SetPublicUpdatedAt(now)
			if admin {
				update.SetState(conversation.StateWaiting)
			} else {
				update.SetState(conversation.StateOpen)
			}
		}
		message, e := create.Save(ctx)
		if e != nil {
			return e
		}
		count, e := update.Save(ctx)
		if e != nil {
			return e
		}
		if count != 1 {
			return ErrConflict
		}
		if input.Visibility == "public" {
			target, kind := row.AssignedTo, "conversation_staff"
			if admin {
				target = row.UserID
				kind = "conversation_customer"
			}
			if target != "" && target != current.User.ID {
				if e = notifications.Enqueue(ctx, tx, target, id, message.ID, kind, now); e != nil {
					return e
				}
			}
		}
		if e = audit(ctx, tx, current, id, "conversation_message", now); e != nil {
			return e
		}
		result = messageView(message, admin)
		return nil
	})
	return result, err
}

// Read advances only the observed audience's cursor, never a hidden/future message.
func (s *Store) Read(ctx context.Context, p *identity.Principal, id string, admin bool, sequence int) error {
	if sequence < 0 {
		return ErrConflict
	}
	return s.auth.AuthorizedTransaction(ctx, p, capability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		row, err := owned(ctx, tx.Client(), current, id, admin)
		if err != nil {
			return err
		}
		maximum := row.PublicSequence
		if admin {
			maximum = row.Sequence
		}
		if sequence > maximum {
			return ErrConflict
		}
		marker, err := tx.ConversationRead.Query().Where(conversationread.ConversationIDEQ(id), conversationread.UserIDEQ(current.User.ID), conversationread.AudienceEQ(audience(admin))).Only(ctx)
		if ent.IsNotFound(err) {
			_, err = tx.ConversationRead.Create().SetConversationID(id).SetUserID(current.User.ID).SetAudience(audience(admin)).SetSequence(sequence).Save(ctx)
			return err
		}
		if err != nil {
			return err
		}
		if marker.Sequence >= sequence {
			return nil
		}
		_, err = tx.ConversationRead.UpdateOneID(marker.ID).SetSequence(sequence).Save(ctx)
		return err
	})
}

// Tick compares only the audience-visible revision; streams never carry messages.
func (s *Store) Tick(ctx context.Context, p *identity.Principal, id string, admin bool) (int, error) {
	current, err := s.auth.Recheck(ctx, p, capability(admin))
	if err != nil {
		return 0, err
	}
	row, err := owned(ctx, s.client, current, id, admin)
	if err != nil {
		return 0, err
	}
	if admin {
		return row.Version, nil
	}
	return row.PublicVersion, nil
}

// StreamDuration stays below the server write timeout and proxies can reconnect.
const StreamDuration = 8 * time.Second

// History reads the latest bounded window or earlier history in display order.
func (s *Store) History(ctx context.Context, p *identity.Principal, id string, admin bool, before int) (Messages, error) {
	result := Messages{Messages: []Message{}}
	row, err := owned(ctx, s.client, p, id, admin)
	if err != nil {
		return result, err
	}
	if before < 0 {
		return result, ErrConflict
	}
	q := s.client.ConversationMessage.Query().Where(conversationmessage.ConversationIDEQ(id)).Limit(51)
	if admin {
		result.Latest = row.Sequence
		q.Order(ent.Desc(conversationmessage.FieldSequence))
		if before > 0 {
			q.Where(conversationmessage.SequenceLT(before))
		}
	} else {
		result.Latest = row.PublicSequence
		q.Where(conversationmessage.VisibilityEQ(conversationmessage.VisibilityPublic)).Order(ent.Desc(conversationmessage.FieldPublicSequence))
		if before > 0 {
			q.Where(conversationmessage.PublicSequenceLT(before))
		}
	}
	rows, err := q.All(ctx)
	if err != nil {
		return result, err
	}
	if len(rows) > 50 {
		result.Next = messageView(rows[49], admin).Sequence
		rows = rows[:50]
	}
	slices.Reverse(rows)
	for _, message := range rows {
		result.Messages = append(result.Messages, messageView(message, admin))
	}
	return result, nil
}
