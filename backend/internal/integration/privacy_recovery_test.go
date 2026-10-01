//go:build integration

package integration

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacyjournal"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

type recoveryJournal struct {
	fail    bool
	actions []string
}

func (j *recoveryJournal) Record(_ context.Context, _, _, action string) error {
	if j.fail {
		return errors.New("fixture off-host failure")
	}
	j.actions = append(j.actions, action)
	return nil
}
func TestPrivacyCompletionRequiresIndependentEvidence(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	owner := privacyOwner(t, f)
	now := func() time.Time { return time.Unix(f.auth.clock.Load(), 0) }
	content := sitecontent.New(f.auth.client, f.auth.service, now)
	policy, err := content.Save(ctx, owner, "retention", sitecontent.Input{Data: retentionData(), Label: "recovery-test", Publish: true})
	if err != nil {
		t.Fatal(err)
	}
	store := privacy.New(f.auth.client, f.auth.service, now).WithRecoveryJournal(nil)
	row, err := store.Request(ctx, f.buyer, privacy.RequestInput{PolicyID: policy.ReleaseID, Accept: true})
	if err != nil {
		t.Fatal(err)
	}
	row, err = store.Update(ctx, owner, row.ID, true, privacy.Change{Version: row.Version, Action: "review", PolicyID: policy.ReleaseID})
	if err != nil {
		t.Fatal(err)
	}
	erase := privacy.Change{Version: row.Version, Action: "erase", PolicyID: policy.ReleaseID}
	if _, err = store.Update(ctx, owner, row.ID, true, erase); !errors.Is(err, privacy.ErrConflict) {
		t.Fatal("erasure without journal", err)
	}
	journal := &recoveryJournal{fail: true}
	store.WithRecoveryJournal(journal)
	if _, err = store.Update(ctx, owner, row.ID, true, erase); err == nil {
		t.Fatal("erasure despite failed intent")
	}
	target, err := f.auth.client.User.Get(ctx, f.buyer.User.ID)
	if err != nil || target.DeletedAt != nil {
		t.Fatal("failed journal erased account", err)
	}
	journal.fail = false
	row, err = store.Update(ctx, owner, row.ID, true, erase)
	if err != nil || row.State != "erased_pending_files" {
		t.Fatal(err)
	}
	journal.fail = true
	finish := privacy.Change{Version: row.Version, Action: "finalize"}
	if _, err = store.Update(ctx, owner, row.ID, true, finish); err == nil {
		t.Fatal("completion without independent erasure record")
	}
	journal.fail = false
	row, err = store.Update(ctx, owner, row.ID, true, finish)
	if err != nil || row.State != "completed" || len(journal.actions) != 2 || journal.actions[0] != "erase_intent" || journal.actions[1] != "erased" {
		t.Fatal("independent completion failed", err)
	}
}
func TestPrivacyRecoveryReappliesErasureConservatively(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	entries := []privacyjournal.Entry{{User: f.buyer.User.ID, Request: uuid.NewString(), Action: "erased"}, {User: f.other.User.ID, Request: uuid.NewString(), Action: "hold"}}
	for range 2 {
		if err := privacy.ReplayRecovery(ctx, f.auth.client, entries); err != nil {
			t.Fatal(err)
		}
	}
	target, err := f.auth.client.User.Get(ctx, f.buyer.User.ID)
	if err != nil || target.DeletedAt == nil || !target.Suspended {
		t.Fatal("erased customer resurrected", err)
	}
	held, err := f.auth.client.User.Get(ctx, f.other.User.ID)
	if err != nil || held.DeletedAt != nil || !held.Suspended {
		t.Fatal("hold must suspend without erasing", err)
	}
	if err = privacy.ReplayRecovery(ctx, f.auth.client, []privacyjournal.Entry{{User: f.admin.User.ID, Request: uuid.NewString(), Action: "erased"}}); err == nil {
		t.Fatal("staff erasure accepted")
	}
}
