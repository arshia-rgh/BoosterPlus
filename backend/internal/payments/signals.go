package payments

import (
	"context"
	"crypto/rand"
	"encoding/json"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentsignal"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

func (s *Store) record(ctx context.Context, tx *ent.Tx, id string) (*ent.PaymentRecord, error) {
	row, err := tx.PaymentRecord.Query().Where(paymentrecord.AccountEQ(s.account), paymentrecord.PaymentIDEQ(id)).Only(ctx)
	if !ent.IsNotFound(err) {
		return row, err
	}
	return tx.PaymentRecord.Create().SetAccount(s.account).SetPaymentID(id).SetData(map[string]any{}).SetCheckedAt(s.instant()).SetCreatedAt(s.instant()).Save(ctx)
}

// Receive verifies before persisting a deduplicated reference and job in one transaction.
// Callback fields other than the verified payment reference are never settlement authority.
func (s *Store) Receive(ctx context.Context, body []byte, signature string) error {
	if s.provider == nil {
		return ErrUnavailable
	}
	notice, err := s.provider.VerifyWebhook(body, signature)
	if err != nil {
		return err
	}
	return s.fenced(ctx, func(tx *ent.Tx) error {
		exists, e := tx.PaymentSignal.Query().Where(paymentsignal.AccountEQ(s.account), paymentsignal.DigestEQ(notice.Digest)).Exist(ctx)
		if e != nil || exists {
			return e
		}
		signal, e := tx.PaymentSignal.Create().SetAccount(s.account).SetPaymentID(notice.PaymentID).SetDigest(notice.Digest).SetCreatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		record, e := s.record(ctx, tx, notice.PaymentID)
		if e != nil {
			return e
		}
		return enqueue(ctx, tx, "payments.reconcile", "payment-signal:"+signal.ID, map[string]string{"record_id": record.ID})
	})
}

// ReconcileInput references provider evidence; no amount or paid-state override is accepted.
type ReconcileInput struct {
	PaymentID string `json:"payment_id"`
	Reason    string `json:"reason"`
}

// RequestReconciliation is an audited, recent-factor staff request for an authenticated provider read.
func (s *Store) RequestReconciliation(ctx context.Context, p *identity.Principal, input ReconcileInput) error {
	if !providerPattern.MatchString(input.PaymentID) || !validText(input.Reason, 1, 2000) {
		return ErrInvalid
	}
	if s.provider == nil {
		return ErrUnavailable
	}
	return s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		record, err := s.record(ctx, tx, input.PaymentID)
		if err != nil {
			return err
		}
		if err = s.audit(ctx, tx, current, "reconciliation_requested", record.ID); err != nil {
			return err
		}
		// The explanation remains private in the audit, never in job/event payloads.
		_, err = tx.AuthAudit.Create().SetID(rand.Text()).SetActorID(current.User.ID).SetActorReference(current.User.ID).SetAction("payments.reconciliation_reason").SetTargetID(record.ID).SetMetadata(map[string]string{"reason": input.Reason}).SetCreatedAt(s.instant()).Save(ctx)
		if err != nil {
			return err
		}
		return enqueue(ctx, tx, "payments.reconcile", "payment-manual:"+record.ID+":"+s.instant().Format("20060102150405.000000"), map[string]string{"record_id": record.ID})
	})
}

// ReconcileHandler consumes references only. A lease fences stale concurrent API observations.
func (s *Store) ReconcileHandler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var ref struct {
			RecordID string `json:"record_id"`
		}
		if err := json.Unmarshal(job.Payload, &ref); err != nil || !validID(ref.RecordID) {
			return ErrInvalid
		}
		return s.Reconcile(ctx, ref.RecordID)
	}
}
