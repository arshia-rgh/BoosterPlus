package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

// WantedAccount is a staff-authored plain-text request for accounts PLAYORA can buy.
type WantedAccount struct{ ent.Schema }

// Fields maps the explicit SQL columns; ordering is per game.
func (WantedAccount) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).DefaultFunc(uuid.NewString).Immutable(),
		field.String("game_id").MaxLen(36).Immutable(),
		field.String("title").MaxRuneLen(80),
		field.String("description").MaxRuneLen(300),
		field.Int("position").NonNegative(),
		field.Bool("visible").Default(false),
		field.Int("version").Default(1).Positive(),
		field.String("request_key").MaxLen(36).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.String("created_by").MaxLen(36).Immutable(),
		field.String("updated_by").MaxLen(36),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes mirrors the explicit SQL constraints.
func (WantedAccount) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("game_id", "request_key").Unique().StorageKey("wanted_account_request"),
		index.Fields("game_id", "position", "id").StorageKey("wanted_account_order"),
	}
}
