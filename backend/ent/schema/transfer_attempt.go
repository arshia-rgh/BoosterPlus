package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// TransferAttempt maps durable financial records owned by explicit SQL migrations.
type TransferAttempt struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (TransferAttempt) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("transfer_id").MaxLen(36).Immutable(),
		field.String("account").MaxLen(80).Immutable(),
		field.String("active_transfer_id").MaxLen(36).Optional().Nillable(),
		field.JSON("recipient", map[string]any{}).Immutable(),
		field.String("state").MaxLen(32).Default("approved"),
		field.Int("version").Default(0),
		field.String("provider_id").MaxLen(32).Optional().Nillable(),
		field.String("batch_id").MaxLen(32).Default(""),
		field.String("issue").MaxLen(48).Default(""),
		field.String("lease_owner").MaxLen(36).Default(""),
		field.Time("lease_until").Optional().Nillable(),
		field.JSON("data", map[string]any{}),
		field.Time("checked_at"),
		field.Time("created_at").Immutable(),
		field.Time("updated_at"),
	}
}

// Indexes mirrors the explicit uniqueness and pagination constraints.
func (TransferAttempt) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("active_transfer_id").Unique().StorageKey("transfer_active_attempt"),
		index.Fields("account", "provider_id").Unique().StorageKey("transfer_provider_reference"),
		index.Fields("account", "checked_at", "id").StorageKey("transfer_reconcile_due"),
	}
}
