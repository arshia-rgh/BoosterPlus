package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// OrderEvent maps SQL-owned business records. The application never migrates this schema.
type OrderEvent struct{ ent.Schema }

// Fields defines the explicit column mapping.
func (OrderEvent) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.Int("version").Immutable(),
		field.String("action").MaxLen(48).Immutable(),
		field.String("message").MaxLen(2000).Immutable().Default(""),
		field.String("actor_id").MaxLen(36).Immutable(),
		field.String("actor_role").MaxLen(32).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors the explicit SQL constraints.
func (OrderEvent) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("order_id", "version").Unique().StorageKey("order_event_revision"),
	}
}
