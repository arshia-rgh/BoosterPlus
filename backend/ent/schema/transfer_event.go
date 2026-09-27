package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// TransferEvent maps durable financial records owned by explicit SQL migrations.
type TransferEvent struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (TransferEvent) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("transfer_id").MaxLen(36).Immutable(),
		field.Int("version").Immutable(),
		field.String("action").MaxLen(32).Immutable(),
		field.String("actor_id").MaxLen(36).Immutable(),
		field.JSON("snapshot", map[string]any{}).Optional().Immutable(),
		field.Time("created_at").Immutable(),
	}
}

// Indexes mirrors the explicit uniqueness and pagination constraints.
func (TransferEvent) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("transfer_id", "version").Unique().StorageKey("transfer_event_version"),
	}
}
