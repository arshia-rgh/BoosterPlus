package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// SellerOfferEvent is private to the seller and authorized administrators.
type SellerOfferEvent struct{ ent.Schema }

// Fields describes explicit SQL-owned columns.
func (SellerOfferEvent) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("offer_id").MaxLen(36).Immutable(),
		field.Int("version").Immutable(),
		field.String("action").MaxLen(32).Immutable(),
		field.String("actor_id").MaxLen(36).Immutable(),
		field.String("actor_role").MaxLen(32).Immutable(),
		field.String("note").MaxRuneLen(2000).Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes mirrors handwritten SQL constraints.
func (SellerOfferEvent) Indexes() []ent.Index {
	return []ent.Index{index.Fields("offer_id", "version").Unique().StorageKey("seller_offer_event_version")}
}
