package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// AuthChallenge maps identity state; SQL migration files own all DDL.
type AuthChallenge struct{ ent.Schema }

// Annotations fixes the explicit SQL table mapping.
func (AuthChallenge) Annotations() []schema.Annotation {
	return []schema.Annotation{entsql.Annotation{Table: "auth_challenges"}}
}

// Fields defines the identity query mapping.
func (AuthChallenge) Fields() []ent.Field {
	return []ent.Field{field.String("portal").MaxLen(16).NotEmpty().Immutable(), field.String("id").MaxLen(64).Immutable(), field.String("email").MaxLen(254), field.String("purpose").MaxLen(32), field.String("user_id").MaxLen(36).Default(""), field.String("session_id").MaxLen(64).Default(""), field.String("browser_hash").MaxLen(64), field.String("code_digest").MaxLen(64), field.Int("attempts").Default(0), field.Bool("consumed").Default(false), field.String("terms_version").MaxLen(64).Default(""), field.Time("created_at"), field.Time("expires_at")}
}

// Indexes maps constraints declared by the SQL migration.
func (AuthChallenge) Indexes() []ent.Index {
	return []ent.Index{index.Fields("email", "purpose"), index.Fields("expires_at")}
}
