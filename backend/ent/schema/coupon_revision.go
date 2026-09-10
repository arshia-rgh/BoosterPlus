package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// CouponRevision preserves the policy used for an individual quote or contract.
type CouponRevision struct{ ent.Schema }

// Fields maps immutable coupon history.
func (CouponRevision) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("coupon_id").MaxLen(36).Immutable(),
		field.Int("version").Positive().Immutable(),
		field.JSON("definition", map[string]any{}).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.String("created_by").MaxLen(36).Immutable(),
	}
}

// Indexes mirrors the SQL revision constraint.
func (CouponRevision) Indexes() []ent.Index {
	return []ent.Index{index.Fields("coupon_id", "version").Unique().StorageKey("coupon_revision")}
}
