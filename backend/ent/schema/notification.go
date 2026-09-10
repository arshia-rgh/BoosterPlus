package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// Notification maps explicit SQL-owned private communication records.
type Notification struct{ ent.Schema }

// Fields defines the SQL mapping.
func (Notification) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("resource_id").MaxLen(36).Immutable(),
		field.String("message_id").MaxLen(36).Immutable(),
		field.String("kind").MaxLen(32).Immutable(),
		field.Time("read_at").Optional().Nillable(),
		field.Time("emailed_at").Optional().Nillable(),
		field.Enum("email_state").Values("pending", "sent", "suppressed").Default("pending"),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors SQL constraints.
func (Notification) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "message_id").Unique().StorageKey("notification_message"),
	}
}
