package payments

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentobservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// IncomingEvidence exposes exact provider observations only to the finance queue.
// Observed amounts are evidence, not an allocation, settlement override or revenue total.
type IncomingEvidence struct {
	PaymentID      string     `json:"payment_id"`
	State          string     `json:"state"`
	Issue          string     `json:"issue"`
	ExpectedAmount string     `json:"expected_amount"`
	ReceivedAmount string     `json:"received_amount"`
	Currency       string     `json:"currency"`
	Network        string     `json:"network"`
	CheckedAt      *time.Time `json:"checked_at"`
	ObservedAt     *time.Time `json:"observed_at"`
	Reading        bool       `json:"reading"`
}

// FinanceAttempt adds bounded staff-only evidence to the safe customer attempt projection.
type FinanceAttempt struct {
	Attempt
	Evidence     []IncomingEvidence `json:"evidence"`
	MoreEvidence bool               `json:"more_evidence"`
}

func (s *Store) incomingEvidence(ctx context.Context, attempt *ent.PaymentAttempt) ([]IncomingEvidence, bool, error) {
	result := []IncomingEvidence{}
	records, err := s.client.PaymentRecord.Query().Where(paymentrecord.AccountEQ(attempt.Account), paymentrecord.AttemptIDEQ(attempt.ID)).Order(ent.Desc(paymentrecord.FieldCheckedAt), ent.Desc(paymentrecord.FieldID)).Limit(11).All(ctx)
	if err != nil {
		return result, false, err
	}
	more := len(records) > 10
	if more {
		records = records[:10]
	}
	for _, row := range records {
		value := IncomingEvidence{PaymentID: row.PaymentID, State: row.State, Issue: row.Issue, Reading: row.LeaseUntil != nil && row.LeaseUntil.After(s.instant())}
		observations, readErr := s.client.PaymentObservation.Query().Where(paymentobservation.RecordIDEQ(row.ID)).Order(ent.Desc(paymentobservation.FieldVersion)).Limit(1).All(ctx)
		if readErr != nil {
			return result, more, readErr
		}
		if len(observations) > 0 {
			observation := observations[0]
			payment, decodeErr := decode[nowpayments.Payment](observation.Data)
			if decodeErr != nil {
				return result, more, decodeErr
			}
			value.ObservedAt = &observation.CreatedAt
			if payment.ID == row.PaymentID && payment.AttemptID == attempt.ID {
				value.ExpectedAmount = string(payment.PayAmount)
				value.ReceivedAmount = string(payment.ActuallyPaid)
				value.Currency = payment.PayCurrency
				value.Network = payment.Network
			}
			value.CheckedAt = &row.CheckedAt
		} else if row.Issue != "" && row.Version > 0 {
			value.CheckedAt = &row.CheckedAt
		}
		result = append(result, value)
	}
	return result, more, nil
}
