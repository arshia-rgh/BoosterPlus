package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// Booking is a customer proposal or a transactionally confirmed session.
type Booking struct{ ent.Schema }

// Fields preserves immutable session times; rescheduling creates a new proposal.
func (Booking) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(), field.String("order_id").MaxLen(36).Immutable(), field.String("user_id").MaxLen(36).Immutable(), field.String("assigned_id").MaxLen(36).Immutable(), field.String("availability_id").MaxLen(36).Immutable(), field.Int("version").Default(1), field.String("request_key").MaxLen(36).Immutable(), field.String("request_hash").MaxLen(64).Immutable(), field.String("previous_id").MaxLen(36).Immutable().Default(""), field.Time("starts_at").Immutable(), field.Time("ends_at").Immutable(), field.String("timezone").MaxLen(64).Immutable(), field.Enum("state").Values("proposed", "confirmed", "cancelled", "completed", "no_show").Default("proposed"), field.Bool("reminded").Default(false), field.Time("created_at").Default(time.Now).Immutable(), field.Time("updated_at").Default(time.Now)}
}

// Indexes supports idempotency, history, interval checks and reminder batches.
func (Booking) Indexes() []ent.Index {
	return []ent.Index{index.Fields("user_id", "request_key").Unique().StorageKey("booking_request"), index.Fields("order_id", "created_at", "id").StorageKey("booking_order"), index.Fields("assigned_id", "state", "starts_at", "ends_at").StorageKey("booking_staff_time"), index.Fields("user_id", "state", "starts_at", "ends_at").StorageKey("booking_customer_time"), index.Fields("state", "reminded", "starts_at", "id").StorageKey("booking_reminder")}
}
