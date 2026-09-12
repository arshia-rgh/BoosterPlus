package resale

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/sellerofferevent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// OfferEvent preserves visible agreement decisions without private actor identifiers.
type OfferEvent struct {
	Version   int       `json:"version"`
	Action    string    `json:"action"`
	Role      string    `json:"role"`
	Note      string    `json:"note"`
	CreatedAt time.Time `json:"created_at"`
}

// OfferHistory enforces the live seller/staff boundary for each bounded history page.
func (s *Store) OfferHistory(ctx context.Context, p *identity.Principal, id string, admin bool, after int) ([]OfferEvent, error) {
	result := []OfferEvent{}
	if !validID(id) || after < 0 || after >= maxVersion {
		return result, ErrInvalid
	}
	capability := "account"
	if admin {
		capability = "admin"
	}
	err := s.auth.AuthorizedTransaction(ctx, p, capability, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.SellerOffer.Get(ctx, id)
		if e != nil {
			return e
		}
		if !admin && row.SellerID != current.User.ID {
			return &ent.NotFoundError{}
		}
		events, e := tx.SellerOfferEvent.Query().Where(sellerofferevent.OfferIDEQ(id), sellerofferevent.VersionGT(after)).Order(ent.Asc(sellerofferevent.FieldVersion)).Limit(50).All(ctx)
		if e != nil {
			return e
		}
		result = []OfferEvent{}
		for _, event := range events {
			result = append(result, OfferEvent{event.Version, event.Action, event.ActorRole, event.Note, event.CreatedAt})
		}
		return nil
	})
	return result, err
}
