package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
)

// PaymentSettings maps durable financial records owned by explicit SQL migrations.
type PaymentSettings struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (PaymentSettings) Fields() []ent.Field {
	return []ent.Field{
		field.Int("id").Immutable(),
		field.Int("version").Default(1),
		field.String("published_id").MaxLen(36).Default(""),
		field.JSON("draft", map[string]any{}),
		field.Int("outgoing_page").Default(0),
		field.Int("discovery_page").Default(0),
		field.Time("updated_at"),
	}
}
