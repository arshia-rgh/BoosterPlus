package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// SupplierItem retains a complete supplier product including unpriced offers.
type SupplierItem struct{ ent.Schema }

// Fields preserves exact Decimal values through typed JSON decoding.
func (SupplierItem) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("import_id").MaxLen(36).Immutable(),
		field.String("connection_id").MaxLen(32).Immutable(),
		field.String("product_id").MaxLen(240).Immutable(),
		field.String("game_id").MaxLen(240).Default("").Immutable(),
		field.String("category_id").MaxLen(240).Default("").Immutable(),
		field.String("title").MaxRuneLen(500).Immutable(),
		field.JSON("data", &suppliers.Product{}).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors the explicit uniqueness and filtered import indexes.
func (SupplierItem) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("import_id", "product_id").Unique().StorageKey("supplier_import_product"),
		index.Fields("import_id", "game_id", "id").StorageKey("supplier_import_game"),
		index.Fields("import_id", "category_id", "id").StorageKey("supplier_import_category"),
	}
}
