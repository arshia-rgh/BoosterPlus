package payments

import (
	"context"
	"encoding/json"
	"math/big"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentallocation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/selleroffer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
)

// SellerObligationHandler creates one contractual direct payout record, never moves funds.
func (s *Store) SellerObligationHandler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var input struct {
			OfferID string `json:"offer_id"`
		}
		if err := json.Unmarshal(job.Payload, &input); err != nil || !validID(input.OfferID) {
			return ErrInvalid
		}
		if s.account == "" {
			return ErrUnavailable
		}
		return s.fenced(ctx, func(tx *ent.Tx) error {
			old, err := tx.MoneyTransfer.Query().Where(moneytransfer.SellerOfferIDEQ(input.OfferID)).Exist(ctx)
			if err != nil {
				return err
			}
			if old {
				return nil
			}
			offer, err := tx.SellerOffer.Get(ctx, input.OfferID)
			if err != nil {
				return err
			}
			if offer.State != "accepted" || offer.AcceptedAt == nil {
				return ErrConflict
			}
			terms, err := decode[resale.SellerTerms](offer.Data)
			if err != nil {
				return err
			}
			if _, err = refundAmount(terms.Amount); err != nil {
				return err
			}
			row, err := tx.MoneyTransfer.Create().SetKind("seller_payout").SetSellerOfferID(offer.ID).SetRequestHash(s.auth.RequestDigest("seller-obligation", []byte(offer.ID))).SetCaseID("").SetReceiptID("").SetOrderID("").SetUserID(offer.SellerID).SetAccount(s.account).SetCurrency(terms.Currency).SetNetwork(terms.Network).SetAmount(terms.Amount).SetTerms("Direct payout under your accepted seller offer " + offer.ID + ". The exact amount and route shown here are bound to that offer; its accepted timing, fees and ownership terms apply.").SetRecipient(map[string]any{}).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
			if err != nil {
				return err
			}
			return s.transferEvent(ctx, tx, nil, row, "obligation_created")
		})
	}
}
func (s *Store) sellerEvent(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.MoneyTransfer) error {
	if row.SellerOfferID == nil {
		return ErrInvalid
	}
	offer, err := tx.SellerOffer.Get(ctx, *row.SellerOfferID)
	if err != nil {
		return err
	}
	parent, err := tx.AccountSubmission.Get(ctx, offer.SubmissionID)
	if err != nil {
		return err
	}
	if parent.Version >= maxVersion {
		return ErrConflict
	}
	parent, err = tx.AccountSubmission.UpdateOneID(parent.ID).AddVersion(1).SetCurrentNote("Your direct seller payout record has an update. Review its status and any required action.").SetUpdatedAt(s.instant()).Save(ctx)
	if err != nil {
		return err
	}
	role := "system"
	if p != nil {
		role = "staff"
		if p.User.ID == parent.UserID {
			role = "seller"
		}
	}
	event, err := tx.SubmissionEvent.Create().SetSubmissionID(parent.ID).SetVersion(parent.Version).SetState(string(parent.State)).SetAction("seller_payout_updated").SetMessage(parent.CurrentNote).SetActorRole(role).SetCreatedAt(s.instant()).Save(ctx)
	if err != nil {
		return err
	}
	return notifications.Enqueue(ctx, tx, parent.UserID, parent.ID, event.ID, "submission_seller", s.instant())
}
func (s *Store) transferEligible(ctx context.Context, tx *ent.Tx, row *ent.MoneyTransfer) error {
	if row.Kind == "seller_payout" {
		_, err := s.sellerEligible(ctx, tx, row)
		return err
	}
	if row.Kind != "refund" {
		return ErrInvalid
	}
	record, err := tx.ServiceCase.Get(ctx, row.CaseID)
	if err != nil {
		return err
	}
	if record.ActiveOrderID == nil || record.State != "decided" {
		return ErrConflict
	}
	receipt, err := tx.PaymentReceipt.Get(ctx, row.ReceiptID)
	if err != nil {
		return err
	}
	return s.refundCap(ctx, tx, receipt, new(big.Rat))
}
func (s *Store) sellerEligible(ctx context.Context, tx *ent.Tx, row *ent.MoneyTransfer) (time.Time, error) {
	if row.SellerOfferID == nil || row.Kind != "seller_payout" || row.ReceiptID != "" || row.CaseID != "" || row.OrderID != "" {
		return time.Time{}, ErrConflict
	}
	offer, err := tx.SellerOffer.Get(ctx, *row.SellerOfferID)
	if err != nil {
		return time.Time{}, err
	}
	if offer.State != "accepted" || offer.ControlVerifiedAt == nil || offer.SellerID != row.UserID {
		return time.Time{}, ErrConflict
	}
	terms, err := decode[resale.SellerTerms](offer.Data)
	if err != nil {
		return time.Time{}, err
	}
	if terms.Amount != row.Amount || terms.Currency != row.Currency || terms.Network != row.Network {
		return time.Time{}, ErrConflict
	}
	anchor := *offer.ControlVerifiedAt
	switch terms.Model {
	case "buy_first":
	case "consignment":
		listing, err := tx.AccountListing.Query().Where(accountlisting.OfferIDEQ(offer.ID), accountlisting.StateEQ("sold")).Only(ctx)
		if err != nil {
			return time.Time{}, err
		}
		reservation, err := tx.AccountReservation.Query().Where(accountreservation.ActiveListingIDEQ(listing.ID), accountreservation.StateEQ("paid")).Only(ctx)
		if err != nil {
			return time.Time{}, err
		}
		delivery, err := tx.AccountDelivery.Query().Where(accountdelivery.OrderIDEQ(reservation.OrderID), accountdelivery.StateEQ("acknowledged")).Only(ctx)
		if err != nil {
			return time.Time{}, err
		}
		if delivery.DisputeUntil == nil {
			return time.Time{}, ErrConflict
		}
		purchase, err := tx.Order.Get(ctx, reservation.OrderID)
		if err != nil {
			return time.Time{}, err
		}
		if string(purchase.State) != "completed" {
			return time.Time{}, ErrConflict
		}
		contract, contractErr := tx.OrderContract.Get(ctx, purchase.CurrentContract)
		if contractErr != nil {
			return time.Time{}, contractErr
		}
		if contract.PaymentState != ordercontract.PaymentStateSettled || contract.ActiveOrderID == nil {
			return time.Time{}, ErrConflict
		}
		blocked, err := tx.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(purchase.ID)).Exist(ctx)
		if err != nil {
			return time.Time{}, err
		}
		if blocked {
			return time.Time{}, ErrConflict
		}
		allocation, err := tx.PaymentAllocation.Query().Where(paymentallocation.ContractIDEQ(purchase.CurrentContract)).Only(ctx)
		if err != nil {
			return time.Time{}, err
		}
		receipt, err := tx.PaymentReceipt.Get(ctx, allocation.ReceiptID)
		if err != nil {
			return time.Time{}, err
		}
		if receipt.State != "confirmed" {
			return time.Time{}, ErrConflict
		}
		refunds, err := tx.MoneyTransfer.Query().Where(moneytransfer.OrderIDEQ(purchase.ID), moneytransfer.KindEQ("refund"), moneytransfer.StateNotIn("confirmed", "cancelled")).Exist(ctx)
		if err != nil {
			return time.Time{}, err
		}
		if refunds {
			return time.Time{}, ErrConflict
		}
		anchor = *delivery.DisputeUntil
	default:
		return time.Time{}, ErrInvalid
	}
	due := anchor.Add(time.Duration(terms.PayoutDelayHours) * time.Hour)
	if due.After(s.instant()) {
		return due, ErrConflict
	}
	return due, nil
}

// SellerPayouts exposes contractual payment records only to the seller or staff reviewing that submission.
func (s *Store) SellerPayouts(ctx context.Context, p *identity.Principal, id string, admin bool) ([]TransferView, error) {
	result := []TransferView{}
	if !validID(id) {
		return result, ErrInvalid
	}
	capability := "account"
	if admin {
		capability = "admin"
	}
	err := s.auth.AuthorizedTransaction(ctx, p, capability, false, func(tx *ent.Tx, current *identity.Principal) error {
		parent, e := tx.AccountSubmission.Get(ctx, id)
		if e != nil {
			return e
		}
		if !admin && parent.UserID != current.User.ID {
			return &ent.NotFoundError{}
		}
		offers, e := tx.SellerOffer.Query().Where(selleroffer.SubmissionIDEQ(id)).Limit(100).All(ctx)
		if e != nil {
			return e
		}
		ids := []string{}
		for _, offer := range offers {
			ids = append(ids, offer.ID)
		}
		rows, e := tx.MoneyTransfer.Query().Where(moneytransfer.SellerOfferIDIn(ids...)).Order(ent.Desc(moneytransfer.FieldCreatedAt)).Limit(100).All(ctx)
		if e != nil {
			return e
		}
		result = []TransferView{}
		for _, row := range rows {
			v, e := transferView(ctx, tx.Client(), row)
			if e != nil {
				return e
			}
			result = append(result, v)
		}
		return nil
	})
	return result, err
}
