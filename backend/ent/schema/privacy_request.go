package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// PrivacyRequest maps versioned operational policy through explicit SQL migrations.
type PrivacyRequest struct{ ent.Schema }

// Fields mirrors SQL-owned columns.
func (PrivacyRequest) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("active_user_id").MaxLen(36).Optional().Nillable(),
		field.Int("version").Default(1),
		field.String("state").MaxLen(32).Default("requested"),
		field.String("policy_id").MaxLen(36).Immutable(),
		field.String("reviewed_policy_id").MaxLen(36).Default(""),
		field.Bool("manual_hold").Default(false),
		field.String("hold_reason").MaxLen(2000).Default(""),
		field.String("reviewed_by").MaxLen(36).Default(""),
		field.Time("eligible_at").Optional().Nillable(),
		field.Time("completed_at").Optional().Nillable(),
		field.Time("created_at").Immutable(),
		field.Time("updated_at"),
	}
}

// Indexes mirrors SQL uniqueness and bounded lookup constraints.
func (PrivacyRequest) Indexes() []ent.Index {
	return []ent.Index{index.Fields("active_user_id").Unique().StorageKey("privacy_active_user"), index.Fields("user_id", "id").StorageKey("privacy_owner"), index.Fields("state", "created_at", "id").StorageKey("privacy_queue")}
}
