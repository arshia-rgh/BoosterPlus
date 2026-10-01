package privacyjournal

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
)

type memoryObjects struct {
	values                       map[string][]byte
	failWrite, failRead, corrupt bool
}

func (m *memoryObjects) Create(_ context.Context, key string, data []byte) error {
	if m.failWrite {
		return errors.New("private endpoint diagnostic")
	}
	if _, ok := m.values[key]; ok {
		return errors.New("overwrite")
	}
	m.values[key] = bytes.Clone(data)
	return nil
}
func (m *memoryObjects) Read(_ context.Context, key string) ([]byte, error) {
	if m.failRead {
		return nil, errors.New("private endpoint diagnostic")
	}
	data := bytes.Clone(m.values[key])
	if m.corrupt && len(data) > 0 {
		data[0] ^= 1
	}
	return data, nil
}
func TestEncryptedJournalReadbackAndReplayBinding(t *testing.T) {
	t.Parallel()
	objects := &memoryObjects{values: map[string][]byte{}}
	journal, err := New(objects, strings.Repeat("12", 32), "boosterplus-fixture")
	if err != nil {
		t.Fatal(err)
	}
	request, user := uuid.NewString(), uuid.NewString()
	for _, action := range []string{"hold", "erase_intent", "erased"} {
		if err = journal.Record(t.Context(), request, user, action); err != nil {
			t.Fatal(err)
		}
	}
	nonces := map[string]bool{}
	for key, data := range objects.values {
		nonces[string(data[:12])] = true
		if bytes.Contains(data, []byte(user)) || bytes.Contains(data, []byte(request)) {
			t.Fatal("unencrypted recovery identifiers")
		}
		entry, decodeErr := journal.Decode(key, data)
		if decodeErr != nil || entry.User != user || entry.Request != request {
			t.Fatal("replay failed", decodeErr)
		}
		if _, decodeErr = journal.Decode(uuid.NewString(), data); decodeErr == nil {
			t.Fatal("key substitution accepted")
		}
		other, newErr := New(objects, strings.Repeat("12", 32), "boosterplus-other")
		if newErr != nil {
			t.Fatal(newErr)
		}
		if _, decodeErr = other.Decode(key, data); decodeErr == nil {
			t.Fatal("cross-installation replay accepted")
		}
		wrong, newErr := New(objects, strings.Repeat("34", 32), "boosterplus-fixture")
		if newErr != nil {
			t.Fatal(newErr)
		}
		if _, decodeErr = wrong.Decode(key, data); decodeErr == nil {
			t.Fatal("wrong recovery key accepted")
		}
	}
	if err = journal.Record(t.Context(), request, user, "erase_everything"); err == nil {
		t.Fatal("arbitrary action accepted")
	}
	if len(nonces) != 3 {
		t.Fatal("encryption reused a nonce")
	}
	if len(objects.values) != 3 {
		t.Fatal("invalid record wrote storage")
	}
}
func TestJournalFailuresNeverAcknowledgeDurability(t *testing.T) {
	t.Parallel()
	for _, scenario := range []string{"write", "read", "corrupt"} {
		objects := &memoryObjects{values: map[string][]byte{}, failWrite: scenario == "write", failRead: scenario == "read", corrupt: scenario == "corrupt"}
		journal, err := New(objects, strings.Repeat("12", 32), "boosterplus-fixture")
		if err != nil {
			t.Fatal(err)
		}
		err = journal.Record(t.Context(), uuid.NewString(), uuid.NewString(), "erased")
		if err == nil || strings.Contains(err.Error(), "diagnostic") {
			t.Fatal("false durability or private diagnostic", err)
		}
	}
}
