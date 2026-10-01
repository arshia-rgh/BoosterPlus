//go:build integration

package integration

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
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
	firstDirectory := filepath.Join(t.TempDir(), "capture")
	got, err := recovery.Capture(t.Context(), f.auth.db, objects, firstDirectory)
	if err != nil || len(got.Entries) != 101 || calls != 101 {
		t.Fatal("capture lost historical page consistency", len(got.Entries), calls, err)
	}
	tso, err := strconv.ParseUint(got.TSO, 10, 64)
	if err != nil || tso == 0 {
		t.Fatal("missing exact TiDB timestamp", err)
	}
	// A fresh capture must now reflect the committed deletion, preserving no deleted object.
	calls = 1
	freshDirectory := filepath.Join(t.TempDir(), "capture")
	fresh, err := recovery.Capture(t.Context(), f.auth.db, objects, freshDirectory)
	if err != nil || len(fresh.Entries) != 100 {
		t.Fatal("fresh snapshot retained deleted media", err)
	}
	restored := mediaObjects(t, f.auth.client)
	if _, err = recovery.RestoreMedia(t.Context(), f.auth.db, restored, firstDirectory); err == nil {
		t.Fatal("SQL/media checkpoint mismatch accepted")
	}
	name := filepath.Join(freshDirectory, "clean", fresh.Entries[0].ID)
	if err = os.WriteFile(name, []byte("corrupted archive"), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err = recovery.RestoreMedia(t.Context(), f.auth.db, restored, freshDirectory); err == nil {
		t.Fatal("corrupt archive imported")
	}
	if err = os.WriteFile(name, data, 0o600); err != nil {
		t.Fatal(err)
	}
	count, err := recovery.RestoreMedia(t.Context(), f.auth.db, restored, freshDirectory)
	if err != nil || count != 100 {
		t.Fatal("exact SQL/media restoration failed", count, err)
	}
	count, err = recovery.RestoreMedia(t.Context(), f.auth.db, restored, freshDirectory)
	if err != nil || count != 100 {
		t.Fatal("idempotent import failed", count, err)
	}
}

func TestRestoredAuthenticationIsSealedWithoutRemovingMFAOrOrders(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	enrolled, enrollmentErr := f.auth.client.User.Get(ctx, f.admin.User.ID)
	if enrollmentErr != nil || len(enrolled.MfaRecoveryHashes) == 0 {
		t.Fatal("fixture lacks single-use staff recovery codes", enrollmentErr)
	}
	var sessionsBefore int
	if err := f.auth.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM auth_sessions WHERE revoked_at IS NULL").Scan(&sessionsBefore); err != nil || sessionsBefore == 0 {
		t.Fatal("fixture lacks live authentication", err)
	}
	var usersBefore, ordersBefore int
	if err := f.auth.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&usersBefore); err != nil {
		t.Fatal(err)
	}
	if err := f.auth.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM orders").Scan(&ordersBefore); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err := recovery.SealSessions(ctx, f.auth.db); err != nil {
			t.Fatal(err)
		}
	}
	for _, query := range []string{
		"SELECT COUNT(*) FROM auth_sessions WHERE revoked_at IS NULL",
		"SELECT COUNT(*) FROM auth_challenges WHERE consumed=FALSE",
		"SELECT COUNT(*) FROM auth_flows",
		"SELECT COUNT(*) FROM auth_messages WHERE encrypted_payload IS NOT NULL",
		"SELECT COUNT(*) FROM auth_recoveries WHERE state='pending'",
	} {
		var count int
		if err := f.auth.db.QueryRowContext(ctx, query).Scan(&count); err != nil || count != 0 {
			t.Fatal("restored authentication remains usable", err)
		}
	}
	var usersAfter, ordersAfter int
	if err := f.auth.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&usersAfter); err != nil {
		t.Fatal(err)
	}
	if err := f.auth.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM orders").Scan(&ordersAfter); err != nil {
		t.Fatal(err)
	}
	if usersAfter != usersBefore || ordersAfter != ordersBefore {
		t.Fatal("sealing changed business record counts")
	}
	owner, err := f.auth.client.User.Get(ctx, f.admin.User.ID)
	if err != nil || !owner.MfaEnabled || len(owner.MfaSecret) == 0 || len(owner.MfaRecoveryHashes) != 0 {
		t.Fatal("restore must preserve authenticator enrollment and invalidate old recovery codes", err)
	}
}
