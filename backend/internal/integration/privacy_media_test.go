//go:build integration

package integration

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

func TestPrivacyRealFileCleanupPreservesCaseEvidence(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	owner := privacyOwner(t, f)
	objects := mediaObjects(t, f.auth.client)
	files := media.New(f.auth.client, f.auth.service, objects, media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"})
	support := supportStore(f)
	thread, e := support.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Private retention qualification"})
	if e != nil {
		t.Fatal(e)
	}
	data := imageBytes(t)
	ids := make([]string, 0, 2)
	messages := make([]string, 0, 2)
	for range 2 {
		file, err := files.Create(ctx, f.buyer, false, mediaIntent(thread.ID, "public", data))
		if err != nil {
			t.Fatal(err)
		}
		if err = files.Upload(ctx, f.buyer, file.ID, false, data); err != nil {
			t.Fatal(err)
		}
		if _, err = files.Finalize(ctx, f.buyer, file.ID, false); err != nil {
			t.Fatal(err)
		}
		scanJob(t, files, file.ID)
		msg, err := support.Send(ctx, f.buyer, thread.ID, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Synthetic private image", Visibility: "public", Attachments: []string{file.ID}})
		if err != nil {
			t.Fatal(err)
		}
		if err = files.Remove(ctx, owner, file.ID, true); !errors.Is(err, media.ErrConflict) {
			t.Fatal("staff discarded bound evidence", err)
		}
		ids = append(ids, file.ID)
		messages = append(messages, msg.ID)
	}
	// Explicit case-event fixture identifies retained evidence without creating an active dispute.
	if _, e = f.auth.client.CaseEvent.Create().SetCaseID(uuid.NewString()).SetVersion(1).SetAction("closed").SetActorID(f.buyer.User.ID).SetActorRole("customer").SetNote("Retain cited evidence").SetMessageID(messages[1]).SetCreatedAt(time.Now()).Save(ctx); e != nil {
		t.Fatal(e)
	}
	executeSQL(t, f.auth.db, "UPDATE conversations SET state='resolved' WHERE id=?", thread.ID)
	executeSQL(t, f.auth.db, "UPDATE media_files SET expires_at=? WHERE user_id=?", time.Now().Add(-2*time.Hour), f.buyer.User.ID)
	// The real media store timestamps with the wall clock; advance the fixture beyond those writes.
	f.auth.clock.Store(time.Now().Add(time.Second).Unix())
	now := func() time.Time { return time.Unix(f.auth.clock.Load(), 0) }
	content := sitecontent.New(f.auth.client, f.auth.service, now)
	policy, e := content.Save(ctx, owner, "retention", sitecontent.Input{Data: retentionData(), Label: "cleanup-test", Publish: true})
	if e != nil {
		t.Fatal(e)
	}
	s := privacy.New(f.auth.client, f.auth.service, now)
	row, e := s.Request(ctx, f.buyer, privacy.RequestInput{PolicyID: policy.ReleaseID, Accept: true})
	if e != nil {
		t.Fatal(e)
	}
	for _, action := range []string{"review", "erase"} {
		row, e = s.Update(ctx, owner, row.ID, true, privacy.Change{Version: row.Version, Action: action, PolicyID: policy.ReleaseID})
		if e != nil {
			t.Fatal(action, e)
		}
	}
	if _, e = s.Update(ctx, owner, row.ID, true, privacy.Change{Version: row.Version, Action: "finalize"}); !errors.Is(e, privacy.ErrConflict) {
		t.Fatal("unpurged files marked complete", e)
	}
	if e = files.Cleanup(ctx); e != nil {
		t.Fatal(e)
	}
	if _, e = objects.Get(ctx, "clean/"+ids[0]); e == nil {
		t.Fatal("ordinary private image retained")
	}
	if _, e = objects.Get(ctx, "clean/"+ids[1]); e != nil {
		t.Fatal("cited case image destroyed", e)
	}
	first, e := f.auth.client.ConversationMessage.Get(ctx, messages[0])
	if e != nil || len(first.Attachments) != 0 || !strings.Contains(first.Body, "Removed") {
		t.Fatal("ordinary support retained", e)
	}
	evidence, e := f.auth.client.ConversationMessage.Get(ctx, messages[1])
	if e != nil || len(evidence.Attachments) != 1 || evidence.Body != "Synthetic private image" {
		t.Fatal("case citation redacted", e)
	}
	row, e = s.Update(ctx, owner, row.ID, true, privacy.Change{Version: row.Version, Action: "finalize"})
	if e != nil || row.State != "completed" {
		t.Fatal("confirmed cleanup not completed", e)
	}
}

func TestStaffMediaDirectoryRetryAndRemovalAuthority(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	files := media.New(f.auth.client, f.auth.service, mediaObjects(t, f.auth.client), media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"})
	thread, e := supportStore(f).Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Scan recovery qualification"})
	if e != nil {
		t.Fatal(e)
	}
	data := imageBytes(t)
	file, e := files.Create(ctx, f.buyer, false, mediaIntent(thread.ID, "public", data))
	if e != nil {
		t.Fatal(e)
	}
	if e = files.Upload(ctx, f.buyer, file.ID, false, data); e != nil {
		t.Fatal(e)
	}
	if _, e = files.Finalize(ctx, f.buyer, file.ID, false); e != nil {
		t.Fatal(e)
	}
	executeSQL(t, f.auth.db, "UPDATE jobs SET state='failed', attempts=10 WHERE kind='media.scan' AND idempotency_key=?", "media:"+file.ID)
	if e = files.Retry(ctx, f.other, file.ID, false); !ent.IsNotFound(e) {
		t.Fatal("foreign retry", e)
	}
	if e = files.Retry(ctx, f.admin, file.ID, true); e != nil {
		t.Fatal("staff retry", e)
	}
	if e = files.Retry(ctx, f.admin, file.ID, true); !errors.Is(e, media.ErrConflict) {
		t.Fatal("repeated retry", e)
	}
	if e = files.Remove(ctx, f.other, file.ID, false); !ent.IsNotFound(e) {
		t.Fatal("foreign removal", e)
	}
	if e = files.Remove(ctx, f.admin, file.ID, true); e != nil {
		t.Fatal("staff removal", e)
	}
	stored, e := f.auth.client.MediaFile.Get(ctx, file.ID)
	if e != nil || stored.State != mediafile.StateDeleted {
		t.Fatal("discard not persisted", e)
	}
	n, e := f.auth.client.AuthAudit.Query().Where(authaudit.ActorIDEQ(f.admin.User.ID), authaudit.ActionIn("media_scan_retry", "media_discarded")).Count(ctx)
	if e != nil || n != 2 {
		t.Fatal("media administration unaudited", e)
	}
}
