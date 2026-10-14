package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// ManualPayout is an immutable staff attestation of an external seller payment.
// It is not a provider or blockchain verification record.
type ManualPayout struct{ ent.Schema }

// Fields maps the explicit SQL receipt table.
func (ManualPayout) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").MaxLen(36).Immutable(),
		field.String("transfer_id").MaxLen(36).Immutable(),
		field.String("request_hash").MaxLen(64).Immutable(),
		field.String("network").MaxLen(64).Immutable(),
		field.String("transaction_hash").MaxLen(128).Immutable(),
		field.JSON("snapshot", map[string]any{}).Immutable(),
		field.String("recorded_by").MaxLen(36).Immutable(),
		field.String("reason").MaxLen(2000).Immutable(),
		field.Time("completed_at").Immutable(),
		field.Time("created_at").Immutable(),
	}
}

// Indexes prevent duplicate completion and reuse of the same chain transaction.
func (ManualPayout) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("transfer_id").Unique().StorageKey("manual_payout_transfer"),
		index.Fields("network", "transaction_hash").Unique().StorageKey("manual_payout_transaction"),
	}
}
