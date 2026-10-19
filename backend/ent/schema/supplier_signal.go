package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// SupplierSignal stores authenticated callback identity, never raw payloads.
type SupplierSignal struct{ ent.Schema }

// Fields maps the explicit callback receipt schema.
func (SupplierSignal) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("connection_id").MaxLen(32).Immutable(),
		field.String("digest").MaxLen(64).Immutable(),
		field.String("purchase_id").MaxLen(36).Immutable(),
		field.String("provider_id").MaxLen(32).Immutable(),
		field.String("signal_type").MaxLen(80).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes reject callback replay in the same supplier environment.
func (SupplierSignal) Indexes() []ent.Index {
	return []ent.Index{index.Fields("connection_id", "digest").Unique().StorageKey("supplier_signal_digest")}
}
