package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// SiteRelease maps versioned operational policy through explicit SQL migrations.
type SiteRelease struct{ ent.Schema }

// Fields mirrors SQL-owned columns.
func (SiteRelease) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("kind").MaxLen(32).Immutable(),
		field.Int("version").Immutable(),
		field.String("label").MaxLen(64).Immutable(),
		field.JSON("data", map[string]any{}).Immutable(),
		field.String("created_by").MaxLen(36).Immutable(),
		field.Time("created_at").Immutable(),
	}
}

// Indexes mirrors SQL uniqueness and bounded lookup constraints.
func (SiteRelease) Indexes() []ent.Index {
	return []ent.Index{index.Fields("kind", "version").Unique().StorageKey("site_release_version"), index.Fields("kind", "label").Unique().StorageKey("site_release_label")}
}
