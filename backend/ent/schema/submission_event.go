package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// SubmissionEvent records private intake history without copying private form values into events.
type SubmissionEvent struct{ ent.Schema }

// Fields mirrors SQL-owned immutable review events.
func (SubmissionEvent) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("submission_id").MaxLen(36).Immutable(),
		field.Int("version").Immutable(),
		field.String("action").MaxLen(32).Immutable(),
		field.String("state").MaxLen(32).Immutable(),
		field.String("message").Immutable(),
		field.String("actor_role").MaxLen(24).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes prevents duplicate history for a revision.
func (SubmissionEvent) Indexes() []ent.Index {
	return []ent.Index{index.Fields("submission_id", "version").Unique().StorageKey("submission_event_version")}
}
