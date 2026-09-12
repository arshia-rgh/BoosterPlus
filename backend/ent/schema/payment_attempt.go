package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// PaymentAttempt maps durable financial records owned by explicit SQL migrations.
type PaymentAttempt struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (PaymentAttempt) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("contract_id").MaxLen(36).Immutable(),
		field.String("active_contract_id").MaxLen(36).Optional().Nillable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("account").MaxLen(80).Immutable(),
		field.String("policy_id").MaxLen(36).Immutable(),
		field.JSON("policy", map[string]any{}).Immutable(),
		field.JSON("route", map[string]any{}).Immutable(),
		field.String("currency").MaxLen(3).Immutable(),
		field.String("amount_minor").MaxLen(12).Immutable(),
		field.Bool("post_claimed").Default(true),
		field.String("state").MaxLen(32).Default("new"),
		field.String("invoice_id").MaxLen(32).Optional().Nillable(),
		field.String("checkout_url").MaxLen(2048).Default(""),
		field.String("issue").MaxLen(48).Default(""),
		field.Time("created_at").Immutable(),
		field.Time("funds_detected_at").Optional().Nillable(),
		field.Time("expires_at").Immutable(),
		field.Time("updated_at"),
	}
}

// Indexes mirrors the explicit uniqueness and pagination constraints.
func (PaymentAttempt) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("active_contract_id").Unique().StorageKey("payment_active_attempt"),
		index.Fields("account", "invoice_id").Unique().StorageKey("payment_invoice"),
		index.Fields("order_id", "created_at", "id").StorageKey("payment_order_history"),
		index.Fields("state", "updated_at", "id").StorageKey("payment_attempt_queue"),
	}
}
