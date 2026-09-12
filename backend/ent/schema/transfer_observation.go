package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// TransferObservation maps durable financial records owned by explicit SQL migrations.
type TransferObservation struct{ ent.Schema }

// Fields maps the SQL columns without performing migrations.
func (TransferObservation) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("record_id").MaxLen(36).Immutable(),
		field.String("attempt_id").MaxLen(36).Immutable(),
		field.Int("version").Immutable(),
		field.JSON("data", map[string]any{}).Immutable(),
		field.Time("created_at").Immutable(),
	}
}

// Indexes mirrors the explicit uniqueness and pagination constraints.
func (TransferObservation) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("record_id", "version").Unique().StorageKey("transfer_observation_version"),
	}
}
