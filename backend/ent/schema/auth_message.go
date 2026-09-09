package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// AuthMessage maps identity state; SQL migration files own all DDL.
type AuthMessage struct{ ent.Schema }

// Annotations fixes the explicit SQL table mapping.
func (AuthMessage) Annotations() []schema.Annotation {
	return []schema.Annotation{entsql.Annotation{Table: "auth_messages"}}
}

// Fields defines the identity query mapping.
func (AuthMessage) Fields() []ent.Field {
	return []ent.Field{field.String("id").MaxLen(64).Immutable(), field.String("challenge_id").MaxLen(64).Default(""), field.Bytes("encrypted_payload").Optional(), field.Time("created_at"), field.Time("expires_at"), field.Time("sent_at").Optional().Nillable()}
}

// Indexes maps constraints declared by the SQL migration.
func (AuthMessage) Indexes() []ent.Index { return []ent.Index{index.Fields("expires_at")} }
