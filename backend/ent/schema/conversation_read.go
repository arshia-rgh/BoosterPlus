package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ConversationRead maps explicit SQL-owned private communication records.
type ConversationRead struct{ ent.Schema }

// Fields defines the SQL mapping.
func (ConversationRead) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("conversation_id").MaxLen(36).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.Enum("audience").Values("public", "staff").Immutable(),
		field.Int("sequence").Default(0),
	}
}

// Indexes mirrors SQL constraints.
func (ConversationRead) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("conversation_id", "user_id", "audience").Unique().StorageKey("conversation_reader"),
	}
}
