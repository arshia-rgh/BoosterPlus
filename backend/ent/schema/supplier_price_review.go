package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// SupplierPriceReview is the latest automatic price check for one published
// supplier product. Prices themselves live only in immutable releases.
type SupplierPriceReview struct{ ent.Schema }

// Fields mirrors the explicit supplier price sync migration.
func (SupplierPriceReview) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").StorageKey("shop_product_id").MaxLen(36).Immutable(),
		field.String("connection_id").MaxLen(32),
		field.Int("version").Default(1),
		field.String("status").MaxLen(32),
		field.String("attention").MaxLen(16).Default(""),
		field.String("release_id").MaxLen(36),
		field.String("quantity").MaxLen(64).Default(""),
		field.String("baseline_total").MaxLen(64).Default(""),
		field.String("supplier_total").MaxLen(64).Default(""),
		field.String("selling_minor").MaxLen(12).Default(""),
		field.Int("failures").Default(0),
		field.String("run_id").MaxLen(36),
		field.Time("checked_at"),
		field.Time("detected_at").Optional().Nillable(),
		field.String("acknowledged_by").MaxLen(36).Default(""),
		field.Time("acknowledged_at").Optional().Nillable(),
		field.Time("repriced_at").Optional().Nillable(),
		field.String("repriced_from_minor").MaxLen(12).Default(""),
		field.String("repriced_to_minor").MaxLen(12).Default(""),
		field.String("repriced_from_total").MaxLen(64).Default(""),
		field.String("repriced_to_total").MaxLen(64).Default(""),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes supports the attention banner and recent automatic updates.
func (SupplierPriceReview) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("attention", "detected_at", "id").StorageKey("supplier_price_review_attention"),
		index.Fields("repriced_at", "id").StorageKey("supplier_price_review_repriced"),
	}
}
