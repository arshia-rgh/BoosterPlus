package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// PaymentPolicy maps durable financial records owned by explicit SQL migrations.
type PaymentPolicy struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (PaymentPolicy) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.JSON("data", map[string]any{}).Immutable(),
		field.String("created_by").MaxLen(36).Immutable(),
		field.Time("created_at").Immutable(),
	}
}
