package payments

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/manualpayout"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// ManualPayoutInput records an already completed external transfer, never sends it.
type ManualPayoutInput struct {
	RequestKey      string                `json:"request_key"`
	Version         int                   `json:"version"`
	Amount          string                `json:"amount"`
	Currency        string                `json:"currency"`
	Network         string                `json:"network"`
	Recipient       nowpayments.Recipient `json:"recipient"`
	TransactionHash string                `json:"transaction_hash"`
	CompletedAt     time.Time             `json:"completed_at"`
	Reason          string                `json:"reason"`
	Confirm         bool                  `json:"confirm"`
}

// ManualPayoutReceipt distinguishes staff confirmation from provider evidence.
type ManualPayoutReceipt struct {
	ID              string    `json:"id"`
	TransactionHash string    `json:"transaction_hash"`
	CompletedAt     time.Time `json:"completed_at"`
	RecordedAt      time.Time `json:"recorded_at"`
}

// ManualRecording describes server-checked eligibility, not permission to send funds.
type ManualRecording struct {
	Available bool   `json:"available"`
	Reason    string `json:"reason"`
}

var evmTransaction = regexp.MustCompile(`^0x[0-9a-fA-F]{64}$`)
var tronTransaction = regexp.MustCompile(`^[0-9a-fA-F]{64}$`)
var solanaTransaction = regexp.MustCompile(`^[1-9A-HJ-NP-Za-km-z]{64,88}$`)

func manualHash(network, value string) (string, bool) {
	switch network {
	case "bsc", "eth":
		return strings.ToLower(value), evmTransaction.MatchString(value)
	case "trx":
		return strings.ToLower(value), tronTransaction.MatchString(value)
	case "sol":
		return value, solanaTransaction.MatchString(value)
	default:
		return "", false
	}
}

func manualReceipt(row *ent.ManualPayout) *ManualPayoutReceipt {
	return &ManualPayoutReceipt{ID: row.ID, TransactionHash: row.TransactionHash, CompletedAt: row.CompletedAt, RecordedAt: row.CreatedAt}
}

func (s *Store) manualRecording(ctx context.Context, tx *ent.Tx, row *ent.MoneyTransfer) (*ManualRecording, error) {
	result := &ManualRecording{}
	switch {
	case s.outgoingEnabled:
		result.Reason = "automatic_enabled"
	case row.State == "confirmed":
		result.Reason = "completed"
	case row.Kind != "seller_payout" || row.Account != s.account:
		result.Reason = "unavailable"
	case row.CurrentAttempt != "":
		result.Reason = "provider_attempt"
	case row.State != "verified" || row.RecipientAt == nil:
		result.Reason = "recipient_required"
	case row.Network != "bsc" && row.Network != "eth" && row.Network != "trx" && row.Network != "sol":
		result.Reason = "unsupported_network"
	default:
		attempted, err := tx.TransferAttempt.Query().Where(transferattempt.TransferIDEQ(row.ID)).Exist(ctx)
		if err != nil {
			return nil, err
		}
		if attempted {
			result.Reason = "provider_attempt"
			return result, nil
		}
		if _, err = s.sellerEligible(ctx, tx, row); err != nil {
			if !errors.Is(err, ErrConflict) && !ent.IsNotFound(err) {
				return nil, err
			}
			result.Reason = "eligibility_hold"
			return result, nil
		}
		result.Available = true
	}
	return result, nil
}

// RecordManualSellerPayout preserves immutable terms, eligibility and one receipt.
// Staff attest completion; this operation does not call a provider or verify a chain.
func (s *Store) RecordManualSellerPayout(ctx context.Context, p *identity.Principal, id string, input ManualPayoutInput) (TransferView, error) {
	hash, valid := manualHash(input.Network, input.TransactionHash)
	if !validID(id) || !validID(input.RequestKey) || input.Version < 1 || input.Version >= maxVersion || !valid || !input.Confirm || !validText(input.Reason, 10, 2000) || input.CompletedAt.IsZero() || input.CompletedAt.After(s.instant()) {
		return TransferView{}, ErrInvalid
	}
	input.TransactionHash = hash
	input.CompletedAt = input.CompletedAt.UTC().Truncate(time.Microsecond)
	raw, err := json.Marshal(input)
	if err != nil {
		return TransferView{}, ErrInvalid
	}
	digest := s.auth.RequestDigest("manual-seller-payout:"+id, raw)
	var result TransferView
	err = s.auth.AuthorizedTransaction(ctx, p, "owner", true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.MoneyTransfer.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Kind != "seller_payout" || row.Account != s.account {
			return ErrConflict
		}
		existing, e := tx.ManualPayout.Get(ctx, input.RequestKey)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		if existing != nil {
			if existing.TransferID != id || existing.RequestHash != digest || row.State != "confirmed" {
				return ErrConflict
			}
			result, e = transferView(ctx, tx.Client(), row)
			return e
		}
		available, e := s.manualRecording(ctx, tx, row)
		if e != nil {
			return e
		}
		if !available.Available || row.Version != input.Version || row.Amount != input.Amount || row.Currency != input.Currency || row.Network != input.Network {
			return ErrConflict
		}
		recipient, e := decode[nowpayments.Recipient](row.Recipient)
		if e != nil {
			return e
		}
		due, e := s.sellerEligible(ctx, tx, row)
		if e != nil {
			return e
		}
		if recipient != input.Recipient || !nowpayments.ValidRecipient(recipient) || input.CompletedAt.Before(*row.RecipientAt) || input.CompletedAt.Before(due) {
			return ErrConflict
		}
		used, e := tx.ManualPayout.Query().Where(manualpayout.NetworkEQ(row.Network), manualpayout.TransactionHashEQ(hash)).Exist(ctx)
		if e != nil {
			return e
		}
		if used {
			return ErrConflict
		}
		snapshot, e := document(TransferSnapshot{Amount: row.Amount, Currency: row.Currency, Network: row.Network, State: "confirmed", Recipient: recipient})
		if e != nil {
			return e
		}
		if _, e = tx.ManualPayout.Create().SetID(input.RequestKey).SetTransferID(id).SetRequestHash(digest).SetNetwork(row.Network).SetTransactionHash(hash).SetSnapshot(snapshot).SetRecordedBy(current.User.ID).SetReason(input.Reason).SetCompletedAt(input.CompletedAt).SetCreatedAt(s.instant()).Save(ctx); e != nil {
			return e
		}
		row, e = tx.MoneyTransfer.UpdateOneID(id).AddVersion(1).SetState("confirmed").SetApprovedBy(current.User.ID).SetApprovedAt(s.instant()).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if e = s.transferEvent(ctx, tx, current, row, "manual_confirmed"); e != nil {
			return e
		}
		result, e = transferView(ctx, tx.Client(), row)
		return e
	})
	return result, err
}
