package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// BookingEvent preserves customer-visible booking history separately from staff identities.
type BookingEvent struct{ ent.Schema }

// Fields maps an append-only timeline row.
func (BookingEvent) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(), field.String("booking_id").MaxLen(36).Immutable(), field.Int("version").Immutable(), field.String("state").MaxLen(16).Immutable(), field.String("note").Immutable(), field.String("actor_role").MaxLen(32).Immutable(), field.Time("created_at").Default(time.Now).Immutable()}
}

// Indexes mirrors the event version invariant.
func (BookingEvent) Indexes() []ent.Index {
	return []ent.Index{index.Fields("booking_id", "version").Unique().StorageKey("booking_event_version")}
}
