package payments

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func (s *Store) registerSellerPayouts(register func(string, string, bool, func(http.ResponseWriter, *http.Request, *identity.Principal) error)) {
	for _, admin := range []bool{false, true} {
		prefix, capability := "/api/v1", "account"
		if admin {
			prefix += "/admin"
			capability = "admin"
		}
		register("GET "+prefix+"/payouts/{id}/history", capability, false, s.transferHistoryHandler("seller_payout", admin))
		register("GET "+prefix+"/submissions/{id}/payouts", capability, false, func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
			values, err := s.SellerPayouts(r.Context(), p, r.PathValue("id"), admin)
			if err != nil {
				return err
			}
			return write(w, map[string]any{"transfers": values})
		})
	}
	register("POST /api/v1/payouts/{id}/recipient", "account", true, actionJSON(s.ConfirmSellerRecipient))
	register("POST /api/v1/admin/payouts/{id}/approve", "owner", true, actionJSON(s.ApproveSellerPayout))
	register("POST /api/v1/admin/payouts/{id}/verify", "owner", true, actionJSON(func(ctx context.Context, p *identity.Principal, id string, input TransferChange) (map[string]bool, error) {
		err := s.VerifySellerPayout(ctx, p, id, input)
		return map[string]bool{"queued": err == nil}, err
	}))
	register("GET /api/v1/admin/finance/payouts", "admin", false, s.sellerPayoutQueue)
}

// SellerPayoutEntry carries exact obligations and current eligibility without a wallet aggregate.
type SellerPayoutEntry struct {
	Transfer     TransferView `json:"transfer"`
	SubmissionID string       `json:"submission_id"`
	Eligible     bool         `json:"eligible"`
	DueAt        *time.Time   `json:"due_at"`
}

func (s *Store) sellerPayoutQueue(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	after := r.URL.Query().Get("after")
	if after != "" && !validID(after) {
		return ErrInvalid
	}
	values := []SellerPayoutEntry{}
	next := ""
	ctx := r.Context()
	err := s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		query := tx.MoneyTransfer.Query().Where(moneytransfer.KindEQ("seller_payout"), moneytransfer.StateNotIn("confirmed", "cancelled")).Order(ent.Asc(moneytransfer.FieldID)).Limit(51)
		if after != "" {
			query.Where(moneytransfer.IDGT(after))
		}
		rows, e := query.All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			next = rows[49].ID
			rows = rows[:50]
		}
		values = []SellerPayoutEntry{}
		for _, row := range rows {
			if row.SellerOfferID == nil {
				return ErrConflict
			}
			offer, e := tx.SellerOffer.Get(ctx, *row.SellerOfferID)
			if e != nil {
				return e
			}
			transfer, e := transferView(ctx, tx.Client(), row)
			if e != nil {
				return e
			}
			due, eligibleErr := s.sellerEligible(ctx, tx, row)
			if eligibleErr != nil && !errors.Is(eligibleErr, ErrConflict) && !ent.IsNotFound(eligibleErr) {
				return eligibleErr
			}
			var dueAt *time.Time
			if !due.IsZero() {
				dueAt = &due
			}
			values = append(values, SellerPayoutEntry{transfer, offer.SubmissionID, eligibleErr == nil, dueAt})
		}
		return nil
	})
	if err != nil {
		return err
	}
	return write(w, map[string]any{"items": values, "next": next, "enabled": s.outgoing != nil && s.outgoingEnabled})
}
