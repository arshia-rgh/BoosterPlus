package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ServiceCase maps durable financial records owned by explicit SQL migrations.
type ServiceCase struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (ServiceCase) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("active_order_id").MaxLen(36).Optional().Nillable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("kind").MaxLen(32).Immutable(),
		field.JSON("policy", map[string]any{}).Immutable(),
		field.String("state").MaxLen(32).Default("open"),
		field.String("previous_state").MaxLen(32).Immutable(),
		field.String("outcome").MaxLen(32).Default(""),
		field.Int("version").Default(1),
		field.Int("appeal_count").Default(0),
		field.Time("appeal_until").Optional().Nillable(),
		field.Time("created_at").Immutable(),
		field.Time("updated_at"),
	}
}

// Indexes mirrors the explicit uniqueness and pagination constraints.
func (ServiceCase) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("active_order_id").Unique().StorageKey("case_active_order"),
		index.Fields("order_id", "created_at", "id").StorageKey("case_order_history"),
		index.Fields("state", "updated_at", "id").StorageKey("case_review_queue"),
	}
}
