//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
)

func intakeOrderDB(t *testing.T) *orderFixture {
	t.Helper()
	f := orderDB(t)
	c := f.game.Configuration
	c.Services[0].Fields = append(c.Services[0].Fields, catalog.Field{Key: "screenshot", Label: "Rank screenshot", Type: "attachment", Stage: "order"})
	var err error
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "publish", catalog.Change{Revision: f.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	return f
}
func screenshotAnswer(t *testing.T, id string) json.RawMessage {
	t.Helper()
	raw, err := json.Marshal([]string{id})
	if err != nil {
		t.Fatal(err)
	}
	return raw
}
func TestOrderIntakeMediaPrivateDraftAndAtomicSubmission(t *testing.T) {
	f := intakeOrderDB(t)
	ctx := t.Context()
	objects := mediaObjects(t, f.auth.client)
	store := media.New(f.auth.client, f.auth.service, objects, media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"})
	_, booster := f.auth.staffLogin(t, "screenshotbooster@example.test", identity.RoleBooster)
	_, _, booster = f.auth.enroll(t, booster)
	input := f.input("custom")
	data := imageBytes(t)
	intent := mediaIntent("", "public", data)
	intent.IntakeKey = input.RequestKey
	file, err := store.Create(ctx, f.buyer, false, intent)
	if err != nil {
		t.Fatal(err)
	}
	if duplicate, e := store.Create(ctx, f.buyer, false, intent); e != nil || duplicate.ID != file.ID {
		t.Fatal("duplicate upload intent", e)
	}
	if _, err = store.Create(ctx, f.admin, true, intent); err == nil {
		t.Fatal("staff created customer intake")
	}
	if _, err = store.Get(ctx, f.admin, file.ID, true); !ent.IsNotFound(err) {
		t.Fatal("private draft visible to staff", err)
	}
	if _, err = store.Get(ctx, f.other, file.ID, false); !ent.IsNotFound(err) {
		t.Fatal("private draft visible to another customer", err)
	}
	input.Answers["screenshot"] = screenshotAnswer(t, file.ID)
	var invalid *orders.Invalid
	if _, err = f.store.Create(ctx, f.buyer, input); !errors.As(err, &invalid) {
		t.Fatal("unscanned file accepted", err)
	}
	if err = store.Upload(ctx, f.buyer, file.ID, false, data); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Finalize(ctx, f.buyer, file.ID, false); err != nil {
		t.Fatal(err)
	}
	scanJob(t, store, file.ID)
	wrong := input
	wrong.RequestKey = uuid.NewString()
	if _, err = f.store.Create(ctx, f.buyer, wrong); !errors.As(err, &invalid) {
		t.Fatal("cross-request file accepted", err)
	}
	if _, err = f.store.Create(ctx, f.other, input); !errors.As(err, &invalid) {
		t.Fatal("cross-customer file accepted", err)
	}
	badTerms := input
	badTerms.AcceptTerms = false
	if _, err = f.store.Create(ctx, f.buyer, badTerms); err == nil {
		t.Fatal("missing consent accepted")
	}
	row, err := f.auth.client.MediaFile.Get(ctx, file.ID)
	if err != nil || row.IntakeOrderID != nil {
		t.Fatal("failed order bound draft", err)
	}
	var wg sync.WaitGroup
	for range 3 {
		wg.Go(func() {
			if _, e := f.store.Create(ctx, f.buyer, input); e != nil {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	detail, err := f.store.Create(ctx, f.buyer, input)
	if err != nil {
		t.Fatal(err)
	}
	row, err = f.auth.client.MediaFile.Get(ctx, file.ID)
	if err != nil || row.IntakeOrderID == nil || *row.IntakeOrderID != detail.Order.ID {
		t.Fatal("order did not bind ready file", err)
	}
	directory, directoryErr := store.Directory(ctx, f.admin, "", f.buyer.User.ID, "ready")
	if directoryErr != nil || len(directory.Files) != 1 || directory.Files[0].OrderID != detail.Order.ID || !directory.Files[0].Bound {
		t.Fatal("staff intake source projection", directoryErr)
	}
	if _, directoryErr = store.Directory(ctx, f.buyer, "", "", ""); directoryErr == nil {
		t.Fatal("customer accessed staff media directory")
	}
	if _, err = store.Grant(ctx, f.admin, file.ID, true); err != nil {
		t.Fatal("staff cannot inspect submitted screenshot", err)
	}
	if _, err = store.Grant(ctx, f.other, file.ID, false); !ent.IsNotFound(err) {
		t.Fatal("another customer can inspect screenshot", err)
	}
	if _, err = store.Grant(ctx, booster, file.ID, false); !ent.IsNotFound(err) {
		t.Fatal("booster accessed private order screenshot", err)
	}
	if _, err = store.Create(ctx, booster, false, intent); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("booster created customer intake", err)
	}
	exports := privacy.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
	page, exportErr := exports.Export(ctx, f.buyer, privacy.ExportInput{Section: "media"})
	if exportErr != nil || len(page.Records) != 1 || page.Records[0]["intake_order_id"] != detail.Order.ID {
		t.Fatal("intake export missing order association", exportErr)
	}
	for _, private := range []string{"checksum", "clean_checksum", "intake_key", "request_hash"} {
		if _, found := page.Records[0][private]; found {
			t.Fatal("private upload internals exported")
		}
	}
	foreign, exportErr := exports.Export(ctx, f.other, privacy.ExportInput{Section: "media"})
	if exportErr != nil || len(foreign.Records) != 0 {
		t.Fatal("another customer exported intake metadata", exportErr)
	}
	if err = store.Remove(ctx, f.buyer, file.ID, false); !errors.Is(err, media.ErrConflict) {
		t.Fatal("submitted screenshot erased by draft endpoint", err)
	}
	if _, err = f.store.Create(ctx, f.buyer, wrong); !errors.As(err, &invalid) {
		t.Fatal("submitted file rebound", err)
	}
	// Existing order evidence survives its original draft expiry and can stay in
	// a revision; a new request/reorder must upload its own image.
	if _, err = f.auth.client.ExecContext(ctx, "UPDATE media_files SET expires_at=? WHERE id=?", time.Now().Add(-time.Hour), file.ID); err != nil {
		t.Fatal(err)
	}
	revised, err := f.store.Revise(ctx, f.buyer, detail.Order.ID, orders.Revision{Version: detail.Order.Version, Answers: input.Answers})
	if err != nil || revised.Order.State != "submitted" {
		t.Fatal("retained screenshot revision", err)
	}
	prepared, err := f.store.Reorder(ctx, f.buyer, detail.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, exists := prepared.Answers["screenshot"]; exists {
		t.Fatal("reorder retained private file")
	}
	// Use the real clock for worker checks; make only the discarded draft expired.
	discardedIntent := mediaIntent("", "public", data)
	discardedIntent.IntakeKey = uuid.NewString()
	discarded, err := store.Create(ctx, f.buyer, false, discardedIntent)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.client.ExecContext(ctx, "UPDATE media_files SET expires_at=? WHERE id IN (?,?)", time.Now().Add(-time.Hour), file.ID, discarded.ID); err != nil {
		t.Fatal(err)
	}
	if err = store.Cleanup(ctx); err != nil {
		t.Fatal(err)
	}
	kept, err := f.auth.client.MediaFile.Get(ctx, file.ID)
	if err != nil || kept.State != mediafile.StateReady {
		t.Fatal("bound intake expired as draft", err)
	}
	removed, err := f.auth.client.MediaFile.Get(ctx, discarded.ID)
	if err != nil || removed.State != mediafile.StateDeleted {
		t.Fatal("abandoned intake not expired", err)
	}
}

func TestOrderIntakeMediaExplicitMigration(t *testing.T) {
	db := testDB(t)
	ctx := t.Context()
	r := runner(t, db)
	if err := r.Apply(ctx, 29); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("old schema accepted")
	}
	if err := r.Apply(ctx, 30); err != nil {
		t.Fatal(err)
	}
	if err := r.Verify(ctx); err != nil {
		t.Fatal("intake migration journal", err)
	}
	var scope string
	if err := db.QueryRowContext(ctx, "SELECT column_default FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='media_files' AND column_name='intake_key'").Scan(&scope); err != nil || scope != "" {
		t.Fatal("historical conversation scope changed", err)
	}
	for _, key := range []string{"", "7244c7b1-9e72-49bb-9af4-e2a5f9f36449"} {
		_, err := db.ExecContext(ctx, "INSERT INTO media_files(id,user_id,conversation_id,visibility,request_key,request_hash,checksum,size,content_type,state,expires_at,created_at,updated_at,intake_key) VALUES(?,?,?,?,?,?,?,?,?,'ready',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)", uuid.NewString(), "synthetic-user", "synthetic-thread", "public", uuid.NewString(), "synthetic-digest", "synthetic-checksum", 1, "image/png", key)
		if err != nil {
			t.Fatal(err)
		}
	}
	if err := r.Down(ctx, 1); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("rollback accepted")
	}
	var live, revoked int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM media_files WHERE state='ready'").Scan(&live); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM media_files WHERE state='deleted' AND purged_at IS NULL").Scan(&revoked); err != nil {
		t.Fatal(err)
	}
	if live != 1 || revoked != 1 {
		t.Fatal("rollback must revoke intake while preserving conversation attachments")
	}

	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err != nil {
		t.Fatal(err)
	}
	executeSQL(t, db, "DROP INDEX media_intake_scope ON media_files")
	executeSQL(t, db, "ALTER TABLE media_files DROP COLUMN intake_key")
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("missing media authorization scope accepted")
	}
}
