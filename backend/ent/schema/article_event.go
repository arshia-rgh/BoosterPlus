package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ArticleEvent maps handwritten SQL editorial records.
type ArticleEvent struct{ ent.Schema }

// Fields defines the explicit column mapping.
func (ArticleEvent) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("article_id").MaxRuneLen(36).Default("").Immutable(),
		field.Int("version").Default(1).Positive(),
		field.String("action").MaxRuneLen(32).Default(""),
		field.String("actor_id").MaxRuneLen(36).Default(""),
		field.String("revision_id").MaxRuneLen(36).Default(""),
		field.Time("created_at").Default(time.Now).Immutable()}
}

// Indexes mirrors explicit SQL constraints.
func (ArticleEvent) Indexes() []ent.Index {
	return []ent.Index{index.Fields("article_id", "version").Unique().StorageKey("article_event_version")}
}
