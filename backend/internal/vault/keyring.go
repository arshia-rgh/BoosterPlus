// Package vault provides encrypted, audited secret storage for explicit resource policies.
package vault

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/json"
	"errors"
	"regexp"

	"github.com/google/uuid"
)

// MaxBytes bounds a bundle of temporary game/account access instructions.
const MaxBytes = 8192

// ErrUnavailable deliberately excludes key identifiers, ciphertext and plaintext.
var ErrUnavailable = errors.New("protected secret unavailable")

// ErrInvalid rejects malformed secret metadata or oversized plaintext.
var ErrInvalid = errors.New("protected secret invalid")

var keyID = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,31}$`)

// Scope is authenticated as part of both encryption envelopes.
type Scope struct{ Purpose, ResourceID, OwnerID string }

func (s Scope) aad(id string) ([]byte, error) {
	for _, value := range []string{id, s.ResourceID, s.OwnerID} {
		parsed, err := uuid.Parse(value)
		if err != nil || parsed.String() != value {
			return nil, ErrInvalid
		}
	}
	if s.Purpose != "game_access" && s.Purpose != "account_transfer" && s.Purpose != "chat_form" {
		return nil, ErrInvalid
	}
	return json.Marshal([]string{"boosterplus-vault-v1", id, s.Purpose, s.ResourceID, s.OwnerID})
}

// Envelope uses an independently generated data key for every encryption.
type Envelope struct {
	KeyID               string
	WrappedKey, Payload []byte
}

// Keyring copies operator-provided keys and never exposes them through views.
type Keyring struct {
	active string
	keys   map[string][]byte
}

// NewKeyring requires an active version and at most four distinct AES-256 keys.
func NewKeyring(active string, keys map[string][]byte) (*Keyring, error) {
	if !keyID.MatchString(active) || len(keys) == 0 || len(keys) > 4 {
		return nil, ErrInvalid
	}
	copyKeys := map[string][]byte{}
	for id, key := range keys {
		if !keyID.MatchString(id) || len(key) != 32 {
			return nil, ErrInvalid
		}
		for _, existing := range copyKeys {
			if bytes.Equal(existing, key) {
				return nil, ErrInvalid
			}
		}
		copyKeys[id] = bytes.Clone(key)
	}
	if copyKeys[active] == nil {
		return nil, ErrInvalid
	}
	return &Keyring{active, copyKeys}, nil
}
func encrypt(key, data, aad []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, ErrUnavailable
	}
	aead, err := cipher.NewGCMWithRandomNonce(block)
	if err != nil {
		return nil, ErrUnavailable
	}
	// #nosec G407 -- NewGCMWithRandomNonce generates/prepends the nonce and requires a nil nonce argument.
	return aead.Seal(nil, nil, data, aad), nil
}
func decrypt(key, data, aad []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, ErrUnavailable
	}
	aead, err := cipher.NewGCMWithRandomNonce(block)
	if err != nil {
		return nil, ErrUnavailable
	}
	raw, err := aead.Open(nil, nil, data, aad)
	if err != nil {
		return nil, ErrUnavailable
	}
	return raw, nil
}

// Seal binds the encrypted payload and wrapped data key to the resource identity.
func (k *Keyring) Seal(id string, scope Scope, plaintext []byte) (Envelope, error) {
	if len(plaintext) < 1 || len(plaintext) > MaxBytes {
		return Envelope{}, ErrInvalid
	}
	aad, err := scope.aad(id)
	if err != nil {
		return Envelope{}, err
	}
	dataKey := make([]byte, 32)
	if _, err = rand.Read(dataKey); err != nil {
		return Envelope{}, ErrUnavailable
	}
	defer clear(dataKey)
	payload, err := encrypt(dataKey, plaintext, aad)
	if err != nil {
		return Envelope{}, err
	}
	wrapped, err := encrypt(k.keys[k.active], dataKey, append(aad, []byte("/key/"+k.active)...))
	if err != nil {
		return Envelope{}, err
	}
	return Envelope{k.active, wrapped, payload}, nil
}
func (k *Keyring) unwrap(id string, scope Scope, envelope Envelope) ([]byte, []byte, error) {
	aad, err := scope.aad(id)
	if err != nil {
		return nil, nil, err
	}
	if len(envelope.WrappedKey) != 60 || len(envelope.Payload) < 29 || len(envelope.Payload) > MaxBytes+28 {
		return nil, nil, ErrUnavailable
	}
	key, ok := k.keys[envelope.KeyID]
	if !ok {
		return nil, nil, ErrUnavailable
	}
	dataKey, err := decrypt(key, envelope.WrappedKey, append(bytes.Clone(aad), []byte("/key/"+envelope.KeyID)...))
	if err != nil || len(dataKey) != 32 {
		return nil, nil, ErrUnavailable
	}
	return dataKey, aad, nil
}

// Open is a cryptographic primitive; the Store performs live access checks first.
func (k *Keyring) Open(id string, scope Scope, envelope Envelope) ([]byte, error) {
	dataKey, aad, err := k.unwrap(id, scope, envelope)
	if err != nil {
		return nil, err
	}
	defer clear(dataKey)
	return decrypt(dataKey, envelope.Payload, aad)
}

// Rewrap rotates only the encrypted data key, without decrypting the payload.
func (k *Keyring) Rewrap(id string, scope Scope, envelope Envelope) (Envelope, error) {
	dataKey, aad, err := k.unwrap(id, scope, envelope)
	if err != nil {
		return Envelope{}, err
	}
	defer clear(dataKey)
	wrapped, err := encrypt(k.keys[k.active], dataKey, append(aad, []byte("/key/"+k.active)...))
	if err != nil {
		return Envelope{}, err
	}
	return Envelope{k.active, wrapped, bytes.Clone(envelope.Payload)}, nil
}
