package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// User is a passwordless customer or staff identity. Authentication arrives in P02.
type User struct{ ent.Schema }

// Fields defines the SQL-backed user mapping; schema changes are hand-authored SQL.
func (User) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("email").MaxLen(254).Unique().NotEmpty(),
		field.String("display_name").MaxLen(100).Default(""),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}
