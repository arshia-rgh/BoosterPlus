package payments

import (
	"context"
	"encoding/base64"
	"net/http"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentattempt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentrecord"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Record is a bounded staff-only reconciliation projection without raw provider payloads.
type Record struct {
	ID        string    `json:"id"`
	PaymentID string    `json:"payment_id"`
	AttemptID string    `json:"attempt_id"`
	State     string    `json:"state"`
	Issue     string    `json:"issue"`
	CheckedAt time.Time `json:"checked_at"`
}

// Queue separates checkout attempts and unresolved provider records; totals are not revenue.
type Queue struct {
	Attempts []FinanceAttempt `json:"attempts"`
	Records  []Record         `json:"records"`
	Next     string           `json:"next"`
	Enabled  bool             `json:"enabled"`
}

// List offers bounded finance history and exception filters with live staff authority.
func (s *Store) List(ctx context.Context, p *identity.Principal, after, filter string) (Queue, error) {
	result := Queue{Attempts: []FinanceAttempt{}, Records: []Record{}, Enabled: s.provider != nil && s.enabled}
	if err := identity.Require(p, "admin"); err != nil {
		return result, err
	}
	query := s.client.PaymentAttempt.Query().Order(ent.Desc(paymentattempt.FieldCreatedAt), ent.Desc(paymentattempt.FieldID)).Limit(51)
	if filter != "" && filter != "exceptions" {
		return result, ErrInvalid
	}
	if filter == "exceptions" {
		query.Where(paymentattempt.IssueNEQ(""))
	}
	if after != "" {
		if len(after) > 180 {
			return result, ErrInvalid
		}
		raw, err := base64.RawURLEncoding.DecodeString(after)
		if err != nil {
			return result, ErrInvalid
		}
		parts := strings.Split(string(raw), "|")
		if len(parts) != 2 || !validID(parts[1]) {
			return result, ErrInvalid
		}
		at, err := time.Parse(time.RFC3339Nano, parts[0])
		if err != nil {
			return result, ErrInvalid
		}
		query.Where(paymentattempt.Or(paymentattempt.CreatedAtLT(at), paymentattempt.And(paymentattempt.CreatedAtEQ(at), paymentattempt.IDLT(parts[1]))))
	}
	rows, err := query.All(ctx)
	if err != nil {
		return result, err
	}
	if len(rows) > 50 {
		last := rows[49]
		result.Next = base64.RawURLEncoding.EncodeToString([]byte(last.CreatedAt.Format(time.RFC3339Nano) + "|" + last.ID))
		rows = rows[:50]
	}
	for _, row := range rows {
		view, e := attemptView(row)
		if e != nil {
			return result, e
		}
		view.CheckoutURL = ""
		evidence, more, e := s.incomingEvidence(ctx, row)
		if e != nil {
			return result, e
		}
		result.Attempts = append(result.Attempts, FinanceAttempt{Attempt: view, Evidence: evidence, MoreEvidence: more})
	}
	records, err := s.client.PaymentRecord.Query().Where(paymentrecord.IssueNEQ("")).Order(ent.Desc(paymentrecord.FieldCheckedAt), ent.Desc(paymentrecord.FieldID)).Limit(50).All(ctx)
	if err != nil {
		return result, err
	}
	for _, row := range records {
		result.Records = append(result.Records, Record{row.ID, row.PaymentID, row.AttemptID, row.State, row.Issue, row.CheckedAt})
	}
	return result, nil
}
func (s *Store) finance(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
	result, err := s.List(r.Context(), p, r.URL.Query().Get("after"), r.URL.Query().Get("filter"))
	if err != nil {
		return err
	}
	return write(w, result)
}
