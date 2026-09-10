package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// Fulfillment maps explicit SQL-owned paid-order execution records.
type Fulfillment struct{ ent.Schema }

// Fields maps independent commercial and execution versions.
func (Fulfillment) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.Int("version").Default(1),
		field.Int("access_version").Default(1),
		field.String("assigned_id").MaxLen(36),
		field.Enum("mode").Values("account", "together").Immutable(),
		field.Int("progress").Default(0),
		field.Bool("completion_pending").Default(false),
		field.String("current_note"),
		field.Time("estimated_start").Optional().Nillable(),
		field.Time("estimated_finish").Optional().Nillable(),
		field.JSON("answers", map[string]any{}),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors the handwritten migration.
func (Fulfillment) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("order_id").Unique().StorageKey("fulfillment_order"),
		index.Fields("assigned_id", "updated_at", "id").StorageKey("fulfillment_assignee"),
	}
}
