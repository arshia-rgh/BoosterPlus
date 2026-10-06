package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// Artwork stores checked editorial derivatives separately from private evidence.
type Artwork struct{ ent.Schema }

// Fields mirrors the explicit SQL migration, never an automatic migration.
func (Artwork) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).Immutable(),
		field.String("user_id").MaxLen(36).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.String("purpose").MaxLen(16).Immutable(),
		field.String("state").MaxLen(16).Default("processing"),
		field.Int("width").Default(0), field.Int("height").Default(0),
		field.Int("focus_x").Immutable(), field.Int("focus_y").Immutable(),
		field.JSON("variants", map[string]any{}),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now),
	}
}

// Indexes supports bounded operational lookup.
func (Artwork) Indexes() []ent.Index {
	return []ent.Index{index.Fields("state", "updated_at", "id").StorageKey("artwork_state_age")}
}
