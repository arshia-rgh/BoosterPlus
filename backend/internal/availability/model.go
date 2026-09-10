// Package availability owns explicitly consented limited-package email alerts.
package availability

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"database/sql"
	"errors"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// ErrInvalid rejects malformed input without disclosing private subscriptions.
var ErrInvalid = errors.New("availability input invalid")

// ErrConflict requires reloading consent after a concurrent edit or changed offering.
var ErrConflict = errors.New("availability consent changed")

// ConsentVersion records the specific, separate availability email permission.
const ConsentVersion = "availability-v1"
const maxVersion = 2147483646

// Store holds query/auth dependencies, never a migration or startup seed.
type Store struct {
	client *ent.Client
	auth   *identity.Service
	origin string
	now    func() time.Time
}

// New validates the fixed email origin; customer input cannot select email destinations.
func New(client *ent.Client, auth *identity.Service, origin string, now func() time.Time) (*Store, error) {
	u, e := url.Parse(origin)
	if e != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.Path != "" && u.Path != "/" || u.Scheme != "http" && u.Scheme != "https" {
		return nil, ErrInvalid
	}
	if now == nil {
		now = time.Now
	}
	return &Store{client, auth, strings.TrimRight(origin, "/"), now}, nil
}

// View contains only an owned subscription and public catalog labels.
type View struct {
	ID        string    `json:"id"`
	Version   int       `json:"version"`
	State     string    `json:"state"`
	Slug      string    `json:"slug"`
	Package   string    `json:"package"`
	Variant   string    `json:"variant"`
	Label     string    `json:"label"`
	Available bool      `json:"available"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Listing is a bounded customer page.
type Listing struct {
	Subscriptions []View `json:"subscriptions"`
	Next          string `json:"next"`
}

// SubscribeInput requires explicit current policy consent, with no implied reservation.
type SubscribeInput struct {
	Slug           string `json:"slug"`
	Package        string `json:"package"`
	Variant        string `json:"variant"`
	ConsentVersion string `json:"consent_version"`
	Accept         bool   `json:"accept"`
}

// ChangeInput fences consent changes against stale tabs.
type ChangeInput struct {
	Version        int    `json:"version"`
	Active         bool   `json:"active"`
	ConsentVersion string `json:"consent_version"`
	Accept         bool   `json:"accept"`
}

// LinkInput is a single-purpose capability, carried in an email URL fragment and POST body.
type LinkInput struct {
	ID      string `json:"id"`
	Version int    `json:"version"`
	Token   string `json:"token"`
}

// LinkView discloses no identity or offering details to anonymous link holders.
type LinkView struct {
	Current bool `json:"current"`
}

func validID(v string) bool { u, e := uuid.Parse(v); return e == nil && u.String() == v }
func validKey(v string, limit int) bool {
	if len(v) < 1 || len(v) > limit {
		return false
	}
	for _, c := range v {
		if c >= 'a' && c <= 'z' || c >= '0' && c <= '9' || c == '-' || c == '_' {
			continue
		}
		return false
	}
	return true
}
func (s *Store) fingerprint(email string) string {
	return s.auth.RequestDigest("availability-email", []byte(email))
}
func (s *Store) token(row *ent.AvailabilitySubscription) string {
	return s.auth.RequestDigest("availability-unsubscribe", []byte(row.ID+"|"+strconv.Itoa(row.Version)+"|"+row.EmailFingerprint))
}
func (s *Store) linkCurrent(row *ent.AvailabilitySubscription, input LinkInput) bool {
	return row.State == "active" && row.Version == input.Version && subtle.ConstantTimeCompare([]byte(s.token(row)), []byte(input.Token)) == 1
}
func (s *Store) audit(ctx context.Context, tx *ent.Tx, actor, reference, action, id string) error {
	_, e := tx.AuthAudit.Create().SetID(rand.Text()).SetActorID(actor).SetActorReference(reference).SetAction("availability." + action).SetTargetID(id).SetMetadata(map[string]string{"consent_version": ConsentVersion}).SetCreatedAt(s.now()).Save(ctx)
	return e
}

// fenced serializes consent and worker decisions with existing identity/domain mutations.
// External I/O must happen after this short transaction has released the security fence.
func (s *Store) fenced(ctx context.Context, fn func(*ent.Tx) error) error {
	tx, e := s.client.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if e != nil {
		return e
	}
	result, e := tx.ExecContext(ctx, "UPDATE auth_controls SET version=version+1 WHERE id=1")
	if e == nil {
		var n int64
		n, e = result.RowsAffected()
		if e == nil && n != 1 {
			e = identity.ErrUnavailable
		}
	}
	if e == nil {
		e = fn(tx)
	}
	if e != nil {
		return errors.Join(e, tx.Rollback())
	}
	return tx.Commit()
}
