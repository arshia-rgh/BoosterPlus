package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ShopProductRelease maps explicit SQL-owned shop records.
type ShopProductRelease struct{ ent.Schema }

// Fields maps columns without performing migrations.
func (ShopProductRelease) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("product_id").MaxLen(36).Immutable(),
		field.Int("version").Positive().Immutable(),
		field.JSON("data", map[string]any{}).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable()}
}

// Indexes mirrors handwritten SQL constraints.
func (ShopProductRelease) Indexes() []ent.Index {
	return []ent.Index{index.Fields("product_id", "version").Unique().StorageKey("shop_product_release_version")}
}
