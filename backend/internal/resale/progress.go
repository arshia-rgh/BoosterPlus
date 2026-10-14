package resale

import (
	"context"
	"errors"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/selleroffer"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// SellingProgress exposes bounded workflow facts, not private listing drafts,
// payout destinations, credentials, staff notes or other sellers' records.
type SellingProgress struct {
	SubmissionState string        `json:"submission_state"`
	OfferState      string        `json:"offer_state"`
	OfferID         string        `json:"offer_id"`
	Arrangement     string        `json:"arrangement"`
	Handover        HandoverState `json:"handover"`
	ListingID       string        `json:"listing_id"`
	ListingState    string        `json:"listing_state"`
	PayoutState     string        `json:"payout_state"`
	Blockers        []string      `json:"blockers"`
}

// Progress is an authenticated snapshot; mutation handlers recheck every rule.
func (s *Store) Progress(ctx context.Context, p *identity.Principal, id string, admin bool) (SellingProgress, error) {
	result := SellingProgress{Handover: HandoverState{State: "missing"}, Blockers: []string{}}
	if !validID(id) {
		return result, ErrInvalid
	}
	capability := "account"
	if admin {
		capability = "admin"
	}
	err := s.auth.AuthorizedTransaction(ctx, p, capability, false, func(tx *ent.Tx, current *identity.Principal) error {
		parent, e := submission(ctx, tx, current, id, admin)
		if e != nil {
			return e
		}
		result.SubmissionState = string(parent.State)
		offer, e := tx.SellerOffer.Query().Where(selleroffer.SubmissionIDEQ(id)).Order(ent.Desc(selleroffer.FieldCreatedAt), ent.Desc(selleroffer.FieldID)).First(ctx)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		if offer == nil {
			return nil
		}
		result.OfferID, result.OfferState = offer.ID, offer.State
		if offer.State == "offered" && !offer.ExpiresAt.After(s.instant()) {
			result.OfferState = "expired"
		}
		terms, e := decode[SellerTerms](offer.Data)
		if e != nil {
			return e
		}
		result.Arrangement = terms.Model
		if offer.State != "accepted" {
			return nil
		}
		result.Handover, e = SellerHandover(ctx, tx, offer, s.instant())
		if e != nil {
			return e
		}
		payout, e := tx.MoneyTransfer.Query().Where(moneytransfer.SellerOfferIDEQ(offer.ID), moneytransfer.KindEQ("seller_payout")).Only(ctx)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		if payout != nil {
			result.PayoutState = payout.State
		}
		game, e := tx.Game.Get(ctx, parent.GameID)
		if e != nil {
			return e
		}
		available, e := catalog.GameAvailable(ctx, tx.Client(), game, "accounts")
		if e != nil {
			return e
		}
		row, e := tx.AccountListing.Query().Where(accountlisting.SubmissionIDEQ(id)).Only(ctx)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		if row != nil {
			result.ListingID, result.ListingState = row.ID, row.State
			if row.State == "published" {
				if !available {
					result.ListingState = "unavailable"
					result.Blockers = append(result.Blockers, "game_unavailable")
				}
				return nil
			}
			if row.State == "reserved" || row.State == "sold" {
				return nil
			}
		}
		if !available {
			result.Blockers = append(result.Blockers, "game_unavailable")
		}
		if result.Handover.State != "received" {
			result.Blockers = append(result.Blockers, "handover")
		}
		if terms.Model == "buy_first" && result.PayoutState != "confirmed" {
			result.Blockers = append(result.Blockers, "seller_payment")
		}
		if row == nil {
			result.Blockers = append(result.Blockers, "listing")
			return nil
		}
		product, e := decode[Product](row.Draft)
		if e != nil {
			return e
		}
		result.Blockers = append(result.Blockers, listingFieldBlockers(product)...)
		if e = listingCommission(product, offer.Data); e != nil {
			var invalid *catalog.Invalid
			if !errors.As(e, &invalid) && !errors.Is(e, ErrInvalid) && !errors.Is(e, ErrConflict) {
				return e
			}
			result.Blockers = append(result.Blockers, listingAgreementBlocker(invalid))
		}
		if e = s.reviewedImages(ctx, tx, row, product); e != nil {
			if !errors.Is(e, ErrConflict) && !errors.Is(e, identity.ErrForbidden) && !ent.IsNotFound(e) {
				return e
			}
			result.Blockers = append(result.Blockers, "listing_images")
		}
		result.Blockers = append(result.Blockers, "publication")
		return nil
	})
	return result, err
}

func listingAgreementBlocker(invalid *catalog.Invalid) string {
	if invalid != nil {
		for _, issue := range invalid.Issues {
			if issue.Path == "product.dispute_hours" {
				return "listing_terms"
			}
		}
	}
	return "listing_price"
}

func listingFieldBlockers(product Product) []string {
	set := map[string]bool{}
	for _, issue := range productIssues(product) {
		key := "listing_details"
		field := strings.TrimPrefix(issue.Path, "product.")
		switch field {
		case "sale_terms", "transfer_requirements", "dispute_terms", "acknowledgement_terms", "dispute_hours", "delivery_max_hours":
			key = "listing_terms"
		case "media_ids", "cover_media_id":
			key = "listing_images"
		case "currency", "amount_minor":
			key = "listing_price"
		}
		set[key] = true
	}
	if len(product.MediaIDs) > 0 && product.CoverMediaID == "" {
		set["listing_images"] = true
	}
	result := []string{}
	for _, key := range []string{"listing_details", "listing_price", "listing_images", "listing_terms"} {
		if set[key] {
			result = append(result, key)
		}
	}
	return result
}
