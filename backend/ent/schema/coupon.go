package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// Coupon has a stable code and versioned discount policy; SQL owns its schema.
type Coupon struct{ ent.Schema }

// Fields maps coupon policy columns.
func (Coupon) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("code").MaxLen(40).Immutable(),
		field.Int("version").Positive().Default(1),
		field.JSON("definition", map[string]any{}),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors the SQL code uniqueness constraint.
func (Coupon) Indexes() []ent.Index {
	return []ent.Index{index.Fields("code").Unique().StorageKey("coupon_code")}
}
