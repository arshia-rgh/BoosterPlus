package resale

import (
	"context"
	"encoding/json"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountsubmission"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/selleroffer"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

func submission(ctx context.Context, tx *ent.Tx, p *identity.Principal, id string, admin bool) (*ent.AccountSubmission, error) {
	capability := "account"
	if admin {
		capability = "admin"
	}
	if err := identity.Require(p, capability); err != nil {
		return nil, err
	}
	q := tx.AccountSubmission.Query().Where(accountsubmission.IDEQ(id))
	if !admin {
		q.Where(accountsubmission.UserIDEQ(p.User.ID))
	}
	return q.Only(ctx)
}
func (s *Store) offerEvent(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.SellerOffer, action, note string) error {
	role := "staff"
	if p.User.ID == row.SellerID {
		role = "seller"
	}
	if _, err := tx.SellerOfferEvent.Create().SetOfferID(row.ID).SetVersion(row.Version).SetAction(action).SetActorID(p.User.ID).SetActorRole(role).SetNote(note).SetCreatedAt(s.instant()).Save(ctx); err != nil {
		return err
	}
	if err := s.audit(ctx, tx, p, action, row.ID); err != nil {
		return err
	}
	parent, err := tx.AccountSubmission.Get(ctx, row.SubmissionID)
	if err != nil {
		return err
	}
	if !version(parent.Version) {
		return ErrConflict
	}
	update := tx.AccountSubmission.UpdateOneID(parent.ID).AddVersion(1).SetUpdatedAt(s.instant()).SetCurrentNote("Commercial offer updated. Review the private offer and its accepted terms.")
	if action == "offer_accept" {
		update.SetState(accountsubmission.StateAccepted)
	}
	if action == "offer_accept" {
		payload, e := json.Marshal(map[string]string{"offer_id": row.ID})
		if e != nil {
			return e
		}
		if _, e = jobs.EnqueueEntTx(ctx, tx, "payments.seller_obligation", "seller-obligation:"+row.ID, payload); e != nil {
			return e
		}
	}
	parent, err = update.Save(ctx)
	if err != nil {
		return err
	}
	event, err := tx.SubmissionEvent.Create().SetSubmissionID(parent.ID).SetVersion(parent.Version).SetState(string(parent.State)).SetAction(action).SetMessage(parent.CurrentNote).SetActorRole(role).SetCreatedAt(s.instant()).Save(ctx)
	if err != nil {
		return err
	}
	if p.User.ID != parent.UserID {
		return notifications.Enqueue(ctx, tx, parent.UserID, parent.ID, event.ID, "submission_seller", s.instant())
	}
	return nil
}

// ProposeOffer snapshots exact commercial terms after staff intake approval.
func (s *Store) ProposeOffer(ctx context.Context, p *identity.Principal, id string, input OfferInput) (OfferView, error) {
	if !validID(id) || !validID(input.RequestKey) || !version(input.SubmissionVersion) || validateTerms(input.Terms) != nil || !input.ExpiresAt.After(s.instant()) || input.ExpiresAt.After(s.instant().Add(30*24*time.Hour)) {
		return OfferView{}, ErrInvalid
	}
	raw, err := json.Marshal(struct {
		SubmissionID string
		Input        OfferInput
	}{id, input})
	if err != nil {
		return OfferView{}, err
	}
	digest := s.auth.RequestDigest("seller-offer", raw)
	data, err := document(input.Terms)
	if err != nil {
		return OfferView{}, err
	}
	var result OfferView
	err = s.auth.AuthorizedTransaction(ctx, p, "admin", true, func(tx *ent.Tx, current *identity.Principal) error {
		parent, e := submission(ctx, tx, current, id, true)
		if e != nil {
			return e
		}
		old, e := tx.SellerOffer.Get(ctx, input.RequestKey)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		if old != nil {
			if old.SubmissionID != id || old.RequestHash != digest {
				return ErrConflict
			}
			result, e = offerView(old)
			return e
		}
		if e = validateNewCommission(input.Terms, input.ExpiresAt, s.instant()); e != nil {
			return e
		}
		if parent.Version != input.SubmissionVersion || parent.State != accountsubmission.StateApprovedPendingTerms || parent.UserID == current.User.ID {
			return ErrConflict
		}
		if e = sellerRoute(ctx, tx, input.Terms); e != nil {
			return e
		}
		count, e := tx.SellerOffer.Query().Where(selleroffer.SubmissionIDEQ(id)).Count(ctx)
		if e != nil {
			return e
		}
		if count >= 100 {
			return ErrConflict
		}
		active, e := tx.SellerOffer.Query().Where(selleroffer.ActiveSubmissionIDEQ(id)).Exist(ctx)
		if e != nil {
			return e
		}
		if active {
			return ErrConflict
		}
		row, e := tx.SellerOffer.Create().SetID(input.RequestKey).SetSubmissionID(id).SetActiveSubmissionID(id).SetSellerID(parent.UserID).SetRequestHash(digest).SetData(data).SetExpiresAt(input.ExpiresAt.UTC()).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.offerEvent(ctx, tx, current, row, "offer_proposed", "Review and explicitly accept or decline these exact commercial terms."); e != nil {
			return e
		}
		result, e = offerView(row)
		return e
	})
	return result, err
}

// Offers exposes bounded private history without seller identifiers in shared product data.
func (s *Store) Offers(ctx context.Context, p *identity.Principal, id string, admin bool) ([]OfferView, error) {
	result := []OfferView{}
	if !validID(id) {
		return result, ErrInvalid
	}
	capability := "account"
	if admin {
		capability = "admin"
	}
	err := s.auth.AuthorizedTransaction(ctx, p, capability, false, func(tx *ent.Tx, current *identity.Principal) error {
		if _, e := submission(ctx, tx, current, id, admin); e != nil {
			return e
		}
		rows, e := tx.SellerOffer.Query().Where(selleroffer.SubmissionIDEQ(id)).Order(ent.Desc(selleroffer.FieldCreatedAt), ent.Desc(selleroffer.FieldID)).Limit(50).All(ctx)
		if e != nil {
			return e
		}
		result = []OfferView{}
		for _, row := range rows {
			v, e := offerView(row)
			if e != nil {
				return e
			}
			result = append(result, v)
		}
		return nil
	})
	return result, err
}

// ChangeOffer cannot rewrite an accepted agreement or bypass seller acceptance.
func (s *Store) ChangeOffer(ctx context.Context, p *identity.Principal, id, action string, admin bool, input OfferChange) (OfferView, error) {
	if !validID(id) || !version(input.Version) || !text(input.Note, 10, 2000) {
		return OfferView{}, ErrInvalid
	}
	capability := "account"
	if admin {
		capability = "owner"
	}
	var result OfferView
	err := s.auth.AuthorizedTransaction(ctx, p, capability, admin, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.SellerOffer.Get(ctx, id)
		if e != nil {
			return e
		}
		if !admin && row.SellerID != current.User.ID {
			return &ent.NotFoundError{}
		}
		parent, e := submission(ctx, tx, current, row.SubmissionID, admin)
		if e != nil {
			return e
		}
		if row.Version != input.Version || row.ActiveSubmissionID == nil {
			return ErrConflict
		}
		update := tx.SellerOffer.UpdateOneID(id).AddVersion(1).SetUpdatedAt(s.instant())
		switch action {
		case "accept":
			if admin || !input.Accept {
				return identity.ErrForbidden
			}
			if !current.Session.AuthenticatedAt.Add(identity.RecentTTL).After(s.instant()) {
				return identity.ErrRecent
			}
			if row.State != "offered" || !row.ExpiresAt.After(s.instant()) || parent.State != accountsubmission.StateApprovedPendingTerms {
				return ErrConflict
			}
			update.SetState("accepted").SetAcceptedAt(s.instant())
		case "decline", "withdraw":
			if action == "decline" && admin || action == "withdraw" && !admin {
				return identity.ErrForbidden
			}
			if row.State != "offered" {
				return ErrConflict
			}
			update.SetState("withdrawn").ClearActiveSubmissionID()
		default:
			return ErrInvalid
		}
		row, e = update.Save(ctx)
		if e != nil {
			return e
		}
		if e = s.offerEvent(ctx, tx, current, row, "offer_"+action, input.Note); e != nil {
			return e
		}
		result, e = offerView(row)
		return e
	})
	return result, err
}
