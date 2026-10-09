package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// AuthIdentity maps identity state; SQL migration files own all DDL.
type AuthIdentity struct{ ent.Schema }

// Annotations fixes the explicit SQL table mapping.
func (AuthIdentity) Annotations() []schema.Annotation {
	return []schema.Annotation{entsql.Annotation{Table: "auth_identities"}}
}

// Fields defines the identity query mapping.
func (AuthIdentity) Fields() []ent.Field {
	return []ent.Field{field.String("portal").MaxLen(16).Default("customer").Immutable(), field.String("id").MaxLen(64).Immutable(), field.String("user_id").MaxLen(36), field.String("provider").MaxLen(16), field.String("subject").MaxLen(255), field.Time("created_at")}
}

// Indexes maps constraints declared by the SQL migration.
func (AuthIdentity) Indexes() []ent.Index {
	return []ent.Index{index.Fields("portal", "provider", "subject").Unique().StorageKey("auth_identity_portal_subject"), index.Fields("user_id")}
}
