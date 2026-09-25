package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// AuthFlow maps identity state; SQL migration files own all DDL.
type AuthFlow struct{ ent.Schema }

// Annotations fixes the explicit SQL table mapping.
func (AuthFlow) Annotations() []schema.Annotation {
	return []schema.Annotation{entsql.Annotation{Table: "auth_flows"}}
}

// Fields defines the identity query mapping.
func (AuthFlow) Fields() []ent.Field {
	return []ent.Field{field.String("portal").MaxLen(16).NotEmpty().Immutable(), field.String("id").MaxLen(64).Immutable(), field.String("browser_hash").MaxLen(64), field.String("purpose").MaxLen(32), field.String("user_id").MaxLen(36).Default(""), field.String("session_id").MaxLen(64).Default(""), field.String("nonce").MaxLen(64), field.Bytes("verifier"), field.String("terms_version").MaxLen(64).Default(""), field.Bool("consumed").Default(false), field.Time("expires_at")}
}

// Indexes maps constraints declared by the SQL migration.
func (AuthFlow) Indexes() []ent.Index { return []ent.Index{index.Fields("expires_at")} }
