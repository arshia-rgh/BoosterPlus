package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// AccountListingRelease retains exactly the public product and sale terms accepted by a buyer.
type AccountListingRelease struct{ ent.Schema }

// Fields describes explicit SQL-owned columns.
func (AccountListingRelease) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("listing_id").MaxLen(36).Immutable(),
		field.Int("version").Immutable(),
		field.JSON("data", map[string]any{}).Immutable(),
		field.String("created_by").MaxLen(36).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors handwritten SQL constraints.
func (AccountListingRelease) Indexes() []ent.Index {
	return []ent.Index{index.Fields("listing_id", "version").Unique().StorageKey("account_listing_release_version")}
}
