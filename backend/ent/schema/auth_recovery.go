package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// AuthRecovery maps identity state; SQL migration files own all DDL.
type AuthRecovery struct{ ent.Schema }

// Annotations fixes the explicit SQL table mapping.
func (AuthRecovery) Annotations() []schema.Annotation {
	return []schema.Annotation{entsql.Annotation{Table: "auth_recoveries"}}
}

// Fields defines the identity query mapping.
func (AuthRecovery) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(64).Immutable(), field.String("user_id").MaxLen(36), field.String("new_email").MaxLen(254), field.String("state").MaxLen(32).Default("pending"), field.String("case_reference").MaxLen(80).Default(""), field.Time("created_at"), field.Time("expires_at")}
}

// Indexes maps constraints declared by the SQL migration.
func (AuthRecovery) Indexes() []ent.Index { return []ent.Index{index.Fields("state", "created_at")} }
