package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// AccountReservation fences a unique inventory item against concurrent and late payments.
type AccountReservation struct{ ent.Schema }

// Fields describes explicit SQL-owned columns.
func (AccountReservation) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("listing_id").MaxLen(36).Immutable(),
		field.String("active_listing_id").MaxLen(36).Optional().Nillable(),
		field.String("release_id").MaxLen(36).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("state").MaxLen(32).Default("reserved"),
		field.Int("version").Default(1),
		field.Time("expires_at"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors handwritten SQL constraints.
func (AccountReservation) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("active_listing_id").Unique().StorageKey("account_unique_reservation"),
		index.Fields("order_id").Unique().StorageKey("account_order_reservation"),
		index.Fields("state", "expires_at", "id").StorageKey("account_reservation_expiry"),
	}
}
