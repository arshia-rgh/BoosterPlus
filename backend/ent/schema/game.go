// Package schema defines Ent query mappings for the hand-authored SQL schema.
package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// Game stores a catalog draft; publication and validated forms arrive in P03.
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
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}
