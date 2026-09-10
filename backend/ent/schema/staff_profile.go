package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
)

// StaffProfile stores explicitly declared staffing information, never role grants.
type StaffProfile struct{ ent.Schema }

// Fields maps the SQL-owned profile keyed by staff user UUID.
func (StaffProfile) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).Immutable(), field.Int("version").Default(1), field.String("timezone").MaxLen(64), field.Bool("enabled").Default(false), field.JSON("game_tags", []string{}), field.JSON("region_tags", []string{}), field.Time("updated_at").Default(time.Now)}
}
