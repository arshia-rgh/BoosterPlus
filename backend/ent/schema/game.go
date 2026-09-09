// Package schema defines Ent query mappings for the hand-authored SQL schema.
package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// Game stores a mutable catalog draft and the current immutable release pointer.
type Game struct{ ent.Schema }

// Fields defines the draft catalog mapping.
func (Game) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("slug").MaxLen(80).Unique().NotEmpty(),
		field.String("name").MaxLen(120).NotEmpty(),
		field.JSON("configuration", map[string]any{}),
		field.Int("version").Default(1).Positive(),
		field.Bool("published").Default(false),
		field.Bool("paused").Default(false),
		field.Bool("archived").Default(false),
		field.String("current_release").MaxLen(36).Default(""),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}
