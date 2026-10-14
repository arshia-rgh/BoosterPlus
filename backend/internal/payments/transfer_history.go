package payments

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferevent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// TransferSnapshot preserves the exact reviewed route and destination at an event revision.
// Historical events without snapshots stay explicitly unknown; current values are never backfilled.
type TransferSnapshot struct {
	ManualReceipt *ManualPayoutReceipt  `json:"manual_receipt,omitempty"`
	Amount        string                `json:"amount"`
	Currency      string                `json:"currency"`
	Network       string                `json:"network"`
	State         string                `json:"state"`
	Recipient     nowpayments.Recipient `json:"recipient"`
}

// TransferEntry excludes staff identifiers and internal approval reasons.
type TransferEntry struct {
	Version   int               `json:"version"`
	Action    string            `json:"action"`
	CreatedAt time.Time         `json:"created_at"`
	Snapshot  *TransferSnapshot `json:"snapshot"`
}

// TransferAttemptEvidence exposes bounded status, never raw provider responses or merchant credentials.
type TransferAttemptEvidence struct {
	ID         string     `json:"id"`
	State      string     `json:"state"`
	Issue      string     `json:"issue"`
	ProviderID string     `json:"provider_id"`
	CheckedAt  *time.Time `json:"checked_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

// TransferHistory is private to its beneficiary and authorized staff.
type TransferHistory struct {
	Events       []TransferEntry           `json:"events"`
	Next         int                       `json:"next"`
	Attempts     []TransferAttemptEvidence `json:"attempts"`
	MoreAttempts bool                      `json:"more_attempts"`
}

// ReadTransferHistory checks the exact refund/payout kind and current authority before reading private evidence.
func (s *Store) ReadTransferHistory(ctx context.Context, p *identity.Principal, id, kind string, admin bool, after int) (TransferHistory, error) {
	result := TransferHistory{Events: []TransferEntry{}, Attempts: []TransferAttemptEvidence{}}
	if !validID(id) || after < 0 || after >= maxVersion || (kind != "refund" && kind != "seller_payout") {
		return result, ErrInvalid
	}
	capability := "account"
	if admin {
		capability = "admin"
	}
	err := s.auth.AuthorizedTransaction(ctx, p, capability, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.MoneyTransfer.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Kind != kind || (!admin && row.UserID != current.User.ID) {
			return &ent.NotFoundError{}
		}
		events, e := tx.TransferEvent.Query().Where(transferevent.TransferIDEQ(id), transferevent.VersionGT(after)).Order(ent.Asc(transferevent.FieldVersion)).Limit(51).All(ctx)
		if e != nil {
			return e
		}
		result.Events = []TransferEntry{}
		result.Next = 0
		if len(events) > 50 {
			events = events[:50]
			result.Next = events[49].Version
		}
		for _, event := range events {
			value := TransferEntry{Version: event.Version, Action: event.Action, CreatedAt: event.CreatedAt}
			if event.Snapshot != nil {
				snapshot, decodeErr := decode[TransferSnapshot](event.Snapshot)
				if decodeErr != nil {
					return decodeErr
				}
				value.Snapshot = &snapshot
			}
			result.Events = append(result.Events, value)
		}
		attempts, e := tx.TransferAttempt.Query().Where(transferattempt.TransferIDEQ(id)).Order(ent.Desc(transferattempt.FieldCreatedAt), ent.Desc(transferattempt.FieldID)).Limit(11).All(ctx)
		if e != nil {
			return e
		}
		result.Attempts = []TransferAttemptEvidence{}
		result.MoreAttempts = len(attempts) > 10
		if result.MoreAttempts {
			attempts = attempts[:10]
		}
		for _, attempt := range attempts {
			value := TransferAttemptEvidence{ID: attempt.ID, State: attempt.State, Issue: attempt.Issue, CreatedAt: attempt.CreatedAt}
			if attempt.ProviderID != nil {
				value.ProviderID = *attempt.ProviderID
			}
			if !attempt.CheckedAt.Before(attempt.CreatedAt) {
				value.CheckedAt = &attempt.CheckedAt
			}
			result.Attempts = append(result.Attempts, value)
		}
		return nil
	})
	return result, err
}

func (s *Store) transferHistoryHandler(kind string, admin bool) func(http.ResponseWriter, *http.Request, *identity.Principal) error {
	return func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		after := 0
		if raw := r.URL.Query().Get("after"); raw != "" {
			value, err := strconv.Atoi(raw)
			if err != nil {
				return ErrInvalid
			}
			after = value
		}
		result, err := s.ReadTransferHistory(r.Context(), p, r.PathValue("id"), kind, admin, after)
		if err != nil {
			return err
		}
		return write(w, result)
	}
}
