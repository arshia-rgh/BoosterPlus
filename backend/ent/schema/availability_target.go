package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// AvailabilityTarget maps explicit SQL availability consent and delivery state.
type AvailabilityTarget struct{ ent.Schema }

// Fields mirrors the hand-authored migration.
func (AvailabilityTarget) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("game_id").MaxLen(36).Immutable(),
		field.String("slug").MaxLen(80).Immutable(),
		field.String("package_key").MaxLen(48).Immutable(),
		field.String("variant_key").MaxLen(48).Immutable(),
		field.JSON("criteria", map[string]any{}).Optional().Immutable(),
		field.String("stock_marker").MaxLen(100).Default(""),
		field.Bool("available"),
		field.Int("cycle"),
		field.Time("checked_at").Default(time.Now),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors SQL uniqueness and bounded query access.
func (AvailabilityTarget) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("game_id", "package_key", "variant_key").Unique().StorageKey("availability_target"),
	}
}
