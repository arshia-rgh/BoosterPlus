package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ArticleSlug maps handwritten SQL editorial records.
type ArticleSlug struct{ ent.Schema }

// Fields defines the explicit column mapping.
func (ArticleSlug) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("game_id").MaxRuneLen(36).Default("").Immutable(),
		field.String("slug").MaxRuneLen(100).Default(""),
		field.String("article_id").MaxRuneLen(36).Default("").Immutable(),
		field.Time("created_at").Default(time.Now).Immutable()}
}

// Indexes mirrors explicit SQL constraints.
func (ArticleSlug) Indexes() []ent.Index {
	return []ent.Index{index.Fields("game_id", "slug").Unique().StorageKey("article_game_slug")}
}
