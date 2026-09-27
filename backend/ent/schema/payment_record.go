package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// PaymentRecord maps durable financial records owned by explicit SQL migrations.
type PaymentRecord struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (PaymentRecord) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("account").MaxLen(80).Immutable(),
		field.String("payment_id").MaxLen(32).Immutable(),
		field.String("attempt_id").MaxLen(36).Default(""),
		field.String("manual_job_id").MaxLen(64).Default(""),
		field.Int("version").Default(0),
		field.String("lease_owner").MaxLen(36).Default(""),
		field.Time("lease_until").Optional().Nillable(),
		field.String("state").MaxLen(32).Default("unknown"),
		field.String("issue").MaxLen(48).Default(""),
		field.JSON("data", map[string]any{}),
		field.Time("checked_at"),
		field.Time("created_at").Immutable(),
	}
}

// Indexes mirrors the explicit uniqueness and pagination constraints.
func (PaymentRecord) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("account", "payment_id").Unique().StorageKey("payment_provider_reference"),
		index.Fields("account", "checked_at", "id").StorageKey("payment_reconcile_due"),
		index.Fields("account", "attempt_id", "checked_at", "id").StorageKey("payment_attempt_evidence"),
	}
}
