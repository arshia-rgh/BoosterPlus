package vault

import (
	"bytes"
	"crypto/rand"
	"errors"
	"testing"
)

func TestEnvelopeRotationAndTampering(t *testing.T) {
	firstKey := make([]byte, 32)
	nextKey := make([]byte, 32)
	if _, err := rand.Read(firstKey); err != nil {
		t.Fatal(err)
	}
	if _, err := rand.Read(nextKey); err != nil {
		t.Fatal(err)
	}
	old, err := NewKeyring("v1", map[string][]byte{"v1": firstKey})
	if err != nil {
		t.Fatal(err)
	}
	current, err := NewKeyring("v2", map[string][]byte{"v1": firstKey, "v2": nextKey})
	if err != nil {
		t.Fatal(err)
	}
	scope := Scope{"game_access", "00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"}
	id := "00000000-0000-4000-8000-000000000003"
	plaintext := []byte("synthetic game access for encryption qualification")
	sealed, err := old.Seal(id, scope, plaintext)
	if err != nil {
		t.Fatal(err)
	}
	other, err := old.Seal(id, scope, plaintext)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Equal(sealed.Payload, other.Payload) || bytes.Equal(sealed.WrappedKey, other.WrappedKey) || bytes.Contains(sealed.Payload, plaintext) {
		t.Fatal("encryption or nonce reuse")
	}
	opened, err := old.Open(id, scope, sealed)
	if err != nil || !bytes.Equal(opened, plaintext) {
		t.Fatal("decrypt failed", err)
	}
	rotated, err := current.Rewrap(id, scope, sealed)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(rotated.Payload, sealed.Payload) || bytes.Equal(rotated.WrappedKey, sealed.WrappedKey) || rotated.KeyID != "v2" {
		t.Fatal("rotation rewrote payload or retained wrapping")
	}
	onlyNew, err := NewKeyring("v2", map[string][]byte{"v2": nextKey})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = onlyNew.Open(id, scope, sealed); !errors.Is(err, ErrUnavailable) {
		t.Fatal("missing old key accepted")
	}
	opened, err = onlyNew.Open(id, scope, rotated)
	if err != nil || !bytes.Equal(opened, plaintext) {
		t.Fatal("rotated decrypt failed", err)
	}
	for _, alter := range []func(*Scope, *Envelope){
		func(s *Scope, _ *Envelope) { s.Purpose = "account_transfer" },
		func(s *Scope, _ *Envelope) { s.ResourceID = s.OwnerID },
		func(s *Scope, _ *Envelope) { s.OwnerID = s.ResourceID },
		func(_ *Scope, e *Envelope) { e.KeyID = "v2" },
		func(_ *Scope, e *Envelope) { e.Payload[0] ^= 1 },
		func(_ *Scope, e *Envelope) { e.WrappedKey[0] ^= 1 },
	} {
		s, e := scope, Envelope{sealed.KeyID, bytes.Clone(sealed.WrappedKey), bytes.Clone(sealed.Payload)}
		alter(&s, &e)
		if _, err = current.Open(id, s, e); !errors.Is(err, ErrUnavailable) {
			t.Fatal("tamper accepted", err)
		}
	}
	if _, err = old.Seal(id, scope, make([]byte, MaxBytes+1)); !errors.Is(err, ErrInvalid) {
		t.Fatal("unbounded secret accepted")
	}
}
