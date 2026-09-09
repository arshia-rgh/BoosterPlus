package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// AuthAudit maps identity state; SQL migration files own all DDL.
type AuthAudit struct{ ent.Schema }

// Annotations fixes the explicit SQL table mapping.
func (AuthAudit) Annotations() []schema.Annotation {
	return []schema.Annotation{entsql.Annotation{Table: "auth_audits"}}
}

// Fields defines the identity query mapping.
func (AuthAudit) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(64).Immutable(), field.String("actor_id").MaxLen(36).Default(""), field.String("actor_reference").MaxLen(80).Default(""), field.String("action").MaxLen(64), field.String("target_id").MaxLen(64).Default(""), field.JSON("metadata", map[string]string{}), field.Time("created_at")}
}

// Indexes maps constraints declared by the SQL migration.
func (AuthAudit) Indexes() []ent.Index { return []ent.Index{index.Fields("created_at")} }
