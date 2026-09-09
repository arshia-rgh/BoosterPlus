package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// CatalogRelease is an immutable, complete catalog snapshot, written by publication.
type CatalogRelease struct{ ent.Schema }

// Fields maps SQL-owned publication columns.
func (CatalogRelease) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("game_id").MaxLen(36).Immutable(),
		field.Int("version").Positive().Immutable(),
		field.JSON("configuration", map[string]any{}).Immutable(),
		field.String("created_by").MaxLen(36).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors the SQL unique publication revision constraint.
func (CatalogRelease) Indexes() []ent.Index {
	return []ent.Index{index.Fields("game_id", "version").Unique().StorageKey("catalog_release_revision")}
}
