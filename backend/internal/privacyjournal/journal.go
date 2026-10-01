// Package privacyjournal stores bounded authenticated erasure evidence off-host.
package privacyjournal

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

// Objects is deliberately append-only: runtime has no enumeration or deletion.
type Objects interface {
	Create(context.Context, string, []byte) error
	Read(context.Context, string) ([]byte, error)
}

// Entry contains only recovery identifiers, never email or hold-reason content.
type Entry struct {
	Version int       `json:"version"`
	Project string    `json:"project"`
	Request string    `json:"request"`
	User    string    `json:"user"`
	Action  string    `json:"action"`
	At      time.Time `json:"at"`
}

// Journal encrypts each opaque object separately with project/key binding.
type Journal struct {
	objects Objects
	aead    cipher.AEAD
	project string
}

// New requires an independently escrowed 256-bit key and installation identity.
func New(objects Objects, key, project string) (*Journal, error) {
	raw, err := hex.DecodeString(key)
	if err != nil || len(raw) != 32 || len(project) < 1 || len(project) > 80 || objects == nil {
		return nil, errors.New("privacy recovery configuration invalid")
	}
	block, err := aes.NewCipher(raw)
	if err != nil {
		return nil, errors.New("privacy recovery cipher unavailable")
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, errors.New("privacy recovery cipher unavailable")
	}
	return &Journal{objects: objects, aead: aead, project: project}, nil
}

func validID(value string) bool {
	id, err := uuid.Parse(value)
	return err == nil && id.String() == value
}

// Decode validates authenticated evidence before any restoration mutation.
func (j *Journal) Decode(key string, data []byte) (Entry, error) {
	var entry Entry
	if !validID(key) || len(data) > 4096 || len(data) < j.aead.NonceSize()+j.aead.Overhead() {
		return entry, errors.New("invalid privacy recovery object")
	}
	raw, err := j.aead.Open(nil, data[:j.aead.NonceSize()], data[j.aead.NonceSize():], []byte(j.project+":"+key))
	if err != nil {
		return entry, errors.New("privacy recovery authentication failed")
	}
	if err = json.Unmarshal(raw, &entry); err != nil || entry.Version != 1 || entry.Project != j.project || !validID(entry.Request) || !validID(entry.User) || entry.At.IsZero() || entry.At.After(time.Now().Add(time.Minute)) || (entry.Action != "erased" && entry.Action != "hold" && entry.Action != "erase_intent") {
		return Entry{}, errors.New("invalid privacy recovery evidence")
	}
	return entry, nil
}

// Record verifies stored ciphertext by readback before acknowledging durability.
// Fresh opaque keys prevent a retry from overwriting earlier evidence.
func (j *Journal) Record(ctx context.Context, request, user, action string) error {
	key := uuid.NewString()
	entry := Entry{Version: 1, Project: j.project, Request: request, User: user, Action: action, At: time.Now().UTC()}
	raw, err := json.Marshal(entry)
	if err != nil {
		return errors.New("privacy recovery encoding failed")
	}
	nonce := make([]byte, j.aead.NonceSize())
	if _, err = rand.Read(nonce); err != nil {
		return errors.New("privacy recovery randomness unavailable")
	}
	encrypted := j.aead.Seal(nonce, nonce, raw, []byte(j.project+":"+key))
	if _, err = j.Decode(key, encrypted); err != nil {
		return err
	}
	if err = j.objects.Create(ctx, key, encrypted); err != nil {
		return errors.New("privacy recovery write unavailable")
	}
	stored, err := j.objects.Read(ctx, key)
	if err != nil || !bytes.Equal(encrypted, stored) {
		return errors.New("privacy recovery readback failed")
	}
	return nil
}
