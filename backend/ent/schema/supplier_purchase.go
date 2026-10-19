package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// SupplierPurchase is the single durable purchase fence for an accepted order.
type SupplierPurchase struct{ ent.Schema }

// Fields maps SQL-owned commercial evidence without recipient plaintext.
func (SupplierPurchase) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("contract_id").MaxLen(36).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("connection_id").MaxLen(32).Immutable(),
		field.JSON("product", &suppliers.Product{}).Immutable().Sensitive(),
		field.String("offer_id").MaxLen(240).Immutable(),
		field.String("quantity").MaxLen(64).Immutable(),
		field.String("maximum_cost").MaxLen(64).Immutable(),
		field.String("amount_minor").MaxLen(12).Immutable(),
		field.String("input_secret_id").MaxLen(36).Immutable(),
		field.String("state").MaxLen(32).Default("awaiting_payment"),
		field.Int("version").Positive().Default(1),
		field.Bool("post_claimed").Default(false),
		field.String("provider_id").MaxLen(32).Optional().Nillable(),
		field.String("candidate_provider_id").MaxLen(32).Default(""),
		field.String("lease_owner").MaxLen(36).Default(""),
		field.Time("lease_until").Optional().Nillable(),
		field.Time("next_check"),
		field.Int("scan_offset").Default(0),
		field.String("issue").MaxLen(64).Default(""),
		field.String("provider_status").MaxLen(32).Default(""),
		field.String("actual_cost").MaxLen(64).Default(""),
		field.String("delivered").MaxLen(64).Default(""),
		field.String("delivery_secret_id").MaxLen(36).Default(""),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes enforce one purchase per order, contract and provider order.
func (SupplierPurchase) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("order_id").Unique().StorageKey("supplier_purchase_order"),
		index.Fields("contract_id").Unique().StorageKey("supplier_purchase_contract"),
		index.Fields("connection_id", "provider_id").Unique().StorageKey("supplier_purchase_provider"),
		index.Fields("next_check", "id").StorageKey("supplier_purchase_due"),
	}
}
