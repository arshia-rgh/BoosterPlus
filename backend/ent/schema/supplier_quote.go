package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// SupplierQuote is a short-lived, customer-bound commercial quote, not stock.
type SupplierQuote struct{ ent.Schema }

// Fields never include recipient input or public credentials.
func (SupplierQuote) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("shop_product_id").MaxLen(36).Immutable(),
		field.String("release_id").MaxLen(36).Immutable(),
		field.JSON("data", &suppliers.Quote{}).Immutable().Sensitive(),
		field.String("amount_minor").MaxLen(12).Immutable(),
		field.String("order_id").MaxLen(36).Optional().Nillable(),
		field.Time("expires_at").Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes prevents a quote from being consumed by multiple orders.
func (SupplierQuote) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("order_id").Unique().StorageKey("supplier_quote_order"),
		index.Fields("user_id", "expires_at").StorageKey("supplier_quote_customer"),
	}
}
