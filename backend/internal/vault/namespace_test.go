package vault

import (
	"bytes"
	"errors"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func migratedFixture(t *testing.T) (*ent.SecretBundle, Scope, Scope, *Keyring) {
	t.Helper()
	previous := Scope{"game_access", "00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"}
	current := previous
	var err error
	current.OwnerID, err = identity.LegacyCustomerID(previous.OwnerID)
	if err != nil {
		t.Fatal(err)
	}
	keys, err := NewKeyring("old", map[string][]byte{"old": bytes.Repeat([]byte{1}, 32)})
	if err != nil {
		t.Fatal(err)
	}
	row := &ent.SecretBundle{ID: "00000000-0000-4000-8000-000000000003", Purpose: secretbundle.PurposeGameAccess, ResourceID: current.ResourceID, OwnerID: current.OwnerID, CipherOwnerID: previous.OwnerID}
	encrypted, err := keys.Seal(row.ID, previous, []byte("synthetic preserved access"))
	if err != nil {
		t.Fatal(err)
	}
	row.KeyVersion, row.WrappedKey, row.EncryptedPayload = encrypted.KeyID, encrypted.WrappedKey, encrypted.Payload
	return row, current, previous, keys
}

func TestMigratedCipherScopePreservesReadAndRotation(t *testing.T) {
	row, current, previous, keys := migratedFixture(t)
	stored, err := cipherScope(row, current)
	if err != nil || stored != previous {
		t.Fatal("deterministic migration binding failed", err)
	}
	plain, err := keys.Open(row.ID, stored, envelope(row))
	if err != nil || string(plain) != "synthetic preserved access" {
		t.Fatal("historical ciphertext inaccessible", err)
	}
	clear(plain)
	rotating, err := NewKeyring("new", map[string][]byte{"old": bytes.Repeat([]byte{1}, 32), "new": bytes.Repeat([]byte{2}, 32)})
	if err != nil {
		t.Fatal(err)
	}
	rotated, err := rotating.Rewrap(row.ID, stored, envelope(row))
	if err != nil || !bytes.Equal(rotated.Payload, row.EncryptedPayload) {
		t.Fatal("migration rotation changed ciphertext", err)
	}
	plain, err = rotating.Open(row.ID, stored, rotated)
	if err != nil || string(plain) != "synthetic preserved access" {
		t.Fatal("rotated migration ciphertext inaccessible", err)
	}
	clear(plain)
	// Replacement uses the logical scope and drops the compatibility marker.
	fresh, err := rotating.Seal(row.ID, current, []byte("synthetic replacement"))
	if err != nil {
		t.Fatal(err)
	}
	row.CipherOwnerID = ""
	stored, err = cipherScope(row, current)
	if err != nil || stored != current {
		t.Fatal("replacement retained legacy binding", err)
	}
	plain, err = rotating.Open(row.ID, stored, fresh)
	if err != nil || string(plain) != "synthetic replacement" {
		t.Fatal("replacement logical binding failed", err)
	}
	clear(plain)
	if _, err = rotating.Open(row.ID, previous, fresh); !errors.Is(err, ErrUnavailable) {
		t.Fatal("replacement accepted historical owner", err)
	}
}

func TestMigratedCipherScopeRejectsSubstitution(t *testing.T) {
	cases := map[string]func(*ent.SecretBundle, *Scope){
		"caller owner":               func(_ *ent.SecretBundle, scope *Scope) { scope.OwnerID = scope.ResourceID },
		"caller resource":            func(_ *ent.SecretBundle, scope *Scope) { scope.ResourceID = scope.OwnerID },
		"caller purpose":             func(_ *ent.SecretBundle, scope *Scope) { scope.Purpose = "account_transfer" },
		"record owner":               func(row *ent.SecretBundle, scope *Scope) { row.OwnerID = scope.ResourceID; scope.OwnerID = row.OwnerID },
		"malformed marker":           func(row *ent.SecretBundle, _ *Scope) { row.CipherOwnerID = "not-a-uuid" },
		"unrelated marker":           func(row *ent.SecretBundle, _ *Scope) { row.CipherOwnerID = row.ResourceID },
		"malformed record id":        func(row *ent.SecretBundle, _ *Scope) { row.ID = "not-a-uuid" },
		"record and caller resource": func(row *ent.SecretBundle, scope *Scope) { row.ResourceID = row.ID; scope.ResourceID = row.ID },
		"record and caller purpose": func(row *ent.SecretBundle, scope *Scope) {
			row.Purpose = secretbundle.PurposeAccountTransfer
			scope.Purpose = "account_transfer"
		},
		"record id":      func(row *ent.SecretBundle, _ *Scope) { row.ID = row.ResourceID },
		"ciphertext":     func(row *ent.SecretBundle, _ *Scope) { row.EncryptedPayload[0] ^= 1 },
		"wrapped key":    func(row *ent.SecretBundle, _ *Scope) { row.WrappedKey[0] ^= 1 },
		"marker removed": func(row *ent.SecretBundle, _ *Scope) { row.CipherOwnerID = "" },
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			row, scope, _, keys := migratedFixture(t)
			mutate(row, &scope)
			stored, err := cipherScope(row, scope)
			if err == nil {
				_, err = keys.Open(row.ID, stored, envelope(row))
			}
			if !errors.Is(err, ErrUnavailable) {
				t.Fatal("migration scope substitution accepted", err)
			}
		})
	}
}

func TestMigratedWriteRetriesKeepExactOriginalRequest(t *testing.T) {
	row, current, previous, _ := migratedFixture(t)
	auth, err := identity.New(ent.NewClient(), identity.Config{Key: bytes.Repeat([]byte{3}, 32), ProxyKey: "synthetic-vault-test-proxy-key-32-bytes", PublicOrigin: "http://example.test"}, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	store := &Store{auth: auth}
	expires := time.Date(2026, time.October, 9, 0, 0, 0, 0, time.UTC)
	key := "00000000-0000-4000-8000-000000000004"
	plain := []byte("synthetic historical request")
	original, err := store.writeDigest(previous, key, expires, plain)
	if err != nil {
		t.Fatal(err)
	}
	retried, err := store.retryDigest(row, current, key, expires, plain)
	if err != nil || retried != original {
		t.Fatal("unchanged migrated retry lost its original request binding", err)
	}
	for _, change := range []struct {
		key     string
		expires time.Time
		plain   []byte
	}{{key, expires, []byte("different request")}, {key, expires.Add(time.Hour), plain}, {row.ID, expires, plain}} {
		changed, retryErr := store.retryDigest(row, current, change.key, change.expires, change.plain)
		if retryErr != nil || changed == original {
			t.Fatal("changed migrated request accepted the historical digest", retryErr)
		}
	}
	row.CipherOwnerID = ""
	fresh, err := store.retryDigest(row, current, key, expires, plain)
	if err != nil || fresh == original {
		t.Fatal("fresh owner-bound request reused historical owner digest", err)
	}
}
