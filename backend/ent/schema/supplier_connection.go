package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
)

// SupplierConnection maps the SQL-owned pointer to a complete private catalog.
type SupplierConnection struct{ ent.Schema }

// Fields never stores supplier tokens or dashboard credentials.
func (SupplierConnection) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(32).Immutable(),
		field.String("merchant_id").MaxLen(20).Default(""),
		field.Int("version").Default(1),
		field.Int("markup_bps").Default(1500),
		field.String("current_import").MaxLen(36).Default(""),
		field.String("active_import").MaxLen(36).Default(""),
		field.Bool("purchases_enabled").Default(false),
		field.Time("updated_at").Default(time.Now),
	}
}
