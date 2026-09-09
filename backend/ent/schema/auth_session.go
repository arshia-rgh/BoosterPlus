package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// AuthSession maps identity state; SQL migration files own all DDL.
type AuthSession struct{ ent.Schema }

// Annotations fixes the explicit SQL table mapping.
func (AuthSession) Annotations() []schema.Annotation {
	return []schema.Annotation{entsql.Annotation{Table: "auth_sessions"}}
}

// Fields defines the identity query mapping.
func (AuthSession) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(64).Immutable(), field.String("user_id").MaxLen(36), field.String("token_hash").MaxLen(64).Unique(), field.Int64("auth_version"), field.Time("authenticated_at"), field.Time("mfa_verified_at").Optional().Nillable(), field.Time("created_at"), field.Time("last_seen_at"), field.Time("expires_at"), field.Time("revoked_at").Optional().Nillable()}
}

// Indexes maps constraints declared by the SQL migration.
func (AuthSession) Indexes() []ent.Index {
	return []ent.Index{index.Fields("user_id"), index.Fields("expires_at")}
}
