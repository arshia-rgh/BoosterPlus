package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// PaymentSignal maps durable financial records owned by explicit SQL migrations.
type PaymentSignal struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (PaymentSignal) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("account").MaxLen(80).Immutable(),
		field.String("payment_id").MaxLen(32).Immutable(),
		field.String("digest").MaxLen(64).Immutable(),
		field.Time("created_at").Immutable(),
	}
}

// Indexes mirrors the explicit uniqueness and pagination constraints.
func (PaymentSignal) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("account", "digest").Unique().StorageKey("payment_signal_dedup"),
	}
}
