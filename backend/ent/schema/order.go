package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// Order maps SQL-owned business records. The application never migrates this schema.
type Order struct{ ent.Schema }

// Fields defines the explicit column mapping.
func (Order) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("game_id").MaxLen(36).Immutable(),
		field.String("game_name").MaxLen(120).Immutable(),
		field.String("slug").MaxLen(80).Immutable(),
		field.String("service").MaxLen(48).Immutable(),
		field.String("package_key").MaxLen(48).Immutable().Default(""),
		field.String("variant_key").MaxLen(48).Immutable().Default(""),
		field.Enum("kind").Values("custom", "package").Immutable(),
		field.String("request_key").MaxLen(36).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.Int("version").Default(1),
		field.Enum("state").Values("submitted", "needs_information", "quoted", "awaiting_payment", "queued", "in_progress", "on_hold", "completed", "rejected", "cancelled", "expired"),
		field.JSON("answers", map[string]any{}),
		field.JSON("snapshot", map[string]any{}).Immutable(),
		field.JSON("estimate", map[string]any{}),
		field.String("coupon_code").MaxLen(40).Default(""),
		field.String("terms_version").MaxLen(80).Immutable(),
		field.Int("quote_count").Default(0),
		field.String("current_quote").MaxLen(36).Default(""),
		field.String("current_contract").MaxLen(36).Default(""),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors the explicit SQL constraints.
func (Order) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "request_key").Unique().StorageKey("order_request"),
		index.Fields("user_id", "created_at", "id").StorageKey("order_customer_history"),
		index.Fields("state", "created_at", "id").StorageKey("order_admin_queue"),
	}
}
