package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ConversationMessage maps explicit SQL-owned private communication records.
type ConversationMessage struct{ ent.Schema }

// Fields defines the SQL mapping.
func (ConversationMessage) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("conversation_id").MaxLen(36).Immutable(),
		field.String("sender_id").MaxLen(36).Immutable(),
		field.String("sender_role").MaxLen(32).Immutable(),
		field.String("sender_label").MaxLen(100).Immutable(),
		field.Enum("visibility").Values("public", "internal").Immutable(),
		field.Int("sequence").Immutable(),
		field.Int("public_sequence").Optional().Nillable().Immutable(),
		field.String("request_key").MaxLen(36).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.String("body").MaxLen(4000).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors SQL constraints.
func (ConversationMessage) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("conversation_id", "sender_id", "request_key").Unique().StorageKey("conversation_message_request"),
		index.Fields("conversation_id", "sequence").Unique().StorageKey("conversation_message_sequence"),
		index.Fields("conversation_id", "public_sequence").Unique().StorageKey("conversation_message_public"),
	}
}
