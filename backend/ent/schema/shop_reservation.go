package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ShopReservation binds exact units to one accepted order and financial lifecycle.
type ShopReservation struct{ ent.Schema }

// Fields maps explicit SQL-owned reservation columns.
func (ShopReservation) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("product_id").MaxLen(36).Immutable(),
		field.String("release_id").MaxLen(36).Immutable(),
		field.String("variant_key").MaxLen(48).Immutable(),
		field.Int("quantity").Positive().Immutable(),
		field.String("state").MaxLen(32).Default("reserved"),
		field.Int("version").Positive().Default(1),
		field.Time("expires_at"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors reservation ownership and bounded expiry paging.
func (ShopReservation) Indexes() []ent.Index {
	return []ent.Index{index.Fields("order_id").Unique().StorageKey("shop_order_reservation"), index.Fields("state", "expires_at", "id").StorageKey("shop_reservation_expiry"), index.Fields("user_id", "state", "id").StorageKey("shop_customer_reservations")}
}
