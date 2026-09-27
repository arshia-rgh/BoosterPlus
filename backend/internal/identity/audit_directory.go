package identity

import (
	"context"
	"encoding/base64"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
)

// AuditQuery filters exact actor/action/target identifiers and inclusive UTC days before pagination.
type AuditQuery struct{ Actor, Action, Target, From, To, After string }

// AuditPage contains one stable newest-first owner-only audit page.
type AuditPage struct {
	Entries []*ent.AuthAudit
	Next    string
}

// ListAudits rechecks current owner authority inside the security transaction.
func (s *Service) ListAudits(ctx context.Context, p *Principal, input AuditQuery) (AuditPage, error) {
	result := AuditPage{Entries: []*ent.AuthAudit{}}
	for _, value := range []string{input.Actor, input.Action, input.Target} {
		if !utf8.ValidString(value) || len(value) > 80 || strings.ContainsRune(value, 0) {
			return result, ErrInvalid
		}
	}
	parseDay := func(value string) (time.Time, error) {
		if value == "" {
			return time.Time{}, nil
		}
		return time.Parse("2006-01-02", value)
	}
	from, err := parseDay(input.From)
	if err != nil {
		return result, ErrInvalid
	}
	to, err := parseDay(input.To)
	if err != nil || (!from.IsZero() && !to.IsZero() && to.Before(from)) {
		return result, ErrInvalid
	}
	var before time.Time
	var beforeID string
	if input.After != "" {
		if len(input.After) > 256 {
			return result, ErrInvalid
		}
		raw, decodeErr := base64.RawURLEncoding.DecodeString(input.After)
		if decodeErr != nil {
			return result, ErrInvalid
		}
		stamp, id, ok := strings.Cut(string(raw), "|")
		if !ok || len(id) == 0 || len(id) > 64 || strings.ContainsRune(id, 0) || !utf8.ValidString(id) {
			return result, ErrInvalid
		}
		before, err = time.Parse(time.RFC3339Nano, stamp)
		if err != nil {
			return result, ErrInvalid
		}
		beforeID = id
	}
	err = s.AuthorizedTransaction(ctx, p, "audit", false, func(tx *ent.Tx, _ *Principal) error {
		result = AuditPage{Entries: []*ent.AuthAudit{}}
		q := tx.AuthAudit.Query().Order(ent.Desc(authaudit.FieldCreatedAt), ent.Desc(authaudit.FieldID)).Limit(101)
		if input.Actor != "" {
			q.Where(authaudit.Or(authaudit.ActorIDEQ(input.Actor), authaudit.ActorReferenceEQ(input.Actor)))
		}
		if input.Action != "" {
			q.Where(authaudit.ActionEQ(input.Action))
		}
		if input.Target != "" {
			q.Where(authaudit.TargetIDEQ(input.Target))
		}
		if !from.IsZero() {
			q.Where(authaudit.CreatedAtGTE(from))
		}
		if !to.IsZero() {
			q.Where(authaudit.CreatedAtLT(to.AddDate(0, 0, 1)))
		}
		if beforeID != "" {
			q.Where(authaudit.Or(authaudit.CreatedAtLT(before), authaudit.And(authaudit.CreatedAtEQ(before), authaudit.IDLT(beforeID))))
		}
		rows, readErr := q.All(ctx)
		if readErr != nil {
			return readErr
		}
		if len(rows) > 100 {
			last := rows[99]
			result.Next = base64.RawURLEncoding.EncodeToString([]byte(last.CreatedAt.UTC().Format(time.RFC3339Nano) + "|" + last.ID))
			rows = rows[:100]
		}
		result.Entries = rows
		return nil
	})
	return result, err
}
