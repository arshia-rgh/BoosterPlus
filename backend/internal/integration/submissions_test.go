//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/notification"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/submissions"
)

type submissionFixture struct {
	*orderFixture
	intake *submissions.Store
	input  submissions.CreateInput
}

func submissionDB(t *testing.T) *submissionFixture {
	t.Helper()
	f := orderDB(t)
	c := catalogConfig()
	c.Services, c.Packages = nil, nil
	c.Intake = &catalog.IntakeForm{Name: "Account ownership review", Fields: []catalog.Field{{Key: "region", Label: "Account region", Type: "short_text", Stage: "order", Required: true, MaxLength: 80}}, Rules: []catalog.Rule{}}
	draft, err := f.catalog.Create(t.Context(), f.admin, "account-intake", c)
	if err != nil {
		t.Fatal(err)
	}
	draft, err = f.catalog.Mutate(t.Context(), f.admin, draft.ID, "publish", catalog.Change{Revision: draft.Revision})
	if err != nil {
		t.Fatal(err)
	}
	f.game = draft
	return &submissionFixture{f, submissions.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) }), submissions.CreateInput{RequestKey: uuid.NewString(), Slug: draft.Slug, ReleaseID: draft.CurrentRelease, Title: "Private synthetic account"}}
}
func (f *submissionFixture) createSubmission(t *testing.T) submissions.View {
	t.Helper()
	v, err := f.intake.Create(t.Context(), f.buyer, f.input)
	if err != nil {
		t.Fatal(err)
	}
	return v
}
func submissionEdit(v submissions.View) submissions.Edit {
	return submissions.Edit{Version: v.Submission.Version, Title: v.Submission.Title, Answers: catalog.Answers{"region": json.RawMessage(`"Synthetic region"`)}, OwnershipNotes: "I created and control this synthetic test account.", OwnershipDeclared: true}
}
func (f *submissionFixture) submit(t *testing.T, v submissions.View) submissions.View {
	t.Helper()
	v, err := f.intake.Edit(t.Context(), f.buyer, v.Submission.ID, submissionEdit(v))
	if err != nil {
		t.Fatal(err)
	}
	v, err = f.intake.Transition(t.Context(), f.buyer, v.Submission.ID, false, "submit", submissions.Action{Version: v.Submission.Version})
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func TestSubmissionPrivateLifecycleAndReview(t *testing.T) {
	f := submissionDB(t)
	ctx := t.Context()
	v := f.createSubmission(t)
	id := v.Submission.ID
	if v.Submission.State != "draft" || v.ConversationID == "" {
		t.Fatal("missing private draft/thread")
	}
	for _, admin := range []bool{false, true} {
		_, err := f.intake.Get(ctx, f.other, id, admin)
		if !admin && !ent.IsNotFound(err) || admin && !errors.Is(err, identity.ErrForbidden) {
			t.Fatal("foreign read", err)
		}
	}
	if _, err := f.intake.Events(ctx, f.other, id, false, 0); !ent.IsNotFound(err) {
		t.Fatal("foreign timeline", err)
	}
	list, err := f.intake.List(ctx, f.other, false, "", "")
	if err != nil || len(list.Items) != 0 {
		t.Fatal("foreign history", err)
	}
	if _, err = f.intake.Transition(ctx, f.buyer, id, false, "submit", submissions.Action{Version: v.Submission.Version}); err == nil {
		t.Fatal("incomplete submission accepted")
	}
	incomplete := submissionEdit(v)
	incomplete.Answers = catalog.Answers{}
	incomplete.OwnershipDeclared = false
	v, err = f.intake.Edit(ctx, f.buyer, id, incomplete)
	if err != nil {
		t.Fatal("incomplete draft rejected", err)
	}
	valid := submissionEdit(v)
	valid.OwnershipDeclared = false
	v, err = f.intake.Edit(ctx, f.buyer, id, valid)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.intake.Transition(ctx, f.buyer, id, false, "submit", submissions.Action{Version: v.Submission.Version}); err == nil {
		t.Fatal("undeclared authority accepted")
	}
	v = f.submit(t, v)
	if _, err = f.intake.Edit(ctx, f.buyer, id, submissionEdit(v)); !errors.Is(err, submissions.ErrConflict) {
		t.Fatal("submitted data silently changed", err)
	}
	if _, err = f.intake.Transition(ctx, f.buyer, id, true, "approve_review", submissions.Action{Version: v.Submission.Version, Note: "forged review"}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("seller approved review", err)
	}
	v, err = f.intake.Transition(ctx, f.admin, id, true, "clarify", submissions.Action{Version: v.Submission.Version, Note: "Explain ordinary ownership restrictions."})
	if err != nil || v.Submission.State != "needs_information" {
		t.Fatal(err)
	}
	v = f.submit(t, v)
	v, err = f.intake.Transition(ctx, f.admin, id, true, "approve_review", submissions.Action{Version: v.Submission.Version, Note: "Review complete; commercial terms remain pending."})
	if err != nil || v.Submission.State != "approved_pending_terms" {
		t.Fatal(err)
	}
	for _, action := range []string{"accept", "publish", "transfer", "payout", "settled"} {
		if _, err = f.intake.Transition(ctx, f.admin, id, true, action, submissions.Action{Version: v.Submission.Version, Note: "forged commercial action"}); !errors.Is(err, submissions.ErrInvalid) {
			t.Fatal("commercial action accepted", action, err)
		}
	}
	if count, e := f.auth.client.Order.Query().Count(ctx); e != nil || count != 0 {
		t.Fatal("review created order", e)
	}
	if count, e := f.auth.client.OrderContract.Query().Count(ctx); e != nil || count != 0 {
		t.Fatal("review created contract", e)
	}
	notices, err := f.auth.client.Notification.Query().Where(notification.UserIDEQ(f.buyer.User.ID), notification.KindEQ("submission_seller")).All(ctx)
	if err != nil || len(notices) != 2 {
		t.Fatal("missing seller notices", err)
	}
	events, err := f.intake.Events(ctx, f.buyer, id, false, 0)
	if err != nil || len(events) != v.Submission.Version {
		t.Fatal("incomplete lifecycle history", err)
	}
	for i, e := range events {
		if e.Version != i+1 || e.ActorRole != "seller" && e.ActorRole != "staff" {
			t.Fatal("invalid history")
		}
	}
	v, err = f.intake.Transition(ctx, f.buyer, id, false, "withdraw", submissions.Action{Version: v.Submission.Version})
	if err != nil || v.Submission.State != "withdrawn" {
		t.Fatal(err)
	}
	if _, err = f.intake.Transition(ctx, f.admin, id, true, "clarify", submissions.Action{Version: v.Submission.Version, Note: "reopen"}); !errors.Is(err, submissions.ErrConflict) {
		t.Fatal("withdrawn submission reopened", err)
	}
}

func TestSubmissionIdempotencyRacesAndAuthorization(t *testing.T) {
	f := submissionDB(t)
	ctx := t.Context()
	var wg sync.WaitGroup
	var ids sync.Map
	var wins atomic.Int64
	for range 4 {
		wg.Go(func() {
			v, e := f.intake.Create(ctx, f.buyer, f.input)
			if e != nil {
				t.Error(e)
				return
			}
			ids.Store(v.Submission.ID, true)
			wins.Add(1)
		})
	}
	wg.Wait()
	count := 0
	ids.Range(func(_, _ any) bool { count++; return true })
	if count != 1 || wins.Load() != 4 {
		t.Fatal("duplicate drafts", count, wins.Load())
	}
	v := f.createSubmission(t)
	changed := f.input
	changed.Title = "changed"
	if _, err := f.intake.Create(ctx, f.buyer, changed); !errors.Is(err, submissions.ErrConflict) {
		t.Fatal("retry payload changed", err)
	}
	wins.Store(0)
	for range 4 {
		wg.Go(func() {
			_, e := f.intake.Edit(ctx, f.buyer, v.Submission.ID, submissionEdit(v))
			if e == nil {
				wins.Add(1)
			} else if !errors.Is(e, submissions.ErrConflict) {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("stale edits committed", wins.Load())
	}
	var err error
	v, err = f.intake.Get(ctx, f.buyer, v.Submission.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	v = f.submit(t, v)
	now := time.Unix(f.auth.clock.Load(), 0)
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetAuthenticatedAt(now.Add(-11 * time.Minute)).SetMfaVerifiedAt(now.Add(-11 * time.Minute)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	action := submissions.Action{Version: v.Submission.Version, Note: "Review result"}
	if _, err = f.intake.Transition(ctx, f.admin, v.Submission.ID, true, "reject", action); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("two stale factors accepted", err)
	}
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetAuthenticatedAt(now).ClearMfaVerifiedAt().Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.intake.Transition(ctx, f.admin, v.Submission.ID, true, "reject", action); !errors.Is(err, identity.ErrMFA) {
		t.Fatal("incomplete MFA sign-in accepted", err)
	}
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetMfaVerifiedAt(now).Save(ctx); err != nil {
		t.Fatal(err)
	}
	wins.Store(0)
	for _, name := range []string{"reject", "approve_review"} {
		wg.Go(func() {
			_, e := f.intake.Transition(ctx, f.admin, v.Submission.ID, true, name, action)
			if e == nil {
				wins.Add(1)
			} else if !errors.Is(e, submissions.ErrConflict) {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("multiple review outcomes", wins.Load())
	}
	if _, err = f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.intake.Get(ctx, f.buyer, v.Submission.ID, false); err == nil {
		t.Fatal("suspended seller retained access")
	}
}

func TestSubmissionAuditRollbackAndPrivateConversation(t *testing.T) {
	f := submissionDB(t)
	ctx := t.Context()
	v := f.createSubmission(t)
	chat := supportStore(f.orderFixture)
	if _, err := chat.Get(ctx, f.other, v.ConversationID, false); !ent.IsNotFound(err) {
		t.Fatal("foreign review chat", err)
	}
	if _, err := chat.Send(ctx, f.admin, v.ConversationID, true, conversations.SendInput{RequestKey: uuid.NewString(), Visibility: "internal", Body: "Private staff review note"}); err != nil {
		t.Fatal(err)
	}
	history, err := chat.History(ctx, f.buyer, v.ConversationID, false, 0)
	if err != nil || len(history.Messages) != 0 {
		t.Fatal("internal note leaked", err)
	}
	enabled := true
	thread, err := chat.Get(ctx, f.admin, v.ConversationID, true)
	if err != nil {
		t.Fatal(err)
	}
	if thread.Kind != "submission" || thread.SubmissionID != v.Submission.ID {
		t.Fatal("wrong thread scope")
	}
	if _, err = chat.Change(ctx, f.admin, v.ConversationID, "sharing", conversations.Change{Version: thread.Version, BoosterShared: &enabled}); err == nil {
		t.Fatal("seller evidence shared with booster")
	}
	if _, err = chat.Send(ctx, f.admin, v.ConversationID, true, conversations.SendInput{RequestKey: uuid.NewString(), Visibility: "public", Purpose: "proof", Body: "forged fulfillment proof"}); err == nil {
		t.Fatal("intake became fulfillment proof")
	}
	v = f.submit(t, v)
	if _, err = f.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if _, err = f.intake.Transition(ctx, f.admin, v.Submission.ID, true, "reject", submissions.Action{Version: v.Submission.Version, Note: "Must roll back"}); err == nil {
		t.Fatal("unaudited review")
	}
	after, err := f.intake.Get(ctx, f.buyer, v.Submission.ID, false)
	if err != nil || after.Submission.Version != v.Submission.Version || after.Submission.State != "submitted" {
		t.Fatal("review rollback failed", err)
	}
	changed := f.input
	changed.RequestKey = uuid.NewString()
	if _, err = f.intake.Create(ctx, f.buyer, changed); err == nil {
		t.Fatal("unaudited draft")
	}
	if count, e := f.auth.client.AccountSubmission.Query().Count(ctx); e != nil || count != 1 {
		t.Fatal("draft rollback failed", e)
	}
	if count, e := f.auth.client.Conversation.Query().Count(ctx); e != nil || count != 1 {
		t.Fatal("thread rollback failed", e)
	}
	if count, e := f.auth.client.Notification.Query().Where(notification.KindEQ("submission_seller")).Count(ctx); e != nil || count != 0 {
		t.Fatal("notification rollback failed", e)
	}
}

func TestSubmissionPinnedFormQuotaAndPagination(t *testing.T) {
	f := submissionDB(t)
	ctx := t.Context()
	v := f.createSubmission(t)
	c := v.Offer.Configuration
	c.Intake = &catalog.IntakeForm{Name: "Changed intake", Fields: []catalog.Field{{Key: "new_required", Label: "New required attribute", Type: "short_text", Stage: "order", Required: true, MaxLength: 80}}}
	draft, err := f.catalog.Mutate(ctx, f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	draft, err = f.catalog.Mutate(ctx, f.admin, draft.ID, "publish", catalog.Change{Revision: draft.Revision})
	if err != nil {
		t.Fatal(err)
	}
	v = f.submit(t, v)
	if v.Offer.ID != f.input.ReleaseID || v.Offer.Configuration.Intake.Fields[0].Key != "region" {
		t.Fatal("published intake silently changed")
	}
	next := f.input
	next.RequestKey = uuid.NewString()
	if _, err = f.intake.Create(ctx, f.buyer, next); !errors.Is(err, submissions.ErrConflict) {
		t.Fatal("unseen release accepted", err)
	}
	next.ReleaseID = draft.CurrentRelease
	draft, err = f.catalog.Mutate(ctx, f.admin, draft.ID, "pause", catalog.Change{Revision: draft.Revision})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.intake.Create(ctx, f.buyer, next); !errors.Is(err, submissions.ErrConflict) {
		t.Fatal("paused intake accepted", err)
	}
	if retry, e := f.intake.Create(ctx, f.buyer, f.input); e != nil || retry.Submission.ID != v.Submission.ID {
		t.Fatal("committed retry lost after pause", e)
	}
	if _, err = f.catalog.Mutate(ctx, f.admin, draft.ID, "resume", catalog.Change{Revision: draft.Revision}); err != nil {
		t.Fatal(err)
	}
	for range 19 {
		next.RequestKey = uuid.NewString()
		if _, err = f.intake.Create(ctx, f.buyer, next); err != nil {
			t.Fatal(err)
		}
	}
	next.RequestKey = uuid.NewString()
	if _, err = f.intake.Create(ctx, f.buyer, next); !errors.Is(err, submissions.ErrConflict) {
		t.Fatal("active quota bypassed", err)
	}
	for range 33 {
		if _, err = f.intake.Transition(ctx, f.buyer, v.Submission.ID, false, "withdraw", submissions.Action{Version: v.Submission.Version}); err != nil {
			t.Fatal(err)
		}
		next.RequestKey = uuid.NewString()
		v, err = f.intake.Create(ctx, f.buyer, next)
		if err != nil {
			t.Fatal(err)
		}
	}
	first, err := f.intake.List(ctx, f.buyer, false, "", "")
	if err != nil || len(first.Items) != 50 || first.Next == "" {
		t.Fatal("bounded first page", err)
	}
	second, err := f.intake.List(ctx, f.buyer, false, first.Next, "")
	if err != nil || len(second.Items) != 3 || second.Next != "" {
		t.Fatal("bounded second page", err)
	}
	seen := map[string]bool{}
	for _, row := range append(first.Items, second.Items...) {
		if seen[row.ID] {
			t.Fatal("duplicate pagination")
		}
		seen[row.ID] = true
	}
	filtered, err := f.intake.List(ctx, f.admin, true, "", "withdrawn")
	if err != nil || len(filtered.Items) != 33 {
		t.Fatal("review state filter", err)
	}
	for _, cursor := range []string{"invalid", "%%%%"} {
		if _, err = f.intake.List(ctx, f.buyer, false, cursor, ""); !errors.Is(err, submissions.ErrInvalid) {
			t.Fatal("invalid cursor", err)
		}
	}
	if _, err = f.intake.List(ctx, f.buyer, false, "", "paid"); !errors.Is(err, submissions.ErrInvalid) {
		t.Fatal("unknown state", err)
	}
	events, err := f.intake.Events(ctx, f.buyer, v.Submission.ID, false, 1)
	if err != nil || len(events) != 0 {
		t.Fatal("history cursor", err)
	}
}

func TestSubmissionUnicodeAndInvalidDraftBounds(t *testing.T) {
	f := submissionDB(t)
	ctx := t.Context()
	f.input.Title = strings.Repeat("界", 120)
	v := f.createSubmission(t)
	if v.Submission.Title != f.input.Title {
		t.Fatal("unicode title changed")
	}
	input := submissionEdit(v)
	input.Title = strings.Repeat("界", 121)
	if _, err := f.intake.Edit(ctx, f.buyer, v.Submission.ID, input); !errors.Is(err, submissions.ErrInvalid) {
		t.Fatal("oversize title accepted", err)
	}
	input = submissionEdit(v)
	input.OwnershipNotes = strings.Repeat("界", 2001)
	if _, err := f.intake.Edit(ctx, f.buyer, v.Submission.ID, input); !errors.Is(err, submissions.ErrInvalid) {
		t.Fatal("oversize ownership notes", err)
	}
	input = submissionEdit(v)
	input.Answers["unknown"] = json.RawMessage(`"private"`)
	if _, err := f.intake.Edit(ctx, f.buyer, v.Submission.ID, input); err == nil {
		t.Fatal("unknown attribute accepted")
	}
	input = submissionEdit(v)
	input.Title = "hidden\x00value"
	if _, err := f.intake.Edit(ctx, f.buyer, v.Submission.ID, input); !errors.Is(err, submissions.ErrInvalid) {
		t.Fatal("NUL title accepted", err)
	}
	input = submissionEdit(v)
	input.Answers["region"] = json.RawMessage(`true`)
	if _, err := f.intake.Edit(ctx, f.buyer, v.Submission.ID, input); err == nil {
		t.Fatal("wrong attribute type accepted")
	}
	input = submissionEdit(v)
	input.OwnershipNotes = strings.Repeat("界", 2000)
	if _, err := f.intake.Edit(ctx, f.buyer, v.Submission.ID, input); err != nil {
		t.Fatal("bounded Unicode notes rejected", err)
	}
}

func TestSellerCosmeticsPinnedPrivateRoundTrip(t *testing.T) {
	f := submissionDB(t)
	ctx := t.Context()
	c := f.game.Configuration
	c.Intake.Fields = append(c.Intake.Fields, catalog.Field{Key: "skins", Label: "Skin collection", Type: "cosmetics", Stage: "order", Required: true, Options: []catalog.Option{{Key: "Collector", Label: "Collector"}}})
	saveArtworkGame(t, f.orderFixture, c, true)
	f.input.ReleaseID = f.game.CurrentRelease
	row := f.createSubmission(t)
	edit := submissionEdit(row)
	edit.Answers["skins"] = json.RawMessage(`{"groups":[{"category":"Collector","count":"2","names":["Aldous","Yu Zhong"]}]}`)
	saved, err := f.intake.Edit(ctx, f.buyer, row.Submission.ID, edit)
	if err != nil {
		t.Fatal(err)
	}
	read, err := f.intake.Get(ctx, f.admin, row.Submission.ID, true)
	if err != nil || string(read.Answers["skins"]) != string(saved.Answers["skins"]) {
		t.Fatal("structured private data changed", err)
	}
	bad := submissionEdit(saved)
	bad.Answers["skins"] = json.RawMessage(`{"groups":[{"category":"Collector","count":"3","names":["Aldous","Yu Zhong"]}]}`)
	if _, err = f.intake.Edit(ctx, f.buyer, row.Submission.ID, bad); err == nil {
		t.Fatal("mismatching quantity accepted")
	}
	c.Intake.Fields[1].Options = []catalog.Option{{Key: "Epic", Label: "Epic"}}
	saveArtworkGame(t, f.orderFixture, c, true)
	if _, err = f.intake.Transition(ctx, f.buyer, row.Submission.ID, false, "submit", submissions.Action{Version: saved.Submission.Version}); err != nil {
		t.Fatal("later categories rewrote pinned submission", err)
	}
	if _, err = f.intake.Get(ctx, f.other, row.Submission.ID, false); !ent.IsNotFound(err) {
		t.Fatal("another customer read cosmetics", err)
	}
}
