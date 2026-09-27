package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ShopRecipient isolates delivery identifiers from public contracts and generic order answers.
// These values are ordinary identifiers, never credentials or provider secrets.
type ShopRecipient struct{ ent.Schema }

// Fields maps explicit SQL-owned private recipient columns.
func (ShopRecipient) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.JSON("recipient_values", map[string]string{}),
		field.Int("version").Positive().Default(1),
		field.Time("erased_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors one recipient declaration per order and private owner export paging.
func (ShopRecipient) Indexes() []ent.Index {
	return []ent.Index{index.Fields("order_id").Unique().StorageKey("shop_order_recipient"), index.Fields("user_id", "id").StorageKey("shop_recipient_owner")}
}
