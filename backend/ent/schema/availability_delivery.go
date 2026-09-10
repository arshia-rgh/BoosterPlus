package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// AvailabilityDelivery maps explicit SQL availability consent and delivery state.
type AvailabilityDelivery struct{ ent.Schema }

// Fields mirrors the hand-authored migration.
func (AvailabilityDelivery) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("subscription_id").MaxLen(36).Immutable(),
		field.String("target_id").MaxLen(36).Immutable(),
		field.Int("subscription_version").Immutable(),
		field.Int("cycle").Immutable(),
		field.String("email_fingerprint").MaxLen(64).Immutable(),
		field.String("state").MaxLen(16),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("sent_at").Optional().Nillable(),
	}
}

// Indexes mirrors SQL uniqueness and bounded query access.
func (AvailabilityDelivery) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("subscription_id", "cycle").Unique().StorageKey("availability_delivery"),
	}
}
