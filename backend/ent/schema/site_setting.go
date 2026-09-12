package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
)

// SiteSetting maps versioned operational policy through explicit SQL migrations.
type SiteSetting struct{ ent.Schema }

// Fields mirrors SQL-owned columns.
func (SiteSetting) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(32).Immutable(),
		field.Int("version").Default(1),
		field.String("current_release").MaxLen(36).Default(""),
		field.JSON("draft", map[string]any{}),
		field.Time("updated_at"),
	}
}
