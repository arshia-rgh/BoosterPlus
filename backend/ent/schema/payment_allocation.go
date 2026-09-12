package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// PaymentAllocation maps durable financial records owned by explicit SQL migrations.
type PaymentAllocation struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (PaymentAllocation) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("receipt_id").MaxLen(36).Immutable(),
		field.String("contract_id").MaxLen(36).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("currency").MaxLen(3).Immutable(),
		field.String("amount_minor").MaxLen(12).Immutable(),
		field.String("crypto_amount").MaxLen(128).Immutable(),
		field.Time("created_at").Immutable(),
	}
}

// Indexes mirrors the explicit uniqueness and pagination constraints.
func (PaymentAllocation) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("contract_id").Unique().StorageKey("payment_contract_allocation"),
		index.Fields("receipt_id").Unique().StorageKey("payment_receipt_allocation"),
	}
}
