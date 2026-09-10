package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ReviewRevision preserves customer wording and moderation evidence without public history leakage.
type ReviewRevision struct{ ent.Schema }

// Fields is an immutable private snapshot for every review transition.
func (ReviewRevision) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("review_id").MaxLen(36).Immutable(),
		field.Int("version").Immutable(),
		field.String("action").MaxLen(32).Immutable(),
		field.String("state").MaxLen(24).Immutable(),
		field.Int8("rating").Immutable(),
		field.String("body").Immutable(),
		field.JSON("answers", map[string]any{}).Immutable(),
		field.JSON("policy", map[string]any{}).Immutable(),
		field.String("response").Immutable(),
		field.String("reason_code").MaxLen(32).Immutable(),
		field.String("internal_reason").Immutable(),
		field.String("actor_role").MaxLen(24).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes prevents two history records claiming the same observed revision.
func (ReviewRevision) Indexes() []ent.Index {
	return []ent.Index{index.Fields("review_id", "version").Unique().StorageKey("review_revision")}
}
