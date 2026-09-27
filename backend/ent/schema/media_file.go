package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// MediaFile records private upload lifecycle; object keys are server-derived.
type MediaFile struct{ ent.Schema }

// Fields mirrors the hand-authored SQL migration.
func (MediaFile) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("conversation_id").MaxLen(36).Immutable(),
		field.String("intake_key").MaxLen(36).Default("").Immutable(),
		field.String("intake_order_id").MaxLen(36).Optional().Nillable(),
		field.Enum("visibility").Values("public", "internal").Immutable(),
		field.String("request_key").MaxLen(36).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.String("checksum").MaxLen(64).Immutable(),
		field.Int64("size").Immutable(),
		field.String("content_type").MaxLen(32).Immutable(),
		field.Enum("state").Values("pending", "uploaded", "queued", "ready", "rejected", "deleted").Default("pending"),
		field.String("message_id").MaxLen(36).Optional().Nillable(),
		field.String("clean_content_type").MaxLen(32).Default(""),
		field.String("clean_checksum").MaxLen(64).Default(""),
		field.Int64("clean_size").Default(0),
		field.Time("expires_at").Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
		field.Time("purged_at").Optional().Nillable(),
	}
}

// Indexes matches SQL-owned uniqueness and lookup constraints.
func (MediaFile) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "request_key").Unique().StorageKey("media_request"),
		index.Fields("user_id", "state").StorageKey("media_owner"),
		index.Fields("message_id", "expires_at").StorageKey("media_expiry"),
		index.Fields("message_id").StorageKey("media_message"),
		index.Fields("user_id", "intake_key").StorageKey("media_intake_scope"),
		index.Fields("intake_order_id").StorageKey("media_intake_order"),
	}
}
