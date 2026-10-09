package vault

import (
	"encoding/json"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// cipherScope admits exactly the deterministic customer split performed by
// migration 41. The caller's live authorization always uses the logical owner;
// only envelope authentication uses the original owner. Arbitrary aliases,
// altered purposes/resources and a marker on an unrelated owner fail closed.
func cipherScope(row *ent.SecretBundle, scope Scope) (Scope, error) {
	if row == nil || row.OwnerID != scope.OwnerID || row.ResourceID != scope.ResourceID || string(row.Purpose) != scope.Purpose {
		return Scope{}, ErrUnavailable
	}
	if _, err := scope.aad(row.ID); err != nil {
		return Scope{}, ErrUnavailable
	}
	if row.CipherOwnerID == "" {
		return scope, nil
	}
	owner, err := identity.LegacyCustomerID(row.CipherOwnerID)
	if err != nil || owner != scope.OwnerID {
		return Scope{}, ErrUnavailable
	}
	scope.OwnerID = row.CipherOwnerID
	return scope, nil
}

func (s *Store) writeDigest(scope Scope, requestKey string, expires time.Time, plaintext []byte) (string, error) {
	raw, err := json.Marshal(struct {
		Scope  Scope
		Key    string
		Expiry time.Time
		Data   []byte
	}{scope, requestKey, expires.UTC(), plaintext})
	if err != nil {
		return "", ErrInvalid
	}
	defer clear(raw)
	return s.auth.RequestDigest("vault-write", raw), nil
}

func (s *Store) retryDigest(row *ent.SecretBundle, scope Scope, requestKey string, expires time.Time, plaintext []byte) (string, error) {
	storedScope, err := cipherScope(row, scope)
	if err != nil {
		return "", err
	}
	return s.writeDigest(storedScope, requestKey, expires, plaintext)
}
