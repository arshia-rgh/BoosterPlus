package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// Article maps handwritten SQL editorial records.
type Article struct{ ent.Schema }

// Fields defines the explicit column mapping.
func (Article) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("game_id").MaxRuneLen(36).Default("").Immutable(),
		field.Int("version").Default(1).Positive(),
		field.String("state").MaxRuneLen(32).Default(""),
		field.String("draft_revision").MaxRuneLen(36).Default(""),
		field.String("current_revision").MaxRuneLen(36).Default(""),
		field.String("scheduled_revision").MaxRuneLen(36).Default(""),
		field.String("schedule_token").MaxRuneLen(36).Default(""),
		field.String("scheduled_by").MaxRuneLen(36).Default(""),
		field.Int64("scheduled_auth_version").Default(0),
		field.Time("scheduled_at").Optional().Nillable(),
		field.Time("published_at").Optional().Nillable(),
		field.Time("public_updated_at").Optional().Nillable(),
		field.String("title").MaxRuneLen(160).Default(""),
		field.String("kind").MaxRuneLen(16).Default(""),
		field.String("author").MaxRuneLen(120).Default(""),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now)}
}

// Indexes mirrors explicit SQL constraints.
func (Article) Indexes() []ent.Index {
	return []ent.Index{index.Fields("game_id", "state", "id").StorageKey("article_game_list"), index.Fields("state", "id").StorageKey("article_staff_list")}
}
