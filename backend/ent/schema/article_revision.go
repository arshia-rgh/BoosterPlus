package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ArticleRevision maps handwritten SQL editorial records.
type ArticleRevision struct{ ent.Schema }

// Fields defines the explicit column mapping.
func (ArticleRevision) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("article_id").MaxRuneLen(36).Default("").Immutable(),
		field.Int("version").Default(1).Positive(),
		field.JSON("data", map[string]any{}).Immutable(),
		field.String("title").MaxRuneLen(160).Default(""),
		field.String("slug").MaxRuneLen(100).Default(""),
		field.String("kind").MaxRuneLen(16).Default(""),
		field.String("author").MaxRuneLen(120).Default(""),
		field.Time("created_at").Default(time.Now).Immutable()}
}

// Indexes mirrors explicit SQL constraints.
func (ArticleRevision) Indexes() []ent.Index {
	return []ent.Index{index.Fields("article_id", "version").Unique().StorageKey("article_revision_version")}
}
