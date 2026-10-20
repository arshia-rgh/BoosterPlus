package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// SupplierImport tracks a fenced bulk read. Failed imports never replace live data.
type SupplierImport struct{ ent.Schema }

// Fields mirrors the explicit supplier catalog migration.
func (SupplierImport) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("connection_id").MaxLen(32).Immutable(),
		field.String("merchant_id").MaxLen(20).Immutable(),
		field.String("created_by").MaxLen(36).Immutable(),
		field.Int64("auth_version").Immutable(),
		field.String("state").MaxLen(32).Default("queued"),
		field.String("lease_owner").MaxLen(36).Default("").Sensitive(),
		field.Time("lease_until").Optional().Nillable(),
		field.JSON("metadata", map[string]any{}).Optional(),
		field.Int("product_count").Default(0),
		field.Int("offer_count").Default(0),
		field.String("issue").MaxLen(64).Default(""),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors the bounded private import history lookup.
func (SupplierImport) Indexes() []ent.Index {
	return []ent.Index{index.Fields("connection_id", "created_at", "id").StorageKey("supplier_import_history")}
}
