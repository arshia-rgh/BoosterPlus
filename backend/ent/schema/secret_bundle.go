package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// SecretBundle stores two authenticated envelopes, never plaintext game access.
type SecretBundle struct{ ent.Schema }

// Fields maps the explicit SQL vault schema.
func (SecretBundle) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.Enum("purpose").Values("game_access", "account_transfer").Immutable(),
		field.String("resource_id").MaxLen(36).Immutable(),
		field.String("owner_id").MaxLen(36).Immutable(),
		field.Int("version").Default(1),
		field.String("key_version").MaxLen(32),
		field.Bytes("wrapped_key").Optional().Sensitive(),
		field.Bytes("encrypted_payload").Optional().Sensitive(),
		field.Enum("state").Values("active", "deleted").Default("active"),
		field.String("request_key").MaxLen(36),
		field.String("request_hash").MaxLen(64).Sensitive(),
		field.Time("expires_at"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors SQL-owned uniqueness and retention lookups.
func (SecretBundle) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("purpose", "resource_id", "owner_id").Unique().StorageKey("secret_scope"),
		index.Fields("state", "expires_at").StorageKey("secret_expiry"),
		index.Fields("key_version", "state").StorageKey("secret_key_version"),
	}
}
