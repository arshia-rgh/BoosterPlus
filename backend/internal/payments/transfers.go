package payments

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"math/big"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

func refundAmount(value string) (*big.Rat, error) {
	amount, err := nowpayments.Decimal(value).Rational()
	if err != nil || amount.Sign() <= 0 {
		return nil, ErrInvalid
	}
	return amount, nil
}
func (s *Store) refundCap(ctx context.Context, tx *ent.Tx, receipt *ent.PaymentReceipt, extra *big.Rat) error {
	if receipt.State != "confirmed" {
		return ErrConflict
	}
	received, err := nowpayments.Decimal(receipt.Amount).Rational()
	if err != nil {
		return err
	}
	rows, err := tx.MoneyTransfer.Query().Where(moneytransfer.ReceiptIDEQ(receipt.ID), moneytransfer.StateNEQ("cancelled")).Limit(101).All(ctx)
	if err != nil {
		return err
	}
	if len(rows) > 100 {
		return ErrConflict
	}
	total := new(big.Rat).Set(extra)
	for _, row := range rows {
		amount, e := refundAmount(row.Amount)
		if e != nil {
			return e
		}
		total.Add(total, amount)
	}
	if total.Cmp(received) > 0 {
		return ErrConflict
	}
	return nil
}
func (s *Store) transferEvent(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.MoneyTransfer, action string) error {
	actor := ""
	if p != nil {
		actor = p.User.ID
	}
	_, err := tx.TransferEvent.Create().SetTransferID(row.ID).SetVersion(row.Version).SetAction(action).SetActorID(actor).SetCreatedAt(s.instant()).Save(ctx)
	if err != nil {
		return err
	}
	if err = s.audit(ctx, tx, p, row.Kind+"_"+action, row.ID); err != nil {
		return err
	}
	if row.Kind == "seller_payout" {
		return s.sellerEvent(ctx, tx, p, row)
	}
	orderRow, err := tx.Order.Get(ctx, row.OrderID)
	if err != nil {
		return err
	}
	return s.event(ctx, tx, orderRow, orderRow.State, "refund_updated", "Your refund record has an update. Review its current status and any required action.")
}
func transferView(ctx context.Context, client *ent.Client, row *ent.MoneyTransfer) (TransferView, error) {
	recipient, err := decode[nowpayments.Recipient](row.Recipient)
	if err != nil {
		return TransferView{}, err
	}
	issue := ""
	if row.CurrentAttempt != "" {
		attempt, e := client.TransferAttempt.Get(ctx, row.CurrentAttempt)
		if e != nil {
			return TransferView{}, e
		}
		issue = attempt.Issue
	}
	return TransferView{row.ID, row.CaseID, row.ReceiptID, row.OrderID, row.Kind, row.Currency, row.Network, row.Amount, row.Terms, row.State, issue, row.Version, recipient, row.RecipientAt, row.ApprovedAt, row.CreatedAt, row.UpdatedAt}, nil
}

// ProposeRefund reserves an exact receipt-backed amount before any destination or approval.
func (s *Store) ProposeRefund(ctx context.Context, p *identity.Principal, caseID string, input RefundInput) (TransferView, error) {
	amount, err := refundAmount(input.Amount)
	if err != nil || !validID(caseID) || !validID(input.RequestKey) || !validID(input.ReceiptID) || !validText(input.Terms, 20, 2000) {
		return TransferView{}, ErrInvalid
	}
	raw, err := json.Marshal(struct {
		CaseID string
		Input  RefundInput
	}{caseID, input})
	if err != nil {
		return TransferView{}, ErrInvalid
	}
	digest := s.auth.RequestDigest("refund-proposal", raw)
	var result TransferView
	err = s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		record, e := tx.ServiceCase.Get(ctx, caseID)
		if e != nil {
			return e
		}
		existing, e := tx.MoneyTransfer.Get(ctx, input.RequestKey)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		if existing != nil {
			if existing.CaseID != caseID || existing.RequestHash != digest {
				return ErrConflict
			}
			result, e = transferView(ctx, tx.Client(), existing)
			return e
		}
		if record.ActiveOrderID == nil || record.State == "closed" {
			return ErrConflict
		}
		receipt, e := tx.PaymentReceipt.Get(ctx, input.ReceiptID)
		if e != nil {
			return e
		}
		if receipt.OrderID != record.OrderID || receipt.UserID != record.UserID {
			return identity.ErrForbidden
		}
		source, e := tx.PaymentRecord.Get(ctx, receipt.RecordID)
		if e != nil {
			return e
		}
		if source.Account != s.account {
			return ErrUnavailable
		}
		if e = s.refundCap(ctx, tx, receipt, amount); e != nil {
			return e
		}
		row, e := tx.MoneyTransfer.Create().SetID(input.RequestKey).SetRequestHash(digest).SetKind("refund").SetCaseID(caseID).SetReceiptID(receipt.ID).SetOrderID(receipt.OrderID).SetUserID(receipt.UserID).SetAccount(source.Account).SetCurrency(receipt.Currency).SetNetwork(receipt.Network).SetAmount(input.Amount).SetTerms(input.Terms).SetRecipient(map[string]any{}).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.transferEvent(ctx, tx, current, row, "proposed"); e != nil {
			return e
		}
		result, e = transferView(ctx, tx.Client(), row)
		return e
	})
	return result, err
}

// ConfirmRecipient invalidates old verification whenever the beneficiary supplies new routing data.
func (s *Store) ConfirmRecipient(ctx context.Context, p *identity.Principal, id string, input RecipientInput) (TransferView, error) {
	return s.confirmRecipient(ctx, p, id, "refund", input)
}

// ConfirmSellerRecipient keeps payout routing consent separate from refunds.
func (s *Store) ConfirmSellerRecipient(ctx context.Context, p *identity.Principal, id string, input RecipientInput) (TransferView, error) {
	return s.confirmRecipient(ctx, p, id, "seller_payout", input)
}
func (s *Store) confirmRecipient(ctx context.Context, p *identity.Principal, id, kind string, input RecipientInput) (TransferView, error) {
	recipient := nowpayments.Recipient{Address: input.Address, Memo: input.Memo}
	if !validID(id) || input.Version < 1 || input.Version >= maxVersion || !input.Accept || !nowpayments.ValidRecipient(recipient) {
		return TransferView{}, ErrInvalid
	}
	data, err := document(recipient)
	if err != nil {
		return TransferView{}, err
	}
	var result TransferView
	err = s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		if !current.Session.AuthenticatedAt.Add(identity.RecentTTL).After(s.instant()) {
			return identity.ErrRecent
		}
		row, e := tx.MoneyTransfer.Query().Where(moneytransfer.IDEQ(id), moneytransfer.UserIDEQ(current.User.ID), moneytransfer.KindEQ(kind)).Only(ctx)
		if e != nil {
			return e
		}
		if row.Version != input.Version || row.State != "recipient_pending" && row.State != "verified" {
			return ErrConflict
		}
		row, e = tx.MoneyTransfer.UpdateOneID(id).AddVersion(1).SetRecipient(data).SetRecipientAt(s.instant()).SetState("verified").SetApprovedBy("").ClearApprovedAt().SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.transferEvent(ctx, tx, current, row, "recipient_confirmed"); e != nil {
			return e
		}
		result, e = transferView(ctx, tx.Client(), row)
		return e
	})
	return result, err
}

// Transfers exposes direct refunds only to the beneficiary and the finance staff boundary.
func (s *Store) Transfers(ctx context.Context, p *identity.Principal, id string, admin bool) ([]TransferView, error) {
	result := []TransferView{}
	if _, err := owned(ctx, s.client, p, id, admin); err != nil {
		return result, err
	}
	rows, err := s.client.MoneyTransfer.Query().Where(moneytransfer.OrderIDEQ(id)).Order(ent.Desc(moneytransfer.FieldCreatedAt), ent.Desc(moneytransfer.FieldID)).Limit(100).All(ctx)
	if err != nil {
		return result, err
	}
	for _, row := range rows {
		view, e := transferView(ctx, s.client, row)
		if e != nil {
			return result, e
		}
		result = append(result, view)
	}
	return result, nil
}

// ApproveRefund authorizes the precise customer-confirmed recipient and amount once.
func (s *Store) ApproveRefund(ctx context.Context, p *identity.Principal, id string, input TransferChange) (TransferView, error) {
	return s.approveTransfer(ctx, p, id, "refund", input)
}

// ApproveSellerPayout rechecks accepted seller terms and due conditions before each exact approval.
func (s *Store) ApproveSellerPayout(ctx context.Context, p *identity.Principal, id string, input TransferChange) (TransferView, error) {
	return s.approveTransfer(ctx, p, id, "seller_payout", input)
}
func (s *Store) approveTransfer(ctx context.Context, p *identity.Principal, id, kind string, input TransferChange) (TransferView, error) {
	if !validID(id) || input.Version < 1 || input.Version >= maxVersion || !validText(input.Reason, 10, 2000) || input.Code != "" {
		return TransferView{}, ErrInvalid
	}
	if !s.outgoingEnabled || s.outgoing == nil {
		return TransferView{}, ErrUnavailable
	}
	var result TransferView
	err := s.auth.AuthorizedTransaction(ctx, p, "owner", true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.MoneyTransfer.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Kind != kind || row.Account != s.account || row.Version != input.Version || (row.State != "verified" && row.State != "failed") || row.RecipientAt == nil {
			return ErrConflict
		}
		if e = s.transferEligible(ctx, tx, row); e != nil {
			return e
		}
		if row.State == "failed" {
			previous, readErr := tx.TransferAttempt.Get(ctx, row.CurrentAttempt)
			if readErr != nil {
				return readErr
			}
			if e = s.failedTransferEvidence(ctx, tx, row, previous); e != nil {
				return e
			}
			if _, e = tx.TransferAttempt.UpdateOneID(previous.ID).ClearActiveTransferID().Save(ctx); e != nil {
				return e
			}
		}
		if e = s.previousTransfersFailed(ctx, tx, row); e != nil {
			return e
		}
		attempt, e := tx.TransferAttempt.Create().SetTransferID(id).SetActiveTransferID(id).SetAccount(s.account).SetRecipient(row.Recipient).SetData(map[string]any{}).SetCheckedAt(s.instant().Add(-time.Hour)).SetCreatedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		row, e = tx.MoneyTransfer.UpdateOneID(id).AddVersion(1).SetState("approved").SetApprovedBy(current.User.ID).SetApprovedAt(s.instant()).SetCurrentAttempt(attempt.ID).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.transferEvent(ctx, tx, current, row, "approved"); e != nil {
			return e
		}
		if e = s.transferReason(ctx, tx, current, row, input.Reason); e != nil {
			return e
		}
		jobKind := "payments.refund"
		if kind == "seller_payout" {
			jobKind = "payments.payout"
		}
		if e = enqueue(ctx, tx, jobKind, "refund-initiate:"+attempt.ID, map[string]string{"attempt_id": attempt.ID}); e != nil {
			return e
		}
		result, e = transferView(ctx, tx.Client(), row)
		return e
	})
	return result, err
}
func (s *Store) transferReason(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.MoneyTransfer, reason string) error {
	_, err := tx.AuthAudit.Create().SetID(rand.Text()).SetActorID(p.User.ID).SetAction("payments.refund_reason").SetTargetID(row.ID).SetMetadata(map[string]string{"reason": reason}).SetCreatedAt(s.instant()).Save(ctx)
	return err
}
