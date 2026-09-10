package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// Favorite maps SQL-owned business records. The application never migrates this schema.
type Favorite struct{ ent.Schema }

// Fields defines the explicit column mapping.
func (Favorite) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("target").MaxLen(200).Immutable(),
		field.String("slug").MaxLen(80).Immutable(),
		field.String("service").MaxLen(48).Immutable().Default(""),
		field.String("package_key").MaxLen(48).Immutable().Default(""),
		field.Enum("kind").Values("game", "service", "package").Immutable(),
		field.String("name").MaxLen(300).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors the explicit SQL constraints.
func (Favorite) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "target").Unique().StorageKey("favorite_target"),
	}
}
