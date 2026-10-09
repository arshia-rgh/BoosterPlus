// Package identity owns passwordless identities, sessions and authorization.
package identity

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/go-sql-driver/mysql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authsession"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
)

// Identity errors are mapped to stable public API codes without exposing database/provider details.
var (
	ErrInvalid         = errors.New("verification is invalid or expired")
	ErrUnauthenticated = errors.New("sign in is required")
	ErrForbidden       = errors.New("permission denied")
	ErrConflict        = errors.New("requested change conflicts with an existing identity")
	ErrMFA             = errors.New("authenticator verification is required")
	ErrRecent          = errors.New("recent authentication is required")
	ErrTerms           = errors.New("accept the current account terms")
	ErrUnavailable     = errors.New("sign-in service is unavailable")
	ErrLimited         = errors.New("too many attempts; try again later")
)

// Roles and session policy constants are server authority, never self-selected by clients.
const (
	RoleCustomer = "customer"
	RoleBooster  = "booster"
	RoleAdmin    = "administrator"
	RoleOwner    = "owner"
	RecentTTL    = 10 * time.Minute
	IdleTTL      = 30 * time.Minute
)

// Config is trusted, server-side identity configuration. Never log this value.
type Config struct {
	Key                 []byte
	PublicOrigin        string
	AdminPublicOrigin   string
	BoosterPublicOrigin string
	AllowedOrigins      []string
	ProxyKey            string
	SecureCookies       bool
	TermsVersion        string
	TermsURL            string
	GoogleClientID      string
	GoogleClientSecret  string
	SMTPHost            string
	SMTPPort            int
	SMTPUsername        string
	SMTPPassword        string
	SMTPFrom            string
	SMTPPlaintext       bool
}

// Service shares the application's Ent client; it never migrates database state.
type Service struct {
	client *ent.Client
	config Config
	now    func() time.Time
	google GoogleProvider
}

// New constructs a service. A test clock and provider are injected only by Go callers, never HTTP inputs.
func New(client *ent.Client, cfg Config, now func() time.Time, provider GoogleProvider) (*Service, error) {
	if client == nil || len(cfg.Key) != 32 || cfg.PublicOrigin == "" || len(cfg.ProxyKey) < 32 {
		return nil, errors.New("invalid identity configuration")
	}
	if now == nil {
		now = time.Now
	}
	return &Service{client: client, config: cfg, now: now, google: provider}, nil
}

// Principal is authenticated first-factor state. Require also enforces the second factor.
type Principal struct {
	User    *ent.User
	Session *ent.AuthSession
}

// NeedsMFA requires an authenticator for all staff and customers who enrolled one.
func (p *Principal) NeedsMFA() bool {
	return (p.User.Role != RoleCustomer || p.User.MfaEnabled) && p.Session.MfaVerifiedAt == nil
}

// Require is the common capability boundary for every protected resource.
func Require(p *Principal, capability string) error {
	if p == nil || p.User == nil || p.Session == nil {
		return ErrUnauthenticated
	}
	portal := Portal(p.Session.Portal)
	if !portal.permitsUser(p.User) {
		return ErrForbidden
	}
	if p.NeedsMFA() {
		return ErrMFA
	}
	allowed := false
	switch capability {
	case "self":
		allowed = true
	case "account":
		allowed = portal == PortalCustomer
	case "booster":
		allowed = portal == PortalBooster
	case "admin", "users.read":
		allowed = portal == PortalAdmin
	case "owner", "audit", "staff.manage", "recovery":
		allowed = portal == PortalAdmin && p.User.Role == RoleOwner
	}
	if !allowed {
		return ErrForbidden
	}
	return nil
}

func (s *Service) recent(p *Principal) error {
	if p == nil {
		return ErrUnauthenticated
	}
	if !p.Session.AuthenticatedAt.Add(RecentTTL).After(s.now()) {
		return ErrRecent
	}
	return nil
}
func (s *Service) sensitive(p *Principal) error {
	// A fresh factor can renew an already completed sign-in, never replace the
	// mandatory staff/enrolled-customer MFA step of a new session.
	if err := Require(p, "self"); err != nil {
		return err
	}
	if s.recent(p) == nil {
		return nil
	}
	if p.User.MfaEnabled && p.Session.MfaVerifiedAt != nil && p.Session.MfaVerifiedAt.Add(RecentTTL).After(s.now()) {
		return nil
	}
	return ErrRecent
}

// transaction retries only known serialization failures; all effects remain inside the transaction.
func (s *Service) transaction(ctx context.Context, fn func(*ent.Tx) error) error {
	for attempt := 0; attempt < 3; attempt++ {
		// After waiting on auth_controls, subsequent authorization reads must see
		// committed changes. TiDB snapshot isolation would preserve stale owner counts.
		tx, err := s.client.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
		if err != nil {
			return err
		}
		operationErr := fn(tx)
		if operationErr != nil {
			rollbackErr := tx.Rollback()
			if rollbackErr == nil && serializationFailure(operationErr) && ctx.Err() == nil {
				continue
			}
			return errors.Join(operationErr, rollbackErr)
		}
		commitErr := tx.Commit()
		if commitErr == nil {
			return nil
		}
		if !serializationFailure(commitErr) {
			return commitErr
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
	}
	return errors.New("identity transaction contention")
}

func serializationFailure(err error) bool {
	var databaseErr *mysql.MySQLError
	return errors.As(err, &databaseErr) && (databaseErr.Number == 1213 || databaseErr.Number == 9007)
}

func audit(ctx context.Context, tx *ent.Tx, now time.Time, actor, reference, action, target string, metadata map[string]string) error {
	_, err := tx.AuthAudit.Create().SetID(randomToken()).SetActorID(actor).SetActorReference(reference).SetAction(action).SetTargetID(target).SetMetadata(metadata).SetCreatedAt(now).Save(ctx)
	return err
}

func revokeAll(ctx context.Context, tx *ent.Tx, id string, now time.Time) error {
	_, err := tx.AuthSession.Update().Where(authsession.UserIDEQ(id), authsession.RevokedAtIsNil()).SetRevokedAt(now).Save(ctx)
	return err
}

func lockSecurity(ctx context.Context, tx *ent.Tx) error {
	result, err := tx.ExecContext(ctx, "UPDATE auth_controls SET version=version+1 WHERE id=1")
	if err != nil {
		return err
	}
	count, countErr := result.RowsAffected()
	if countErr != nil {
		return countErr
	}
	if count != 1 {
		return ErrUnavailable
	}
	return nil
}

// Audits returns a bounded owner-only audit view, preserving internal actor IDs.
func (s *Service) Audits(ctx context.Context, p *Principal) ([]*ent.AuthAudit, error) {
	result, err := s.ListAudits(ctx, p, AuditQuery{})
	return result.Entries, err
}

func activeUser(ctx context.Context, tx *ent.Tx, id string) (*ent.User, error) {
	account, err := tx.User.Query().Where(user.IDEQ(id), user.SuspendedEQ(false)).Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrUnauthenticated
		}
		return nil, err
	}
	return account, nil
}

func validateRole(role string) error {
	switch role {
	case RoleCustomer, RoleBooster, RoleAdmin, RoleOwner:
		return nil
	default:
		return fmt.Errorf("%w: unknown role", ErrInvalid)
	}
}
