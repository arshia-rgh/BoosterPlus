package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// AvailabilitySubscription maps explicit SQL availability consent and delivery state.
type AvailabilitySubscription struct{ ent.Schema }

// Fields mirrors the hand-authored migration.
func (AvailabilitySubscription) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("target_id").MaxLen(36).Immutable(),
		field.Int("version"),
		field.String("state").MaxLen(16),
		field.String("email_fingerprint").MaxLen(64),
		field.Int("last_cycle"),
		field.String("consent_version").MaxLen(32),
		field.String("suppression_reason").MaxLen(32),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors SQL uniqueness and bounded query access.
func (AvailabilitySubscription) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "target_id").Unique().StorageKey("availability_subscription"),
		index.Fields("target_id", "state", "last_cycle", "id").StorageKey("availability_fanout"),
		index.Fields("user_id", "id").StorageKey("availability_owner"),
	}
}
