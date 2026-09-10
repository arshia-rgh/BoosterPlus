// Package reports provides bounded operational reports and audited exact-preview downloads.
package reports

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ErrInvalid rejects unbounded filters and malformed cursors.
var ErrInvalid = errors.New("report filter invalid")

// ErrConflict prevents downloading a report that changed since its preview.
var ErrConflict = errors.New("report changed since preview")

// Store uses live authorization and never stores report artifacts or executes DDL.
type Store struct {
	auth *identity.Service
	now  func() time.Time
}

// New constructs report queries around the existing authorization transaction.
func New(auth *identity.Service, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{auth, now}
}

// Query defines a creation-time UTC range and current operational filters.
type Query struct {
	Kind   string `json:"kind"`
	From   string `json:"from"`
	To     string `json:"to"`
	State  string `json:"state"`
	Search string `json:"search"`
	After  string `json:"after"`
}

// Column defines a stable documented report field, never arbitrary private JSON.
type Column struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}

// Report is one explicit bounded page, with an opaque next cursor and exact-content digest.
type Report struct {
	Kind       string     `json:"kind"`
	Basis      string     `json:"basis"`
	ObservedAt time.Time  `json:"observed_at"`
	Query      Query      `json:"query"`
	Columns    []Column   `json:"columns"`
	Rows       [][]string `json:"rows"`
	Next       string     `json:"next"`
	Count      int        `json:"count"`
	Digest     string     `json:"digest"`
}

// ExportInput binds a download to the exact reviewed page and records its purpose.
type ExportInput struct {
	Query  Query  `json:"query"`
	Digest string `json:"digest"`
	Reason string `json:"reason"`
}

// Export includes the committed audit reference and the exact downloaded page.
type Export struct {
	Report  Report `json:"report"`
	AuditID string `json:"audit_id"`
}

type bounds struct {
	from, to  time.Time
	afterTime time.Time
	afterID   string
}

func validate(q Query) (bounds, error) {
	var b bounds
	var e error
	if q.Kind != "orders" && q.Kind != "catalog" && q.Kind != "staff" && q.Kind != "audits" {
		return b, ErrInvalid
	}
	if len(q.From) > 40 || len(q.To) > 40 || len(q.After) > 300 || !utf8.ValidString(q.Search) || utf8.RuneCountInString(q.Search) > 80 || strings.ContainsRune(q.Search, 0) || len(q.State) > 64 || strings.ContainsRune(q.State, 0) {
		return b, ErrInvalid
	}
	b.from, e = time.Parse(time.RFC3339Nano, q.From)
	if e != nil {
		return b, ErrInvalid
	}
	b.to, e = time.Parse(time.RFC3339Nano, q.To)
	if e != nil || !b.from.Before(b.to) {
		return b, ErrInvalid
	}
	if b.from.Location() != time.UTC || b.to.Location() != time.UTC || b.from.Year() < 1000 || b.to.Year() < 1000 {
		return b, ErrInvalid
	}
	return b, nil
}
func (s *Store) filterDigest(q Query) string {
	return s.auth.RequestDigest("report-filter", []byte(strings.Join([]string{q.Kind, q.From, q.To, q.State, q.Search}, "\x00")))
}
func (s *Store) cursor(q Query, at time.Time, id string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(at.UTC().Format(time.RFC3339Nano) + "|" + id + "|" + s.filterDigest(q)))
}
func (s *Store) parseCursor(q Query, b bounds) (bounds, error) {
	if q.After == "" {
		return b, nil
	}
	raw, e := base64.RawURLEncoding.DecodeString(q.After)
	if e != nil {
		return b, ErrInvalid
	}
	parts := strings.Split(string(raw), "|")
	if len(parts) != 3 || subtle.ConstantTimeCompare([]byte(parts[2]), []byte(s.filterDigest(q))) != 1 {
		return b, ErrInvalid
	}
	b.afterTime, e = time.Parse(time.RFC3339Nano, parts[0])
	if e != nil {
		return b, ErrInvalid
	}
	b.afterID = parts[1]
	if q.Kind == "audits" {
		if len(b.afterID) < 1 || len(b.afterID) > 64 {
			return b, ErrInvalid
		}
		for _, r := range b.afterID {
			if r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '-' || r == '_' {
				continue
			}
			return b, ErrInvalid
		}
	} else {
		id, parseErr := uuid.Parse(b.afterID)
		if parseErr != nil || id.String() != b.afterID {
			return b, ErrInvalid
		}
	}
	return b, nil
}
func capability(kind string) string {
	if kind == "audits" {
		return "audit"
	}
	return "admin"
}

// Preview rechecks live staff authority; audit metadata remains owner-only.
func (s *Store) Preview(ctx context.Context, p *identity.Principal, q Query) (Report, error) {
	var result Report
	b, e := validate(q)
	if e != nil {
		return result, e
	}
	b, e = s.parseCursor(q, b)
	if e != nil {
		return result, e
	}
	e = s.auth.AuthorizedTransaction(ctx, p, capability(q.Kind), false, func(tx *ent.Tx, _ *identity.Principal) error {
		var readErr error
		result, readErr = s.report(ctx, tx, q, b)
		return readErr
	})
	return result, e
}

// Download requires recent primary/authenticator verification and commits its audit before returning bytes.
func (s *Store) Download(ctx context.Context, p *identity.Principal, input ExportInput) (Export, error) {
	var result Export
	b, e := validate(input.Query)
	if e != nil {
		return result, e
	}
	b, e = s.parseCursor(input.Query, b)
	if e != nil {
		return result, e
	}
	if len(input.Digest) != 64 || !utf8.ValidString(input.Reason) || strings.TrimSpace(input.Reason) == "" || utf8.RuneCountInString(input.Reason) > 2000 || strings.ContainsRune(input.Reason, 0) {
		return result, ErrInvalid
	}
	e = s.auth.AuthorizedTransaction(ctx, p, capability(input.Query.Kind), true, func(tx *ent.Tx, current *identity.Principal) error {
		r, readErr := s.report(ctx, tx, input.Query, b)
		if readErr != nil {
			return readErr
		}
		if subtle.ConstantTimeCompare([]byte(r.Digest), []byte(input.Digest)) != 1 {
			return ErrConflict
		}
		id := rand.Text()
		_, readErr = tx.AuthAudit.Create().SetID(id).SetActorID(current.User.ID).SetAction("report_export").SetTargetID(id).SetCreatedAt(s.now()).SetMetadata(map[string]string{"kind": input.Query.Kind, "filter_digest": s.filterDigest(input.Query), "content_digest": r.Digest, "reason": input.Reason}).Save(ctx)
		if readErr != nil {
			return readErr
		}
		result = Export{r, id}
		return nil
	})
	return result, e
}
func (s *Store) report(ctx context.Context, tx *ent.Tx, q Query, b bounds) (Report, error) {
	r := Report{Kind: q.Kind, Basis: "Records created in [from, to), UTC; current operational state at generation time. No financial recognition or revenue totals.", ObservedAt: s.now().UTC(), Query: q, Rows: [][]string{}}
	var e error
	switch q.Kind {
	case "orders":
		e = s.orders(ctx, tx, q, b, &r)
	case "catalog":
		e = s.catalog(ctx, tx, q, b, &r)
	case "staff":
		e = s.staff(ctx, tx, q, b, &r)
	case "audits":
		e = s.audits(ctx, tx, q, b, &r)
	}
	if e != nil {
		return r, e
	}
	r.Count = len(r.Rows)
	raw, e := json.Marshal(struct {
		Query   Query
		Columns []Column
		Rows    [][]string
		Next    string
	}{q, r.Columns, r.Rows, r.Next})
	if e != nil {
		return r, e
	}
	r.Digest = s.auth.RequestDigest("report-content", raw)
	return r, nil
}
func instant(t time.Time) string { return t.UTC().Format(time.RFC3339Nano) }
