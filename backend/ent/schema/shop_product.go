package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ShopProduct maps explicit SQL-owned shop records.
type ShopProduct struct{ ent.Schema }

// Fields maps columns without performing migrations.
func (ShopProduct) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("game_id").MaxLen(36).Immutable(),
		field.String("slug").MaxLen(80).Immutable(),
		field.String("game_name").MaxRuneLen(120).Immutable(),
		field.Int("version").Default(1).Positive(),
		field.String("state").MaxLen(32).Default("draft"),
		field.JSON("draft", map[string]any{}),
		field.String("current_release").MaxLen(36).Default(""),
		field.String("title").MaxRuneLen(120).Default(""),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now)}
}

// Indexes mirrors handwritten SQL constraints.
func (ShopProduct) Indexes() []ent.Index {
	return []ent.Index{index.Fields("game_id", "slug").Unique().StorageKey("shop_product_slug"),
		index.Fields("state", "updated_at", "id").StorageKey("shop_staff_queue"),
		index.Fields("game_id", "state", "id").StorageKey("shop_game_catalog")}
}
