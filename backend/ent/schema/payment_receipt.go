package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// PaymentReceipt maps durable financial records owned by explicit SQL migrations.
type PaymentReceipt struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (PaymentReceipt) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("record_id").MaxLen(36).Immutable(),
		field.String("attempt_id").MaxLen(36).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("currency").MaxLen(32).Immutable(),
		field.String("network").MaxLen(64).Immutable(),
		field.String("amount").MaxLen(128),
		field.String("state").MaxLen(32),
		field.String("observation_id").MaxLen(36),
		field.Time("created_at").Immutable(),
		field.Time("updated_at"),
	}
}

// Indexes mirrors the explicit uniqueness and pagination constraints.
func (PaymentReceipt) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("created_at", "id").StorageKey("receipt_report_created"),
		index.Fields("record_id").Unique().StorageKey("payment_receipt_reference"),
		index.Fields("user_id", "created_at", "id").StorageKey("payment_receipt_customer"),
	}
}
