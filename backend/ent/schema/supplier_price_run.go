package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// SupplierPriceRun fences one scheduled read-only supplier price check window.
type SupplierPriceRun struct{ ent.Schema }

// Fields mirrors the explicit supplier price sync migration.
func (SupplierPriceRun) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("connection_id").MaxLen(32).Immutable(),
		field.Time("window_start").Immutable(),
		field.String("state").MaxLen(16).Default("running"),
		field.String("lease_owner").MaxLen(36).Default("").Sensitive(),
		field.Time("lease_until").Optional().Nillable(),
		field.String("cursor_id").MaxLen(36).Default(""),
		field.Int("batch").Default(0),
		field.Int("checked").Default(0),
		field.Int("repriced").Default(0),
		field.Int("flagged").Default(0),
		field.Int("deferred").Default(0),
		field.Int("failed").Default(0),
		field.String("issue").MaxLen(64).Default(""),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
		field.Time("finished_at").Optional().Nillable(),
	}
}

// Indexes keeps one run per connection and schedule window.
func (SupplierPriceRun) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("connection_id", "window_start").Unique().StorageKey("supplier_price_run_window"),
		index.Fields("connection_id", "created_at", "id").StorageKey("supplier_price_run_recent"),
	}
}
