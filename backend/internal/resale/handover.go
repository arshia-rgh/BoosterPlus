package resale

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
)

// HandoverState describes receipt of protected details, never verified ownership.
type HandoverState struct {
	State      string     `json:"state"`
	Locked     bool       `json:"locked"`
	ReceivedAt *time.Time `json:"received_at"`
}

// SellerHandover uses metadata only. Historical verification timestamps remain
// authoritative for old payout timing; new offers do not manufacture one.
func SellerHandover(ctx context.Context, tx *ent.Tx, offer *ent.SellerOffer, now time.Time) (HandoverState, error) {
	result := HandoverState{State: "missing"}
	listing, err := tx.AccountListing.Query().Where(accountlisting.OfferIDEQ(offer.ID)).Only(ctx)
	if err != nil && !ent.IsNotFound(err) {
		return result, err
	}
	var returnedAt time.Time
	if listing != nil {
		result.Locked = listing.State == "published" || listing.State == "reserved" || listing.State == "sold"
		returned, e := tx.AccountReservation.Query().Where(accountreservation.ListingIDEQ(listing.ID), accountreservation.StateEQ("cancelled")).Order(ent.Desc(accountreservation.FieldUpdatedAt)).First(ctx)
		if e != nil && !ent.IsNotFound(e) {
			return result, e
		}
		if returned != nil {
			returnedAt = returned.UpdatedAt
		}
	}
	committed, err := tx.MoneyTransfer.Query().Where(moneytransfer.SellerOfferIDEQ(offer.ID), moneytransfer.KindEQ("seller_payout"), moneytransfer.StateNotIn("recipient_pending", "verified", "cancelled", "failed")).Exist(ctx)
	if err != nil {
		return result, err
	}
	result.Locked = result.Locked || (committed && returnedAt.IsZero())
	if offer.ControlVerifiedAt != nil && returnedAt.IsZero() {
		result.State, result.ReceivedAt = "received", offer.ControlVerifiedAt
		result.Locked = true
		return result, nil
	}
	bundle, err := tx.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.PurposeAccountTransfer), secretbundle.ResourceIDEQ(offer.ID), secretbundle.OwnerIDEQ(offer.SellerID)).Select(secretbundle.FieldID, secretbundle.FieldState, secretbundle.FieldExpiresAt).Only(ctx)
	if ent.IsNotFound(err) {
		return result, nil
	}
	if err != nil {
		return result, err
	}
	// A write audit distinguishes an actual seller update from key rotation or expiry.
	written, err := tx.AuthAudit.Query().Where(authaudit.TargetIDEQ(bundle.ID), authaudit.ActionEQ("vault_written"), authaudit.ActorIDEQ(offer.SellerID)).Order(ent.Desc(authaudit.FieldCreatedAt)).First(ctx)
	if err != nil && !ent.IsNotFound(err) {
		return result, err
	}
	if written == nil {
		return result, nil
	}
	if !returnedAt.IsZero() && !written.CreatedAt.After(returnedAt) {
		result.State = "refresh_required"
		return result, nil
	}
	// Published inventory keeps its recorded handover receipt after vault retention
	// expires. It cannot be silently replaced while a buyer can reserve it.
	if !result.Locked && (bundle.State != secretbundle.StateActive || !bundle.ExpiresAt.After(now)) {
		result.State = "expired"
		return result, nil
	}
	result.State, result.ReceivedAt = "received", &written.CreatedAt
	return result, nil
}

func requireSellerHandover(ctx context.Context, tx *ent.Tx, offer *ent.SellerOffer, now time.Time) error {
	state, err := SellerHandover(ctx, tx, offer, now)
	if err != nil {
		return err
	}
	if state.State != "received" {
		return ErrConflict
	}
	return nil
}
