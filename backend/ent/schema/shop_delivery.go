package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ShopDelivery records manual staff delivery separately from boost execution.
type ShopDelivery struct{ ent.Schema }

// Fields maps explicit SQL-owned delivery columns.
func (ShopDelivery) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.Int("version").Positive().Default(1),
		field.String("assigned_id").MaxLen(36),
		field.String("state").MaxLen(32).Default("processing"),
		field.String("note").MaxRuneLen(2000),
		field.String("proof_message_id").MaxLen(36).Default(""),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors handwritten delivery uniqueness and queue lookups.
func (ShopDelivery) Indexes() []ent.Index {
	return []ent.Index{index.Fields("order_id").Unique().StorageKey("shop_order_delivery"), index.Fields("state", "updated_at", "id").StorageKey("shop_delivery_queue"), index.Fields("assigned_id", "state", "updated_at", "id").StorageKey("shop_delivery_assignee")}
}
