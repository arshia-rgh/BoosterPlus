package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// AccountListing separates private provenance from explicitly published product data.
type AccountListing struct{ ent.Schema }

// Fields describes explicit SQL-owned columns.
func (AccountListing) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("submission_id").MaxLen(36).Immutable(),
		field.String("offer_id").MaxLen(36).Immutable(),
		field.String("seller_id").MaxLen(36).Immutable(),
		field.String("game_id").MaxLen(36).Immutable(),
		field.String("game_name").MaxRuneLen(120).Immutable(),
		field.String("slug").MaxLen(80).Immutable(),
		field.Int("version").Default(1),
		field.String("state").MaxLen(32).Default("draft"),
		field.JSON("draft", map[string]any{}),
		field.String("current_release").MaxLen(36).Default(""),
		field.String("public_title").MaxRuneLen(120).Default(""),
		field.String("public_region").MaxRuneLen(80).Default(""),
		field.String("public_rank").MaxRuneLen(80).Default(""),
		field.String("public_currency").MaxLen(3).Default(""),
		field.Int64("public_amount_minor").Default(0),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors handwritten SQL constraints.
func (AccountListing) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("submission_id").Unique().StorageKey("account_single_inventory"),
		index.Fields("offer_id").Unique().StorageKey("account_offer_inventory"),
		index.Fields("state", "game_id", "created_at", "id").StorageKey("account_public_browse"),
		index.Fields("state", "created_at", "id").StorageKey("account_market_newest"),
		index.Fields("state", "slug", "created_at", "id").StorageKey("account_game_newest"),
		index.Fields("state", "public_currency", "public_amount_minor", "id").StorageKey("account_market_price"),
		index.Fields("state", "slug", "public_currency", "public_amount_minor", "id").StorageKey("account_game_price"),
	}
}
