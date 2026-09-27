package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ShopStock maps explicit SQL-owned shop records.
type ShopStock struct{ ent.Schema }

// Fields maps columns without performing migrations.
func (ShopStock) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("product_id").MaxLen(36).Immutable(),
		field.String("variant_key").MaxLen(48).Immutable(),
		field.String("release_id").MaxLen(36).Default(""),
		field.Bool("enabled").Default(false),
		field.String("label").MaxLen(120).Default(""),
		field.String("region").MaxLen(80).Default(""),
		field.String("platform").MaxLen(80).Default(""),
		field.String("server").MaxLen(80).Default(""),
		field.String("currency").MaxLen(3).Default(""),
		field.Int64("unit_amount_minor").NonNegative().Default(0),
		field.Int("min_quantity").Positive().Default(1),
		field.Int("max_quantity").Positive().Default(1),
		field.Int("version").Default(1).Positive(),
		field.Int("total").NonNegative().Default(0),
		field.Int("reserved").NonNegative().Default(0),
		field.Int("committed").NonNegative().Default(0),
		field.Time("updated_at").Default(time.Now)}
}

// Indexes mirrors handwritten SQL constraints.
func (ShopStock) Indexes() []ent.Index {
	return []ent.Index{index.Fields("product_id", "variant_key").Unique().StorageKey("shop_variant_stock")}
}
