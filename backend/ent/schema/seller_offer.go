package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// SellerOffer is a versioned proposal; accepted commercial data remains immutable.
type SellerOffer struct{ ent.Schema }

// Fields describes explicit SQL-owned columns.
func (SellerOffer) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("submission_id").MaxLen(36).Immutable(),
		field.String("active_submission_id").MaxLen(36).Optional().Nillable(),
		field.String("seller_id").MaxLen(36).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.Int("version").Default(1),
		field.JSON("data", map[string]any{}).Immutable(),
		field.String("state").MaxLen(32).Default("offered"),
		field.Time("expires_at").Immutable(),
		field.Time("accepted_at").Optional().Nillable(),
		field.Time("control_verified_at").Optional().Nillable(),
		field.String("control_verified_by").MaxLen(36).Default(""),
		field.String("control_evidence").MaxRuneLen(2000).Default(""),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors handwritten SQL constraints.
func (SellerOffer) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("active_submission_id").Unique().StorageKey("seller_active_offer"),
		index.Fields("submission_id", "created_at", "id").StorageKey("seller_offer_history"),
		index.Fields("seller_id", "created_at", "id").StorageKey("seller_own_offers"),
	}
}
