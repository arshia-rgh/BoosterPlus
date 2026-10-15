package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// ConversationForm maps SQL-owned requests and deliveries. Secret answers live
// only in the expiring envelope vault, never in this row or a chat message.
type ConversationForm struct{ ent.Schema }

// Fields defines immutable recipient-bound form definitions and response state.
func (ConversationForm) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("conversation_id").MaxLen(36).Immutable(),
		field.String("created_by").MaxLen(36).Immutable(),
		field.String("recipient_id").MaxLen(36).Immutable(),
		field.String("booster_id").MaxLen(36).Default("").Immutable(),
		field.Enum("mode").Values("request", "share").Immutable(),
		field.Enum("purpose").Values("information", "game_access", "seller_access", "buyer_access").Immutable(),
		field.String("resource_id").MaxLen(36).Default("").Immutable(),
		field.String("title").MaxLen(120).Immutable(),
		field.String("description").MaxLen(500).Default("").Immutable(),
		field.JSON("fields", []map[string]any{}).Immutable(),
		field.JSON("answers", map[string]string{}).Optional().Sensitive(),
		field.Bool("has_secure").Default(false).Immutable(),
		field.Enum("state").Values("open", "answered", "cancelled").Default("open"),
		field.Int("version").Default(1),
		field.String("request_key").MaxLen(36).Immutable(),
		field.String("request_hash").MaxLen(64).Sensitive().Immutable(),
		field.String("response_key").MaxLen(36).Default(""),
		field.String("response_hash").MaxLen(64).Default("").Sensitive(),
		field.String("answered_by").MaxLen(36).Default(""),
		field.Time("answered_at").Optional().Nillable(),
		field.Time("expires_at").Immutable(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors the explicit SQL uniqueness and bounded context lookups.
func (ConversationForm) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("conversation_id", "created_by", "request_key").Unique().StorageKey("conversation_form_request"),
		index.Fields("conversation_id", "created_at", "id").StorageKey("conversation_form_thread"),
		index.Fields("purpose", "resource_id", "state", "created_at").StorageKey("conversation_form_resource"),
	}
}
