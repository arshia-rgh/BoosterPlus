package payments

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentobservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferobservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/transferrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

// ReconciliationJob contains operational state only, never a payload or raw error.
type ReconciliationJob struct {
	ID       string `json:"id"`
	State    string `json:"state"`
	Attempts int    `json:"attempts"`
}

// ReconciliationReview keeps provider evidence distinct from a queued read.
type ReconciliationReview struct {
	Direction    string             `json:"direction"`
	PaymentID    string             `json:"payment_id"`
	Found        bool               `json:"found"`
	State        string             `json:"state"`
	Issue        string             `json:"issue"`
	OrderID      string             `json:"order_id"`
	CaseID       string             `json:"case_id"`
	TransferID   string             `json:"transfer_id"`
	SubmissionID string             `json:"submission_id"`
	CheckedAt    *time.Time         `json:"checked_at"`
	ObservedAt   *time.Time         `json:"observed_at"`
	Reading      bool               `json:"reading"`
	Job          *ReconciliationJob `json:"job"`
}

type jobReader interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}

func readReconciliationJob(ctx context.Context, reader jobReader, id, kind string) (result *ReconciliationJob, resultErr error) {
	if id == "" {
		return nil, nil
	}
	rows, err := reader.QueryContext(ctx, "SELECT id,state,attempts FROM jobs WHERE id=? AND kind=?", id, kind)
	if err != nil {
		return nil, err
	}
	defer func() { resultErr = errors.Join(resultErr, rows.Close()) }()
	if !rows.Next() {
		return nil, rows.Err()
	}
	result = &ReconciliationJob{}
	if err = rows.Scan(&result.ID, &result.State, &result.Attempts); err != nil {
		return nil, err
	}
	return result, rows.Err()
}
func enqueueManualRead(ctx context.Context, tx *ent.Tx, recordID, currentID, kind string) (string, error) {
	current, err := readReconciliationJob(ctx, tx, currentID, kind)
	if err != nil {
		return "", err
	}
	if current != nil && (current.State == "pending" || current.State == "running") {
		return current.ID, nil
	}
	payload, err := json.Marshal(map[string]string{"record_id": recordID})
	if err != nil {
		return "", err
	}
	return jobs.EnqueueEntTx(ctx, tx, kind, "finance-manual:"+recordID+":"+uuid.NewString(), payload)
}

// InspectReconciliation reads only an account-bound reference with current staff authority.
func (s *Store) InspectReconciliation(ctx context.Context, p *identity.Principal, direction, id string) (ReconciliationReview, error) {
	result := ReconciliationReview{Direction: direction, PaymentID: id}
	if !providerPattern.MatchString(id) || (direction != "incoming" && direction != "outgoing") {
		return result, ErrInvalid
	}
	err := s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, _ *identity.Principal) error {
		if direction == "incoming" {
			return s.inspectIncoming(ctx, tx, id, &result)
		}
		return s.inspectOutgoing(ctx, tx, id, &result)
	})
	return result, err
}
func (s *Store) inspectIncoming(ctx context.Context, tx *ent.Tx, id string, result *ReconciliationReview) error {
	row, err := tx.PaymentRecord.Query().Where(paymentrecord.AccountEQ(s.account), paymentrecord.PaymentIDEQ(id)).Only(ctx)
	if ent.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return err
	}
	result.Found = true
	result.State = row.State
	result.Issue = row.Issue
	result.Reading = row.LeaseUntil != nil && row.LeaseUntil.After(s.instant())
	observation, err := tx.PaymentObservation.Query().Where(paymentobservation.RecordIDEQ(row.ID)).Order(ent.Desc(paymentobservation.FieldVersion)).First(ctx)
	if err != nil && !ent.IsNotFound(err) {
		return err
	}
	if observation != nil {
		result.ObservedAt = &observation.CreatedAt
		result.CheckedAt = &row.CheckedAt
	} else if row.Version > 0 && row.Issue != "" {
		result.CheckedAt = &row.CheckedAt
	}
	if row.AttemptID != "" {
		attempt, e := tx.PaymentAttempt.Get(ctx, row.AttemptID)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		if attempt != nil && attempt.Account == row.Account {
			result.OrderID = attempt.OrderID
		}
	}
	result.Job, err = readReconciliationJob(ctx, tx, row.ManualJobID, "payments.reconcile")
	return err
}
func (s *Store) inspectOutgoing(ctx context.Context, tx *ent.Tx, id string, result *ReconciliationReview) error {
	row, err := tx.TransferRecord.Query().Where(transferrecord.AccountEQ(s.account), transferrecord.ProviderIDEQ(id)).Only(ctx)
	if ent.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return err
	}
	result.Found = true
	result.State = row.State
	result.Issue = row.Issue
	result.Reading = row.LeaseUntil != nil && row.LeaseUntil.After(s.instant())
	observation, err := tx.TransferObservation.Query().Where(transferobservation.RecordIDEQ(row.ID)).Order(ent.Desc(transferobservation.FieldVersion)).First(ctx)
	if err != nil && !ent.IsNotFound(err) {
		return err
	}
	if observation != nil {
		result.ObservedAt = &observation.CreatedAt
		result.CheckedAt = &row.CheckedAt
	} else if row.Version > 0 && row.Issue != "" {
		result.CheckedAt = &row.CheckedAt
	}
	if row.AttemptID != "" {
		attempt, e := tx.TransferAttempt.Get(ctx, row.AttemptID)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		if attempt != nil && attempt.Account == row.Account {
			transfer, e := tx.MoneyTransfer.Get(ctx, attempt.TransferID)
			if e != nil {
				return e
			}
			result.TransferID = transfer.ID
			result.OrderID = transfer.OrderID
			result.CaseID = transfer.CaseID
			if transfer.SellerOfferID != nil {
				offer, e := tx.SellerOffer.Get(ctx, *transfer.SellerOfferID)
				if e != nil {
					return e
				}
				result.SubmissionID = offer.SubmissionID
			}
		}
	}
	result.Job, err = readReconciliationJob(ctx, tx, row.ManualJobID, "payments.outgoing_reconcile")
	return err
}
func (s *Store) inspectReconciliation(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	result, err := s.InspectReconciliation(r.Context(), p, r.URL.Query().Get("direction"), r.URL.Query().Get("payment_id"))
	if err != nil {
		return err
	}
	return write(w, result)
}
