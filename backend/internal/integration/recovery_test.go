//go:build integration

package integration

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/recovery"
)

type recoveryObjects struct{ read func(string) ([]byte, error) }

func (o recoveryObjects) Get(_ context.Context, key string) ([]byte, error) { return o.read(key) }
func (recoveryObjects) Put(context.Context, string, []byte, string) error {
	return errors.New("capture wrote to source")
}
func (recoveryObjects) Delete(context.Context, string) error {
	return errors.New("capture deleted source")
}

func TestMediaRecoverySnapshotRemainsConsistentAcrossPagesAndConcurrentChanges(t *testing.T) {
	f := orderDB(t)
	data := []byte("synthetic private recovery image")
	sum := sha256.Sum256(data)
	checksum := hex.EncodeToString(sum[:])
	for i := 1; i <= 101; i++ {
		_, err := f.auth.client.MediaFile.Create().SetID(fmt.Sprintf("%08x-0000-4000-8000-000000000000", i)).
			SetUserID(f.buyer.User.ID).SetConversationID("").SetVisibility(mediafile.VisibilityPublic).
			SetRequestKey(uuid.NewString()).SetRequestHash(checksum).SetChecksum(checksum).
			SetSize(int64(len(data))).SetContentType("image/png").SetState(mediafile.StateReady).
			SetCleanChecksum(checksum).SetCleanSize(int64(len(data))).SetCleanContentType("image/png").
			SetExpiresAt(time.Now().Add(time.Hour)).Save(t.Context())
		if err != nil {
			t.Fatal(err)
		}
	}
	calls := 0
	objects := recoveryObjects{read: func(string) ([]byte, error) {
		calls++
		if calls == 1 {
			// A later committed metadata update must not affect page2 of this snapshot.
			executeSQL(t, f.auth.db, "UPDATE media_files SET state='deleted' WHERE id=?", "00000065-0000-4000-8000-000000000000")
		}
		return data, nil
	}}
	got, err := recovery.Capture(t.Context(), f.auth.db, objects, filepath.Join(t.TempDir(), "capture"))
	if err != nil || len(got.Entries) != 101 || calls != 101 {
		t.Fatal("capture lost historical page consistency", len(got.Entries), calls, err)
	}
	tso, err := strconv.ParseUint(got.TSO, 10, 64)
	if err != nil || tso == 0 {
		t.Fatal("missing exact TiDB timestamp", err)
	}
	// A fresh capture must now reflect the committed deletion, preserving no deleted object.
	calls = 1
	fresh, err := recovery.Capture(t.Context(), f.auth.db, objects, filepath.Join(t.TempDir(), "capture"))
	if err != nil || len(fresh.Entries) != 100 {
		t.Fatal("fresh snapshot retained deleted media", err)
	}
}
