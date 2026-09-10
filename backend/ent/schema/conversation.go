package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// Conversation maps explicit SQL-owned private communication records.
type Conversation struct{ ent.Schema }

// Fields defines the SQL mapping.
func (Conversation) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.Enum("kind").Values("order", "presales").Immutable(),
		field.String("order_id").MaxLen(36).Optional().Nillable().Immutable(),
		field.String("linked_order_id").MaxLen(36).Optional().Nillable(),
		field.String("subject").MaxLen(160).Immutable(),
		field.String("slug").MaxLen(80).Default("").Immutable(),
		field.String("request_key").MaxLen(36).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.String("created_by").MaxLen(36).Immutable(),
		field.Enum("state").Values("open", "waiting", "resolved").Default("open"),
		field.String("assigned_to").MaxLen(36).Default(""),
		field.Int("version").Default(1),
		field.Int("public_version").Default(1),
		field.Int("sequence").Default(0),
		field.Int("public_sequence").Default(0),
		field.Time("updated_at").Default(time.Now),
		field.Time("public_updated_at").Default(time.Now),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors SQL constraints.
func (Conversation) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("order_id").Unique().StorageKey("conversation_order"),
		index.Fields("created_by", "request_key").Unique().StorageKey("conversation_request"),
		index.Fields("user_id", "public_updated_at", "id").StorageKey("conversation_customer"),
		index.Fields("state", "updated_at", "id").StorageKey("conversation_inbox"),
	}
}
