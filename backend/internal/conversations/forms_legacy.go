package conversations

import (
	"context"
	"errors"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/selleroffer"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// LegacyFormLink retains old protected data in the conversation without copying it.
type LegacyFormLink struct {
	Label string `json:"label"`
	Path  string `json:"path"`
}

// LegacyForms provides protected links to existing credential records without exposing their contents.
func (s *Store) LegacyForms(ctx context.Context, p *identity.Principal, id string, admin bool) ([]LegacyFormLink, error) {
	result := []LegacyFormLink{}
	err := s.auth.AuthorizedTransaction(ctx, p, capability(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		result = []LegacyFormLink{}
		thread, e := owned(ctx, tx.Client(), current, id, admin)
		if e != nil {
			return e
		}
		if thread.SubmissionID != nil && admin && current.User.Role == "owner" {
			var offers []*ent.SellerOffer
			offers, e = tx.SellerOffer.Query().Where(selleroffer.SubmissionIDEQ(*thread.SubmissionID), selleroffer.StateEQ("accepted")).All(ctx)
			if e != nil {
				return e
			}
			for _, offer := range offers {
				var ok bool
				ok, e = tx.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeAccountTransfer), secretbundle.ResourceIDEQ(offer.ID), secretbundle.OwnerIDEQ(thread.UserID), secretbundle.StateEQ(secretbundle.StateActive), secretbundle.ExpiresAtGT(s.now())).Exist(ctx)
				if e != nil {
					return e
				}
				if ok {
					result = append(result, LegacyFormLink{"Previously shared seller access", "/admin/seller-offers/" + offer.ID + "/secret/reveal"})
				}
			}
		}
		orderID := threadOrder(thread)
		if orderID == "" {
			return nil
		}
		row, e := formPaidOrder(ctx, tx.Client(), orderID, thread.UserID)
		if e != nil {
			if ent.IsNotFound(e) || errors.Is(e, identity.ErrForbidden) {
				return nil
			}
			return e
		}
		if row.Kind == "account" && !admin && current.User.ID == thread.UserID {
			var delivery *ent.AccountDelivery
			delivery, e = tx.AccountDelivery.Query().Where(accountdelivery.OrderIDEQ(orderID), accountdelivery.FormIDEQ(""), accountdelivery.StateIn("delivered", "acknowledged")).Only(ctx)
			if e != nil {
				if ent.IsNotFound(e) {
					return nil
				}
				return e
			}
			if delivery != nil {
				result = append(result, LegacyFormLink{"Previously delivered account access", "/account-orders/" + orderID + "/secret/reveal"})
			}
		} else if row.Kind != "account" && (admin || current.Session.Portal == "booster") {
			var ok bool
			ok, e = tx.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeGameAccess), secretbundle.ResourceIDEQ(orderID), secretbundle.OwnerIDEQ(thread.UserID), secretbundle.StateEQ(secretbundle.StateActive), secretbundle.ExpiresAtGT(s.now())).Exist(ctx)
			if e != nil {
				return e
			}
			prefix := "/booster"
			if admin {
				prefix = "/admin"
			}
			if ok {
				result = append(result, LegacyFormLink{"Previously shared boosting access", prefix + "/fulfillment/" + orderID + "/secret/reveal"})
			}
		}
		return nil
	})
	return result, err
}
