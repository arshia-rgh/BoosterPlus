package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// AuthRate maps identity state; SQL migration files own all DDL.
type AuthRate struct{ ent.Schema }

// Annotations fixes the explicit SQL table mapping.
func (AuthRate) Annotations() []schema.Annotation {
	return []schema.Annotation{entsql.Annotation{Table: "auth_rates"}}
}

// Fields defines the identity query mapping.
func (AuthRate) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(64).Immutable(), field.Int("count").Default(0), field.Time("expires_at")}
}

// Indexes maps constraints declared by the SQL migration.
func (AuthRate) Indexes() []ent.Index { return []ent.Index{index.Fields("expires_at")} }
