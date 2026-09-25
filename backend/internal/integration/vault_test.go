//go:build integration

package integration

import (
	"bytes"
	"context"
	"crypto/rand"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

func vaultKey(t *testing.T) []byte {
	t.Helper()
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		t.Fatal(err)
	}
	return key
}

// This qualification policy uses real owned orders and paid-state checks. P08
// supplies the full assignment/mode policy; no generic vault HTTP API is exposed.
func qualificationVaultPolicy(ctx context.Context, tx *ent.Tx, p *identity.Principal, scope vault.Scope, op vault.Operation) error {
	if scope.Purpose != "game_access" {
		return identity.ErrForbidden
	}
	row, err := tx.Order.Query().Where(order.IDEQ(scope.ResourceID), order.UserIDEQ(scope.OwnerID)).Only(ctx)
	if err != nil {
		return err
	}
	switch op {
	case vault.Deliver:
		return identity.ErrForbidden
	case vault.Inspect:
		if p.User.ID != scope.OwnerID {
			return identity.ErrForbidden
		}
		return nil
	case vault.Revoke:
		if p.User.ID == scope.OwnerID || p.User.Role == identity.RoleAdmin || p.User.Role == identity.RoleOwner {
			return nil
		}
		return identity.ErrForbidden
	case vault.Rotate:
		if p.User.Role != identity.RoleOwner {
			return identity.ErrForbidden
		}
	case vault.Write:
		if p.User.ID != scope.OwnerID {
			return identity.ErrForbidden
		}
	case vault.Reveal:
		if p.User.Role != identity.RoleAdmin && p.User.Role != identity.RoleOwner {
			return identity.ErrForbidden
		}
	default:
		return identity.ErrForbidden
	}
	if row.State != order.StateQueued && row.State != order.StateInProgress && row.State != order.StateOnHold {
		return identity.ErrForbidden
	}
	paid, err := tx.OrderContract.Query().Where(ordercontract.OrderIDEQ(row.ID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateSettled)).Exist(ctx)
	if err != nil {
		return err
	}
	if !paid {
		return identity.ErrForbidden
	}
	return nil
}
func vaultStore(t *testing.T, f *orderFixture, keys *vault.Keyring, policy vault.Policy) *vault.Store {
	t.Helper()
	s, err := vault.New(f.auth.client, f.auth.service, keys, policy, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	if err != nil {
		t.Fatal(err)
	}
	return s
}
func vaultScope(t *testing.T, f *orderFixture, paid bool) vault.Scope {
	t.Helper()
	detail := f.create(t, "package")
	if paid {
		// Synthetic settled fixtures live only in isolated test databases. No payment
		// endpoint or production command can set this state without P07 verification.
		if _, err := f.auth.client.OrderContract.Update().Where(ordercontract.OrderIDEQ(detail.Order.ID)).SetPaymentState(ordercontract.PaymentStateSettled).Save(t.Context()); err != nil {
			t.Fatal(err)
		}
		if _, err := f.auth.client.Order.UpdateOneID(detail.Order.ID).SetState(order.StateQueued).Save(t.Context()); err != nil {
			t.Fatal(err)
		}
	}
	return vault.Scope{Purpose: "game_access", ResourceID: detail.Order.ID, OwnerID: f.buyer.User.ID}
}
func TestVaultAuthorizationRecentFactorsAndEnvelopeStorage(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	ring, err := vault.NewKeyring("v1", map[string][]byte{"v1": vaultKey(t)})
	if err != nil {
		t.Fatal(err)
	}
	store := vaultStore(t, f, ring, qualificationVaultPolicy)
	scope := vaultScope(t, f, false)
	expiry := time.Unix(f.auth.clock.Load(), 0).Add(24 * time.Hour)
	plaintext := []byte("synthetic temporary game access, never real credentials")
	if _, err = store.Put(ctx, f.buyer, scope, 0, uuid.NewString(), expiry, plaintext); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("unpaid credentials collected", err)
	}
	if _, err = f.auth.client.OrderContract.Update().Where(ordercontract.OrderIDEQ(scope.ResourceID)).SetPaymentState(ordercontract.PaymentStateSettled).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.client.Order.UpdateOneID(scope.ResourceID).SetState(order.StateQueued).Save(ctx); err != nil {
		t.Fatal(err)
	}
	key := uuid.NewString()
	meta, err := store.Put(ctx, f.buyer, scope, 0, key, expiry, plaintext)
	if err != nil {
		t.Fatal(err)
	}
	same, err := store.Put(ctx, f.buyer, scope, 0, key, expiry, plaintext)
	if err != nil || same.ID != meta.ID || same.Version != meta.Version {
		t.Fatal("idempotent secret write failed", err)
	}
	if _, err = store.Put(ctx, f.buyer, scope, 0, key, expiry, []byte("changed")); !errors.Is(err, vault.ErrConflict) {
		t.Fatal("retry changed secret", err)
	}
	row, err := f.auth.client.SecretBundle.Get(ctx, meta.ID)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(row.EncryptedPayload, plaintext) || bytes.Contains(row.WrappedKey, plaintext) || len(row.WrappedKey) != 60 {
		t.Fatal("plaintext or invalid envelope persisted")
	}
	if _, err = store.RevealForStaff(ctx, f.buyer, scope); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer used staff reveal", err)
	}
	if _, err = store.Put(ctx, f.other, scope, meta.Version, uuid.NewString(), expiry, plaintext); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("foreign secret replaced", err)
	}
	if _, err = store.Status(ctx, f.other, scope); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("foreign secret metadata exposed", err)
	}
	revealed, err := store.RevealForStaff(ctx, f.admin, scope)
	if err != nil || !bytes.Equal(revealed, plaintext) {
		t.Fatal("authorized reveal failed", err)
	}
	clear(revealed)
	audits, err := f.auth.client.AuthAudit.Query().Where(authaudit.ActionEQ("vault_revealed"), authaudit.TargetIDEQ(meta.ID)).Count(ctx)
	if err != nil || audits != 1 {
		t.Fatal("access audit missing", err)
	}
	_, booster := f.auth.login(t, "vaultbooster@example.test")
	if _, err = f.auth.client.User.UpdateOneID(booster.User.ID).SetRole(identity.RoleBooster).Save(ctx); err != nil {
		t.Fatal(err)
	}
	booster = f.auth.enterPortal(t, booster, identity.PortalBooster)
	_, _, booster = f.auth.enroll(t, booster)
	if _, err = store.RevealForStaff(ctx, booster, scope); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("unassigned staff read credentials", err)
	}
	denied := vaultStore(t, f, ring, vault.DenyAll)
	if _, err = denied.RevealForStaff(ctx, f.admin, scope); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("role bypassed resource policy", err)
	}
	if _, err = vault.New(f.auth.client, f.auth.service, ring, nil, nil); !errors.Is(err, vault.ErrInvalid) {
		t.Fatal("nil policy accepted")
	}
	if _, err = f.auth.client.User.UpdateOneID(f.admin.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if raw, e := store.RevealForStaff(ctx, f.admin, scope); !errors.Is(e, identity.ErrUnauthenticated) || raw != nil {
		t.Fatal("suspended staff received plaintext", e)
	}
	if _, err = f.auth.client.User.UpdateOneID(f.admin.User.ID).SetSuspended(false).Save(ctx); err != nil {
		t.Fatal(err)
	}
	f.auth.clock.Add(601)
	if raw, e := store.RevealForStaff(ctx, f.admin, scope); !errors.Is(e, identity.ErrRecent) || raw != nil {
		t.Fatal("stale factors returned plaintext", e)
	}
	if err = store.RevokeForStaff(ctx, f.admin, scope, meta.Version); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("stale staff revoked bundle", err)
	}
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetAuthenticatedAt(time.Unix(f.auth.clock.Load(), 0)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if raw, e := store.RevealForStaff(ctx, f.admin, scope); !errors.Is(e, identity.ErrMFA) || raw != nil {
		t.Fatal("stale second factor received plaintext", e)
	}

}
func TestVaultAuditFailureRollbackAndRevocation(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	ring, err := vault.NewKeyring("v1", map[string][]byte{"v1": vaultKey(t)})
	if err != nil {
		t.Fatal(err)
	}
	store := vaultStore(t, f, ring, qualificationVaultPolicy)
	scope := vaultScope(t, f, true)
	expiry := time.Unix(f.auth.clock.Load(), 0).Add(time.Hour)
	meta, err := store.Put(ctx, f.buyer, scope, 0, uuid.NewString(), expiry, []byte("synthetic protected value"))
	if err != nil {
		t.Fatal(err)
	}
	persisted, err := f.auth.client.SecretBundle.Get(ctx, meta.ID)
	if err != nil {
		t.Fatal(err)
	}
	corrupt := bytes.Clone(persisted.EncryptedPayload)
	corrupt[0] ^= 1
	if _, err = f.auth.client.SecretBundle.UpdateOneID(meta.ID).SetEncryptedPayload(corrupt).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if data, e := store.RevealForStaff(ctx, f.admin, scope); !errors.Is(e, vault.ErrUnavailable) || data != nil {
		t.Fatal("tampered database ciphertext returned plaintext", e)
	}
	if _, err = f.auth.client.SecretBundle.UpdateOneID(meta.ID).SetEncryptedPayload(persisted.EncryptedPayload).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if data, e := store.RevealForStaff(ctx, f.admin, scope); e == nil || data != nil {
		t.Fatal("plaintext returned without audit")
	}
	if _, err = store.Put(ctx, f.buyer, scope, meta.Version, uuid.NewString(), expiry, []byte("replacement must roll back")); err == nil {
		t.Fatal("replacement committed without audit")
	}
	if err = store.Revoke(ctx, f.buyer, scope, meta.Version); err == nil {
		t.Fatal("revocation committed without audit")
	}
	f.auth.clock.Add(3601)
	if err = store.Expire(ctx); err == nil {
		t.Fatal("expiry committed without audit")
	}

	row, err := f.auth.client.SecretBundle.Get(ctx, meta.ID)
	if err != nil || row.Version != meta.Version || row.State != secretbundle.StateActive {
		t.Fatal("vault transaction partially committed", err)
	}
}
func TestVaultConcurrentReplacementExpiryAndRotation(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	first, next := vaultKey(t), vaultKey(t)
	old, err := vault.NewKeyring("v1", map[string][]byte{"v1": first})
	if err != nil {
		t.Fatal(err)
	}
	keys, err := vault.NewKeyring("v2", map[string][]byte{"v1": first, "v2": next})
	if err != nil {
		t.Fatal(err)
	}
	store := vaultStore(t, f, old, qualificationVaultPolicy)
	scope := vaultScope(t, f, true)
	expiry := time.Unix(f.auth.clock.Load(), 0).Add(24 * time.Hour)
	meta, err := store.Put(ctx, f.buyer, scope, 0, uuid.NewString(), expiry, []byte("synthetic initial bundle"))
	if err != nil {
		t.Fatal(err)
	}
	var wins atomic.Int64
	var wg sync.WaitGroup
	for range 5 {
		wg.Go(func() {
			_, e := store.Put(ctx, f.buyer, scope, meta.Version, uuid.NewString(), expiry, []byte("synthetic replacement"))
			if e == nil {
				wins.Add(1)
			} else if !errors.Is(e, vault.ErrConflict) {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("multiple concurrent replacements won", wins.Load())
	}
	meta, err = store.Status(ctx, f.buyer, scope)
	if err != nil || meta.Version != 2 {
		t.Fatal("replacement version", err)
	}
	rotatedStore := vaultStore(t, f, keys, qualificationVaultPolicy)
	if _, err = rotatedStore.RotateForOwner(ctx, f.admin, scope, meta.Version); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("nonowner rotated keys", err)
	}
	if _, err = f.auth.client.User.UpdateOneID(f.admin.User.ID).SetRole(identity.RoleOwner).Save(ctx); err != nil {
		t.Fatal(err)
	}
	owner := f.auth.principalFromSession(t, f.admin)
	before, err := f.auth.client.SecretBundle.Get(ctx, meta.ID)
	if err != nil {
		t.Fatal(err)
	}
	meta, err = rotatedStore.RotateForOwner(ctx, owner, scope, meta.Version)
	if err != nil {
		t.Fatal(err)
	}
	after, err := f.auth.client.SecretBundle.Get(ctx, meta.ID)
	if err != nil || !bytes.Equal(before.EncryptedPayload, after.EncryptedPayload) || after.KeyVersion != "v2" || bytes.Equal(before.WrappedKey, after.WrappedKey) {
		t.Fatal("invalid rewrap", err)
	}
	onlyNew, err := vault.NewKeyring("v2", map[string][]byte{"v2": next})
	if err != nil {
		t.Fatal(err)
	}
	newStore := vaultStore(t, f, onlyNew, qualificationVaultPolicy)
	value, err := newStore.RevealForStaff(ctx, owner, scope)
	if err != nil || string(value) != "synthetic replacement" {
		t.Fatal("new key cannot reveal", err)
	}
	clear(value)
	if err = store.Revoke(ctx, f.buyer, scope, meta.Version-1); !errors.Is(err, vault.ErrConflict) {
		t.Fatal("stale revocation won", err)
	}
	if err = store.Revoke(ctx, f.buyer, scope, meta.Version); err != nil {
		t.Fatal(err)
	}
	revoked, err := f.auth.client.SecretBundle.Get(ctx, meta.ID)
	if err != nil || len(revoked.EncryptedPayload) != 0 || len(revoked.WrappedKey) != 0 || revoked.KeyVersion != "" {
		t.Fatal("revocation retained live secret", err)
	}
	if data, e := newStore.RevealForStaff(ctx, owner, scope); !errors.Is(e, vault.ErrUnavailable) || data != nil {
		t.Fatal("revoked secret revealed", e)
	}
	meta, err = store.Put(ctx, f.buyer, scope, revoked.Version, uuid.NewString(), time.Unix(f.auth.clock.Load(), 0).Add(time.Second), []byte("synthetic expiring access"))
	if err != nil {
		t.Fatal(err)
	}
	f.auth.clock.Add(2)
	if data, e := store.RevealForStaff(ctx, owner, scope); !errors.Is(e, vault.ErrUnavailable) || data != nil {
		t.Fatal("expired secret revealed", e)
	}
	if err = store.Expire(ctx); err != nil {
		t.Fatal(err)
	}
	expired, err := f.auth.client.SecretBundle.Get(ctx, meta.ID)
	if err != nil || len(expired.EncryptedPayload) != 0 || len(expired.WrappedKey) != 0 || expired.State != secretbundle.StateDeleted {
		t.Fatal("expiry retained live secret", err)
	}
	audits, err := f.auth.client.AuthAudit.Query().Where(authaudit.ActionEQ("vault_expired"), authaudit.TargetIDEQ(meta.ID)).Count(ctx)
	if err != nil || audits != 1 {
		t.Fatal("expiry audit missing", err)
	}
}
