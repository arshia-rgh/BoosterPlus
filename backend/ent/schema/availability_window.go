package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// AvailabilityWindow is a dated declaration; it does not reserve paid work.
type AvailabilityWindow struct{ ent.Schema }

// Fields maps immutable instants with explicit deactivation.
func (AvailabilityWindow) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(), field.String("user_id").MaxLen(36).Immutable(), field.Int("version").Default(1), field.String("request_key").MaxLen(36).Immutable(), field.String("request_hash").MaxLen(64).Immutable(), field.Time("starts_at").Immutable(), field.Time("ends_at").Immutable(), field.String("timezone").MaxLen(64).Immutable(), field.Bool("active").Default(true), field.Time("created_at").Default(time.Now).Immutable(), field.Time("updated_at").Default(time.Now)}
}

// Indexes mirrors the handwritten migration.
func (AvailabilityWindow) Indexes() []ent.Index {
	return []ent.Index{index.Fields("user_id", "request_key").Unique().StorageKey("availability_request"), index.Fields("user_id", "active", "starts_at", "id").StorageKey("availability_staff_time")}
}
