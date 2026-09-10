package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// OrderContract maps SQL-owned business records. The application never migrates this schema.
type OrderContract struct{ ent.Schema }

// Fields defines the explicit column mapping.
func (OrderContract) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("active_order_id").MaxLen(36).Optional().Nillable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("game_id").MaxLen(36).Immutable(),
		field.String("package_key").MaxLen(48).Immutable().Default(""),
		field.String("variant_key").MaxLen(48).Immutable().Default(""),
		field.Bool("capacity_held").Default(false),
		field.Enum("payment_state").Values("unissued", "invoice_pending", "awaiting_payment", "funds_detected", "settled", "retired"),
		field.JSON("data", map[string]any{}).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors the explicit SQL constraints.
func (OrderContract) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("active_order_id").Unique().StorageKey("order_active_contract"),
		index.Fields("order_id").StorageKey("order_contract_history"),
		index.Fields("game_id", "package_key", "variant_key", "capacity_held").StorageKey("package_capacity"),
	}
}
