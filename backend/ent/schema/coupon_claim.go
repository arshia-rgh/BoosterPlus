package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// CouponClaim is an order contract's use of a coupon, never customer credit.
type CouponClaim struct{ ent.Schema }

// Fields maps claim columns owned by the explicit migration.
func (CouponClaim) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("coupon_id").MaxLen(36).Immutable(),
		field.Int("coupon_version").Positive().Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("contract_id").MaxLen(36).Immutable(),
		field.Enum("state").Values("held", "redeemed", "released"),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors one coupon per payable contract and bounded usage lookups.
func (CouponClaim) Indexes() []ent.Index {
	return []ent.Index{index.Fields("contract_id").Unique().StorageKey("coupon_contract"), index.Fields("coupon_id", "state", "user_id").StorageKey("coupon_usage")}
}
