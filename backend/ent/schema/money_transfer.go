package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// MoneyTransfer maps durable financial records owned by explicit SQL migrations.
type MoneyTransfer struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (MoneyTransfer) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.String("kind").MaxLen(32).Immutable(),
		field.String("seller_offer_id").MaxLen(36).Optional().Nillable().Immutable(),
		field.String("case_id").MaxLen(36).Immutable(),
		field.String("receipt_id").MaxLen(36).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("account").MaxLen(80).Immutable(),
		field.String("currency").MaxLen(32).Immutable(),
		field.String("network").MaxLen(64).Immutable(),
		field.String("amount").MaxLen(128).Immutable(),
		field.String("terms").MaxLen(2000).Immutable(),
		field.String("state").MaxLen(32).Default("recipient_pending"),
		field.Int("version").Default(1),
		field.JSON("recipient", map[string]any{}),
		field.Time("recipient_at").Optional().Nillable(),
		field.String("approved_by").MaxLen(36).Default(""),
		field.Time("approved_at").Optional().Nillable(),
		field.String("current_attempt").MaxLen(36).Default(""),
		field.Time("created_at").Immutable(),
		field.Time("updated_at"),
	}
}

// Indexes mirrors the explicit uniqueness and pagination constraints.
func (MoneyTransfer) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("seller_offer_id").Unique().StorageKey("seller_offer_payout"),
		index.Fields("receipt_id", "state").StorageKey("transfer_receipt_cap"),
		index.Fields("case_id", "created_at", "id").StorageKey("transfer_case"),
		index.Fields("user_id", "created_at", "id").StorageKey("transfer_customer"),
	}
}
