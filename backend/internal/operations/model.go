// Package operations provides narrow staff operational views and audited queue recovery.
package operations

import (
	"context"
	"encoding/base64"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ErrInvalid contains no user input, job payload or internal failure detail.
var ErrInvalid = errors.New("invalid operational request")

// ErrConflict requires refreshing the observed failed job before retrying.
var ErrConflict = errors.New("job state changed or retry unavailable")

// Store shares the live staff authorization fence; it never creates schema.
type Store struct {
	client *ent.Client
	auth   *identity.Service
	now    func() time.Time
}

// New creates operational views without starting jobs or migrations.
func New(client *ent.Client, auth *identity.Service, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{client, auth, now}
}
func validReason(v string) bool {
	return utf8.ValidString(v) && strings.TrimSpace(v) != "" && utf8.RuneCountInString(v) <= 2000 && !strings.ContainsRune(v, 0)
}
func validID(id string) bool {
	if len(id) < 1 || len(id) > 64 {
		return false
	}
	for _, c := range id {
		if c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '-' || c == '_' {
			continue
		}
		return false
	}
	return true
}
func continuation(at time.Time, id string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(at.UTC().Format(time.RFC3339Nano) + "|" + id))
}
func cursor(v string) (time.Time, string, error) {
	if len(v) > 180 {
		return time.Time{}, "", ErrInvalid
	}
	b, e := base64.RawURLEncoding.DecodeString(v)
	if e != nil {
		return time.Time{}, "", ErrInvalid
	}
	parts := strings.Split(string(b), "|")
	if len(parts) != 2 || !validID(parts[1]) {
		return time.Time{}, "", ErrInvalid
	}
	at, e := time.Parse(time.RFC3339Nano, parts[0])
	if e != nil {
		return time.Time{}, "", ErrInvalid
	}
	return at, parts[1], nil
}

// Job is a safe queue projection; payloads, idempotency keys and lease owners are excluded.
type Job struct {
	ID              string     `json:"id"`
	Kind            string     `json:"kind"`
	State           string     `json:"state"`
	Attempts        int        `json:"attempts"`
	MaxAttempts     int        `json:"max_attempts"`
	RetryGeneration int64      `json:"retry_generation"`
	ErrorCode       string     `json:"error_code"`
	CreatedAt       time.Time  `json:"created_at"`
	AvailableAt     time.Time  `json:"available_at"`
	LeaseUntil      *time.Time `json:"lease_until"`
	Retryable       bool       `json:"retryable"`
}

// Listing is a bounded staff-only queue page.
type Listing struct {
	Items []Job  `json:"items"`
	Next  string `json:"next"`
}

// RetryInput acknowledges the observed failure generation and records an audit explanation.
type RetryInput struct {
	Generation int64  `json:"generation"`
	Reason     string `json:"reason"`
}

func supportedKind(kind string) bool {
	switch kind {
	case "payments.invoice", "payments.reconcile", "system.ping", "identity.email", "activity.email", "media.scan", "availability.changed", "availability.fanout", "availability.email":
		return true
	default:
		return false
	}
}
func errorCode(code string) string {
	switch code {
	case "", "handler_failed", "lease_exhausted":
		return code
	default:
		return "internal_error"
	}
}
func jobState(v string) bool {
	switch v {
	case "pending", "running", "failed", "complete":
		return true
	default:
		return false
	}
}

// Card defines an operational count, its exact meaning, and the relevant staff workflow.
type Card struct {
	Key    string `json:"key"`
	Label  string `json:"label"`
	Count  int    `json:"count"`
	Detail string `json:"detail"`
	Href   string `json:"href"`
}

// Item is a small action link; it excludes customer contact data and private content.
type Item struct {
	Label string    `json:"label"`
	State string    `json:"state"`
	Href  string    `json:"href"`
	At    time.Time `json:"at"`
}

// Overview reports currently implemented operational workflows, never fabricated finance totals.
type Overview struct {
	ObservedAt       time.Time  `json:"observed_at"`
	Cards            []Card     `json:"cards"`
	Requests         []Item     `json:"requests"`
	Sessions         []Item     `json:"sessions"`
	Jobs             []Job      `json:"jobs"`
	OldestRunnableAt *time.Time `json:"oldest_runnable_at"`
}

func (s *Store) private(ctx context.Context, p *identity.Principal, fresh bool, fn func(*ent.Tx, *identity.Principal) error) error {
	return s.auth.AuthorizedTransaction(ctx, p, "admin", fresh, fn)
}
