package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// AccountSubmission is private seller intake, with no implied sale or payout agreement.
type AccountSubmission struct{ ent.Schema }

// Fields mirrors the handwritten SQL migration.
func (AccountSubmission) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("game_id").MaxLen(36).Immutable(),
		field.String("game_name").MaxRuneLen(120).Immutable(),
		field.String("slug").MaxLen(80).Immutable(),
		field.Int("version").Default(1),
		field.Enum("state").Values("draft", "submitted", "needs_information", "approved_pending_terms", "rejected", "withdrawn").Default("draft"),
		field.String("title").MaxRuneLen(120),
		field.JSON("answers", map[string]any{}),
		field.JSON("snapshot", map[string]any{}).Immutable(),
		field.String("ownership_notes"),
		field.Bool("ownership_declared").Default(false),
		field.String("current_note"),
		field.String("request_key").MaxLen(36).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors private request deduplication and bounded histories.
func (AccountSubmission) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "request_key").Unique().StorageKey("submission_request"),
		index.Fields("user_id", "created_at", "id").StorageKey("submission_customer"),
		index.Fields("state", "created_at", "id").StorageKey("submission_queue"),
	}
}
