package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// SupplierPrice keeps authored pricing/mapping separate from refreshed catalogs.
type SupplierPrice struct{ ent.Schema }

// Fields retains explicit overrides through every supplier re-import.
func (SupplierPrice) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("connection_id").MaxLen(32).Immutable(),
		field.String("product_id").MaxLen(240).Immutable(),
		field.String("offer_id").MaxLen(240).Immutable(),
		field.Int("version").Default(1),
		field.Int("markup_bps").Optional().Nillable(),
		field.String("override_minor").MaxLen(12).Default(""),
		field.String("game_id").MaxLen(36).Default(""),
		field.String("region").MaxRuneLen(80).Default(""),
		field.String("delivery_method").MaxLen(32).Default(""),
		field.String("shop_product_id").MaxLen(36).Optional().Nillable(),
		field.String("updated_by").MaxLen(36),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes binds one provider offer and at most one corresponding authored product.
func (SupplierPrice) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("connection_id", "product_id", "offer_id").Unique().StorageKey("supplier_offer_price"),
		index.Fields("shop_product_id").Unique().StorageKey("supplier_bound_product"),
	}
}
