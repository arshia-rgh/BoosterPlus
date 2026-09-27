package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ShopProductEvent maps explicit SQL-owned shop records.
type ShopProductEvent struct{ ent.Schema }

// Fields maps columns without performing migrations.
func (ShopProductEvent) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("product_id").MaxLen(36).Immutable(),
		field.Int("version").Positive().Immutable(),
		field.String("action").MaxLen(32).Immutable(),
		field.String("actor_id").MaxLen(36).Immutable(),
		field.String("note").MaxRuneLen(2000).Default("").Immutable(),
		field.Time("created_at").Default(time.Now).Immutable()}
}

// Indexes mirrors handwritten SQL constraints.
func (ShopProductEvent) Indexes() []ent.Index {
	return []ent.Index{index.Fields("product_id", "version").Unique().StorageKey("shop_product_event_version")}
}
