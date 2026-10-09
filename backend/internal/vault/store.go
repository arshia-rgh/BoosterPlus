package vault

import (
	"context"
	"crypto/subtle"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Operation distinguishes resource-policy decisions; role alone never grants a secret.
type Operation string

// Operations are explicit inputs to each resource authorization policy.
const (
	Write   Operation = "write"
	Inspect Operation = "inspect"
	Reveal  Operation = "reveal"
	Deliver Operation = "deliver"
	Revoke  Operation = "revoke"
	Rotate  Operation = "rotate"
)

// Policy must check the resource inside the caller's transaction. It must not
// contact external services. New rejects nil; unregistered resource kinds deny.
type Policy func(context.Context, *ent.Tx, *identity.Principal, Scope, Operation) error

// ErrConflict requires a fresh version; accepted secrets are never silently replaced.
var ErrConflict = errors.New("protected secret changed")

// Store has no generic public HTTP routes. Fulfillment/resale register their own
// paid-order, assignment and handoff policies before exposing any submission/reveal.
type Store struct {
	client *ent.Client
	auth   *identity.Service
	keys   *Keyring
	policy Policy
	now    func() time.Time
}

// New requires an explicit resource policy and a distinct validated keyring.
func New(client *ent.Client, auth *identity.Service, keys *Keyring, policy Policy, clock func() time.Time) (*Store, error) {
	if client == nil || auth == nil || keys == nil || policy == nil {
		return nil, ErrInvalid
	}
	if clock == nil {
		clock = time.Now
	}
	return &Store{client, auth, keys, policy, clock}, nil
}

// View deliberately exposes neither ciphertext, keys nor stored plaintext.
type View struct {
	ID        string
	Version   int
	State     string
	ExpiresAt time.Time
}

func metadata(row *ent.SecretBundle) View {
	return View{row.ID, row.Version, string(row.State), row.ExpiresAt}
}
func record(ctx context.Context, client *ent.Client, scope Scope) (*ent.SecretBundle, error) {
	return client.SecretBundle.Query().Where(secretbundle.PurposeEQ(secretbundle.Purpose(scope.Purpose)), secretbundle.ResourceIDEQ(scope.ResourceID), secretbundle.OwnerIDEQ(scope.OwnerID)).Only(ctx)
}
func envelope(row *ent.SecretBundle) Envelope {
	return Envelope{row.KeyVersion, row.WrappedKey, row.EncryptedPayload}
}
func audit(ctx context.Context, tx *ent.Tx, p *identity.Principal, id, action string, now time.Time) error {
	_, err := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(p.User.ID).SetAction(action).SetTargetID(id).SetMetadata(map[string]string{}).SetCreatedAt(now).Save(ctx)
	return err
}

// Put accepts a policy-approved secret with explicit expiry, optimistic version
// and a private idempotency digest. Customers cannot choose another scope owner.
func (s *Store) Put(ctx context.Context, p *identity.Principal, scope Scope, version int, requestKey string, expires time.Time, plaintext []byte) (View, error) {
	return s.put(ctx, p, scope, version, requestKey, expires, plaintext, "account", false)
}

// PutForStaff creates an administrator-owned handoff with fresh staff factors.
// The resource policy still controls purpose, ownership, payment and delivery state.
func (s *Store) PutForStaff(ctx context.Context, p *identity.Principal, scope Scope, version int, requestKey string, expires time.Time, plaintext []byte) (View, error) {
	return s.put(ctx, p, scope, version, requestKey, expires, plaintext, "admin", true)
}

func (s *Store) put(ctx context.Context, p *identity.Principal, scope Scope, version int, requestKey string, expires time.Time, plaintext []byte, capability string, sensitive bool) (View, error) {
	if _, err := scope.aad(uuid.NewString()); err != nil {
		return View{}, err
	}
	key, err := uuid.Parse(requestKey)
	if err != nil || key.String() != requestKey || len(plaintext) == 0 || len(plaintext) > MaxBytes || version < 0 || version >= 2147483646 {
		return View{}, ErrInvalid
	}
	digest, err := s.writeDigest(scope, requestKey, expires, plaintext)
	if err != nil {
		return View{}, ErrInvalid
	}
	var result View
	err = s.auth.AuthorizedTransaction(ctx, p, capability, sensitive, func(tx *ent.Tx, current *identity.Principal) error {
		if current.User.ID != scope.OwnerID {
			return identity.ErrForbidden
		}
		if e := s.policy(ctx, tx, current, scope, Write); e != nil {
			return e
		}
		row, e := record(ctx, tx.Client(), scope)
		if e != nil && !ent.IsNotFound(e) {
			return e
		}
		if e == nil && row.RequestKey == requestKey {
			storedDigest, digestErr := s.retryDigest(row, scope, requestKey, expires, plaintext)
			if digestErr != nil {
				return digestErr
			}
			if subtle.ConstantTimeCompare([]byte(row.RequestHash), []byte(storedDigest)) != 1 {
				return ErrConflict
			}
			result = metadata(row)
			return nil
		}
		now := s.now().UTC()
		if !expires.After(now) || expires.After(now.Add(30*24*time.Hour)) {
			return ErrInvalid
		}
		id := uuid.NewString()
		if row != nil {
			if row.Version != version {
				return ErrConflict
			}
			id = row.ID
		} else if version != 0 {
			return ErrConflict
		}
		encrypted, e := s.keys.Seal(id, scope, plaintext)
		if e != nil {
			return e
		}
		if row == nil {
			row, e = tx.SecretBundle.Create().SetID(id).SetPurpose(secretbundle.Purpose(scope.Purpose)).SetResourceID(scope.ResourceID).SetOwnerID(scope.OwnerID).SetVersion(1).SetKeyVersion(encrypted.KeyID).SetWrappedKey(encrypted.WrappedKey).SetEncryptedPayload(encrypted.Payload).SetState(secretbundle.StateActive).SetRequestKey(requestKey).SetRequestHash(digest).SetExpiresAt(expires).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		} else {
			row, e = tx.SecretBundle.UpdateOneID(id).Where(secretbundle.VersionEQ(version)).AddVersion(1).SetCipherOwnerID("").SetKeyVersion(encrypted.KeyID).SetWrappedKey(encrypted.WrappedKey).SetEncryptedPayload(encrypted.Payload).SetState(secretbundle.StateActive).SetRequestKey(requestKey).SetRequestHash(digest).SetExpiresAt(expires).SetUpdatedAt(now).Save(ctx)
		}
		if ent.IsNotFound(e) {
			return ErrConflict
		}
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current, id, "vault_written", now); e != nil {
			return e
		}
		result = metadata(row)
		return nil
	})
	return result, err
}

// Staff authority is selected by the stored session, never inferred from role.
func staffCapability(p *identity.Principal) string {
	if p != nil && p.Session != nil && p.Session.Portal == string(identity.PortalAdmin) {
		return "admin"
	}
	return "booster"
}

// RevealForStaff commits live authorization and its audit before returning bytes.
func (s *Store) RevealForStaff(ctx context.Context, p *identity.Principal, scope Scope) ([]byte, error) {
	return s.reveal(ctx, p, scope, staffCapability(p), true, Reveal)
}

// RevealForCustomer requires recent authentication and a separately authorized delivery policy.
func (s *Store) RevealForCustomer(ctx context.Context, p *identity.Principal, scope Scope) ([]byte, error) {
	return s.reveal(ctx, p, scope, "account", false, Deliver)
}
func (s *Store) reveal(ctx context.Context, p *identity.Principal, scope Scope, capability string, staff bool, operation Operation) ([]byte, error) {
	var result []byte
	err := s.auth.AuthorizedTransaction(ctx, p, capability, staff, func(tx *ent.Tx, current *identity.Principal) error {
		clear(result)
		result = nil
		if !staff && !current.Session.AuthenticatedAt.Add(identity.RecentTTL).After(s.now()) {
			return identity.ErrRecent
		}
		if e := s.policy(ctx, tx, current, scope, operation); e != nil {
			return e
		}
		row, e := record(ctx, tx.Client(), scope)
		if e != nil {
			return e
		}
		if row.State != secretbundle.StateActive || !row.ExpiresAt.After(s.now()) {
			return ErrUnavailable
		}
		storedScope, e := cipherScope(row, scope)
		if e != nil {
			return e
		}
		raw, e := s.keys.Open(row.ID, storedScope, envelope(row))
		if ent.IsNotFound(e) {
			return ErrConflict
		}
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current, row.ID, "vault_revealed", s.now()); e != nil {
			clear(raw)
			return e
		}
		result = raw
		return nil
	})
	if err != nil {
		clear(result)
		return nil, err
	}
	return result, nil
}

// Revoke clears live encrypted data in the same transaction as its audit.
func (s *Store) Revoke(ctx context.Context, p *identity.Principal, scope Scope, version int) error {
	return s.revoke(ctx, p, scope, version, false)
}

// RevokeForStaff requires recent primary and authenticator verification.
func (s *Store) RevokeForStaff(ctx context.Context, p *identity.Principal, scope Scope, version int) error {
	return s.revoke(ctx, p, scope, version, true)
}
func (s *Store) revoke(ctx context.Context, p *identity.Principal, scope Scope, version int, staff bool) error {
	capability := "account"
	if staff {
		capability = staffCapability(p)
	}
	return s.auth.AuthorizedTransaction(ctx, p, capability, staff, func(tx *ent.Tx, current *identity.Principal) error {
		if !staff && current.User.ID != scope.OwnerID {
			return identity.ErrForbidden
		}
		if e := s.policy(ctx, tx, current, scope, Revoke); e != nil {
			return e
		}
		row, e := record(ctx, tx.Client(), scope)
		if e != nil {
			return e
		}
		if row.Version != version || version >= 2147483646 {
			return ErrConflict
		}
		if row.State == secretbundle.StateDeleted {
			return nil
		}
		_, e = tx.SecretBundle.UpdateOneID(row.ID).Where(secretbundle.VersionEQ(version)).AddVersion(1).SetState(secretbundle.StateDeleted).ClearWrappedKey().ClearEncryptedPayload().SetKeyVersion("").SetUpdatedAt(s.now()).Save(ctx)
		if ent.IsNotFound(e) {
			return ErrConflict
		}
		if e != nil {
			return e
		}
		return audit(ctx, tx, current, row.ID, "vault_revoked", s.now())
	})
}
