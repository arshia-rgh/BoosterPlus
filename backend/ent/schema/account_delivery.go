package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// AccountDelivery binds protected buyer handoff to a verified paid unique reservation.
type AccountDelivery struct{ ent.Schema }

// Fields describes explicit SQL-owned columns.
func (AccountDelivery) Fields() []ent.Field {
	return []ent.Field{
		field.String("form_id").MaxLen(36).Default(""),
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("listing_id").MaxLen(36).Immutable(),
		field.String("buyer_id").MaxLen(36).Immutable(),
		field.String("state").MaxLen(32).Default("pending"),
		field.Int("version").Default(1),
		field.String("instructions").MaxRuneLen(4000).Default(""),
		field.String("secret_owner_id").MaxLen(36).Default(""),
		field.Int("secret_version").Default(0),
		field.Time("delivered_at").Optional().Nillable(),
		field.Time("acknowledged_at").Optional().Nillable(),
		field.Time("dispute_until").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors handwritten SQL constraints.
func (AccountDelivery) Indexes() []ent.Index {
	return []ent.Index{index.Fields("order_id").Unique().StorageKey("account_order_delivery")}
}
