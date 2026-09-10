package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// OrderQuote maps SQL-owned business records. The application never migrates this schema.
type OrderQuote struct{ ent.Schema }

// Fields defines the explicit column mapping.
func (OrderQuote) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.Int("revision").Immutable(),
		field.Enum("state").Values("issued", "accepted", "superseded", "declined"),
		field.JSON("data", map[string]any{}).Immutable(),
		field.String("created_by").MaxLen(36).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors the explicit SQL constraints.
func (OrderQuote) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("order_id", "revision").Unique().StorageKey("order_quote_revision"),
	}
}
