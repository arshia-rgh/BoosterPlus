package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// SupplierBinding keeps provider costs and merchant identity outside public products.
// The draft uses its shop product ID; each publication has its own immutable ID.
type SupplierBinding struct{ ent.Schema }

// Fields maps the explicit SQL-owned binding.
func (SupplierBinding) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).Immutable(),
		field.String("shop_product_id").MaxLen(36).Immutable(),
		field.String("release_id").MaxLen(36).Optional().Nillable().Immutable(),
		field.JSON("data", &suppliers.ListingBinding{}).Sensitive(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes keeps one binding per immutable release.
func (SupplierBinding) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("release_id").Unique().StorageKey("supplier_binding_release"),
		index.Fields("shop_product_id", "id").StorageKey("supplier_binding_product"),
	}
}
