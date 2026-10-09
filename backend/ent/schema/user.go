package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// User is a passwordless customer or staff identity. Only verified Google/email control can activate sign-in.
type User struct{ ent.Schema }

// Fields defines the SQL-backed user mapping; schema changes are hand-authored SQL.
func (User) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.Time("deleted_at").Optional().Nillable(),
		field.String("portal").MaxLen(16).Default("customer").Immutable(),
		field.String("email").MaxLen(254).NotEmpty(),
		field.String("display_name").MaxLen(100).Default(""),
		field.Time("email_verified_at").Optional().Nillable(),
		field.String("role").MaxLen(32).Default("customer"),
		field.String("staff_alias").MaxLen(80).Default(""),
		field.Bool("suspended").Default(false),
		field.Int64("auth_version").Default(1),
		field.String("terms_version").MaxLen(64).Default(""),
		field.Time("terms_accepted_at").Optional().Nillable(),
		field.Bool("notify_updates").Default(true),
		field.Bytes("mfa_secret").Optional(),
		field.Bytes("mfa_pending").Optional(),
		field.Time("mfa_pending_expires").Optional().Nillable(),
		field.Int64("mfa_counter").Default(-1),
		field.Bool("mfa_enabled").Default(false),
		field.JSON("mfa_recovery_hashes", []string{}).Optional(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

// Indexes maps the operational report creation-order index.
func (User) Indexes() []ent.Index {
	return []ent.Index{index.Fields("portal", "email").Unique().StorageKey("users_portal_email"), index.Fields("created_at", "id").StorageKey("users_report_created")}
}
