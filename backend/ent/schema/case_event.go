package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// CaseEvent maps durable financial records owned by explicit SQL migrations.
type CaseEvent struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (CaseEvent) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("case_id").MaxLen(36).Immutable(),
		field.Int("version").Immutable(),
		field.String("action").MaxLen(32).Immutable(),
		field.String("actor_id").MaxLen(36).Immutable(),
		field.String("actor_role").MaxLen(32).Immutable(),
		field.String("note").MaxLen(2000).Immutable(),
		field.String("message_id").MaxLen(36).Immutable().Default(""),
		field.Time("created_at").Immutable(),
	}
}

// Indexes mirrors the explicit uniqueness and pagination constraints.
func (CaseEvent) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("case_id", "version").Unique().StorageKey("case_event_version"),
	}
}
