package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// Review is private feedback until explicit moderation publishes its current revision.
type Review struct{ ent.Schema }

// Fields mirrors explicit SQL, including immutable purchase evidence and create deduplication.
func (Review) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("order_id").MaxLen(36).Immutable(),
		field.String("contract_id").MaxLen(36).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("game_id").MaxLen(36).Immutable(),
		field.String("game_name").MaxRuneLen(120).Immutable(),
		field.String("slug").MaxLen(80).Immutable(),
		field.String("service").MaxLen(48).Immutable(),
		field.String("package_key").MaxLen(48).Immutable(),
		field.String("request_key").MaxLen(36).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.Int("version").Default(1),
		field.Enum("state").Values("pending", "published", "hidden", "rejected", "withdrawn").Default("pending"),
		field.Int8("rating"),
		field.String("body"),
		field.JSON("answers", map[string]any{}),
		field.JSON("policy", map[string]any{}),
		field.String("policy_release_id").MaxLen(36),
		field.String("response"),
		field.String("reason_code").MaxLen(32),
		field.String("internal_reason"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
		field.Time("published_at").Optional().Nillable(),
	}
}

// Indexes enforces one actual buyer review per purchase and bounded private/public queues.
func (Review) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("order_id").Unique().StorageKey("review_order"),
		index.Fields("user_id", "request_key").Unique().StorageKey("review_request"),
		index.Fields("user_id", "created_at", "id").StorageKey("review_customer"),
		index.Fields("state", "updated_at", "id").StorageKey("review_queue"),
		index.Fields("game_id", "state", "rating", "id").StorageKey("review_public"),
	}
}
