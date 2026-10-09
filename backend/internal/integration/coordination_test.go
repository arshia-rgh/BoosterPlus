//go:build integration

package integration

import (
	"bufio"
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sync"
	"testing"
	"time"

	"github.com/pquerna/otp/totp"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/notification"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/orderevent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

func TestCoordinationPrivateScopesProofAndAssignment(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	chat := supportStore(f.orderFixture)
	v := f.assign(t, f.paid(t, "solo"))
	private, err := chat.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "order", OrderID: v.OrderID, Subject: "Private financial support"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = chat.Send(ctx, f.admin, private.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Private billing discussion", Visibility: "public"}); err != nil {
		t.Fatal(err)
	}
	thread, err := chat.OpenCoordination(ctx, f.admin, v.OrderID, v.Version)
	if err != nil {
		t.Fatal(err)
	}
	if thread.ID == private.ID || !thread.BoosterShared {
		t.Fatal("private support scope reused")
	}
	if _, err = chat.Get(ctx, f.booster, private.ID, false); !ent.IsNotFound(err) {
		t.Fatal("private support leaked", err)
	}
	if _, err = chat.Get(ctx, f.second, thread.ID, false); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("unassigned staff read", err)
	}
	if _, err = chat.Get(ctx, f.other, thread.ID, false); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("foreign customer read", err)
	}
	if _, err = chat.OpenCoordination(ctx, f.booster, v.OrderID, v.Version); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("booster enabled sharing", err)
	}
	if _, err = chat.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Internal coordination note", Visibility: "internal"}); err != nil {
		t.Fatal(err)
	}
	message, err := chat.Send(ctx, f.buyer, thread.ID, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Public coordination only", Visibility: "public"})
	if err != nil {
		t.Fatal(err)
	}
	history, err := chat.History(ctx, f.booster, thread.ID, false, 0)
	if err != nil || len(history.Messages) != 1 || history.Messages[0].ID != message.ID || history.Latest != 1 {
		t.Fatal("internal history leaked", err)
	}
	objects := mediaObjects(t, f.auth.client)
	files := media.New(f.auth.client, f.auth.service, objects, media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"})
	data := imageBytes(t)
	file, err := files.Create(ctx, f.booster, false, mediaIntent(thread.ID, "public", data))
	if err != nil {
		t.Fatal(err)
	}
	if err = files.Upload(ctx, f.booster, file.ID, false, data); err != nil {
		t.Fatal(err)
	}
	if _, err = files.Finalize(ctx, f.booster, file.ID, false); err != nil {
		t.Fatal(err)
	}
	scanJob(t, files, file.ID)
	input := conversations.SendInput{Purpose: "proof", RequestKey: uuid.NewString(), Body: "Synthetic rank proof", Visibility: "public", Attachments: []string{file.ID}}
	if _, err = chat.Send(ctx, f.buyer, thread.ID, false, input); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer published proof", err)
	}
	var wg sync.WaitGroup
	for range 3 {
		wg.Go(func() {
			if _, e := chat.Send(ctx, f.booster, thread.ID, false, input); e != nil {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	proof, err := chat.Send(ctx, f.booster, thread.ID, false, input)
	if err != nil || proof.Purpose != "proof" || proof.SenderID != "" || proof.SenderRole != "staff" {
		t.Fatal("proof response", err)
	}
	count, err := f.auth.client.OrderEvent.Query().Where(orderevent.OrderIDEQ(v.OrderID), orderevent.ActionEQ("proof_published")).Count(ctx)
	if err != nil || count != 1 {
		t.Fatal("duplicate proof timeline", count, err)
	}
	internal, err := files.Create(ctx, f.admin, true, mediaIntent(thread.ID, "internal", data))
	if err != nil {
		t.Fatal(err)
	}
	if err = files.Upload(ctx, f.admin, internal.ID, true, data); err != nil {
		t.Fatal(err)
	}
	if _, err = files.Finalize(ctx, f.admin, internal.ID, true); err != nil {
		t.Fatal(err)
	}
	scanJob(t, files, internal.ID)
	if _, err = chat.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{Purpose: "proof", RequestKey: uuid.NewString(), Body: "Cannot downgrade internal media", Visibility: "public", Attachments: []string{internal.ID}}); err == nil {
		t.Fatal("internal image became public proof")
	}
	if _, err = files.Grant(ctx, f.booster, internal.ID, false); !ent.IsNotFound(err) {
		t.Fatal("internal media leaked", err)
	}
	if _, err = chat.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Internal-only supporting image", Visibility: "internal", Attachments: []string{internal.ID}}); err != nil {
		t.Fatal(err)
	}
	if _, err = files.Grant(ctx, f.buyer, internal.ID, false); !ent.IsNotFound(err) {
		t.Fatal("customer obtained internal image", err)
	}
	grant, err := files.Grant(ctx, f.booster, file.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(grant)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = files.Grant(ctx, f.buyer, file.ID, false); err != nil {
		t.Fatal("customer proof inaccessible", err)
	}
	v, err = f.work.Get(ctx, f.admin, v.OrderID, "admin")
	if err != nil {
		t.Fatal(err)
	}
	if v.CoordinationID != thread.ID {
		t.Fatal("missing coordination link")
	}
	if _, err = f.work.Assign(ctx, f.admin, v.OrderID, fulfillment.Assignment{Version: v.Version, OrderVersion: v.OrderVersion, AssignedID: f.second.User.ID, Reason: "Reassigned work"}); err != nil {
		t.Fatal(err)
	}
	if _, err = chat.Get(ctx, f.booster, thread.ID, false); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("old staff retained messages", err)
	}
	if _, _, err = files.Content(ctx, f.booster, file.ID, false, parsed.Query().Get("expires"), parsed.Query().Get("signature")); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("old download grant retained access", err)
	}
	if _, err = chat.Get(ctx, f.second, thread.ID, false); err != nil {
		t.Fatal("new assignee lost shared history", err)
	}
	notices, err := f.auth.client.Notification.Query().Where(notification.UserIDEQ(f.booster.User.ID), notification.KindEQ("coordination_booster")).All(ctx)
	if err != nil || len(notices) == 0 {
		t.Fatal("missing coordination notices", err)
	}
	delivery, err := notifications.New(f.auth.client, f.auth.service, f.auth.cfg.PublicOrigin)
	if err != nil {
		t.Fatal(err)
	}
	sender := &recordingSender{}
	for _, notice := range notices {
		if err = delivery.EmailHandler(sender)(ctx, jobs.Job{Payload: []byte(`{"notification_id":"` + notice.ID + `"}`)}); err != nil {
			t.Fatal(err)
		}
	}
	if len(sender.messages) != 0 {
		t.Fatal("former assignee received email")
	}
	thread, err = chat.Get(ctx, f.admin, thread.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	disabled := false
	if _, err = chat.Change(ctx, f.admin, thread.ID, "sharing", conversations.Change{Version: thread.Version, BoosterShared: &disabled}); err != nil {
		t.Fatal(err)
	}
	if _, err = chat.Tick(ctx, f.second, thread.ID, false); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("paused sharing stream remained authorized", err)
	}
	if _, err = files.Grant(ctx, f.second, file.ID, false); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("paused proof remained accessible", err)
	}
	if _, err = chat.Get(ctx, f.buyer, thread.ID, false); err != nil {
		t.Fatal("owner lost history", err)
	}
}

func TestCoordinationCreationRaceAndAuditRollback(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	chat := supportStore(f.orderFixture)
	v := f.assign(t, f.paid(t, "duo"))
	ids := make(chan string, 3)
	var wg sync.WaitGroup
	for range 3 {
		wg.Go(func() {
			thread, err := chat.OpenCoordination(ctx, f.admin, v.OrderID, v.Version)
			if err != nil {
				t.Error(err)
				return
			}
			ids <- thread.ID
		})
	}
	wg.Wait()
	close(ids)
	id := ""
	for value := range ids {
		if id != "" && value != id {
			t.Fatal("duplicate shared threads")
		}
		id = value
	}
	if id == "" {
		t.Fatal("no thread created")
	}
	thread, err := chat.Get(ctx, f.admin, id, true)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Unix(f.auth.clock.Load(), 0)
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetAuthenticatedAt(now.Add(-11 * time.Minute)).SetMfaVerifiedAt(now.Add(-11 * time.Minute)).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = chat.OpenCoordination(ctx, f.admin, v.OrderID, v.Version); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("two stale factors shared thread", err)
	}
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetAuthenticatedAt(now).ClearMfaVerifiedAt().Save(ctx); err != nil {
		t.Fatal(err)
	}
	paused := false
	if _, err = chat.Change(ctx, f.admin, id, "sharing", conversations.Change{Version: thread.Version, BoosterShared: &paused}); !errors.Is(err, identity.ErrMFA) {
		t.Fatal("incomplete MFA sign-in changed sharing", err)
	}
	if _, err = f.auth.client.AuthSession.UpdateOneID(f.admin.Session.ID).SetMfaVerifiedAt(now).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	disabled := false
	if _, err = chat.Change(ctx, f.admin, id, "sharing", conversations.Change{Version: thread.Version, BoosterShared: &disabled}); err == nil {
		t.Fatal("unaudited sharing change")
	}
	if _, err = chat.Send(ctx, f.booster, id, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Must roll back", Visibility: "public"}); err == nil {
		t.Fatal("unaudited shared message")
	}
	row, err := f.auth.client.Conversation.Get(ctx, id)
	if err != nil || !row.BoosterShared || row.Sequence != 0 || row.Version != thread.Version {
		t.Fatal("audit rollback lost", err)
	}
}

func TestCoordinationLiveStreamStopsAfterSharingPause(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	chat := supportStore(f.orderFixture)
	_, staff := f.auth.staffLogin(t, "coordinationstream@example.test", identity.RoleBooster)
	enrollment, err := f.auth.service.EnrollMFA(ctx, staff)
	if err != nil {
		t.Fatal(err)
	}
	code, err := totp.GenerateCode(enrollment.Secret, time.Unix(f.auth.clock.Load(), 0))
	if err != nil {
		t.Fatal(err)
	}
	verified, err := f.auth.service.VerifyMFA(ctx, staff, code, "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	f.booster = f.auth.principal(t, verified.Token, identity.PortalBooster)
	v := f.assign(t, f.paid(t, "solo"))
	thread, err := chat.OpenCoordination(ctx, f.admin, v.OrderID, v.Version)
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	chat.Register(mux)
	server := httptest.NewServer(mux)
	defer server.Close()
	requestContext, cancel := context.WithTimeout(ctx, 6*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(requestContext, http.MethodGet, server.URL+"/api/v1/conversations/"+thread.ID+"/stream?portal=booster", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.AddCookie(&http.Cookie{Name: "bp-booster-session", Value: verified.Token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
	response, err := server.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if e := response.Body.Close(); e != nil {
			t.Error(e)
		}
	}()
	if response.StatusCode != http.StatusOK {
		t.Fatal("shared stream rejected", response.StatusCode)
	}
	reader := bufio.NewReader(response.Body)
	first, err := reader.ReadString('\n')
	if err != nil || first != "id: 1\n" {
		t.Fatal("initial stream", err)
	}
	for range 3 {
		if _, err = reader.ReadString('\n'); err != nil {
			t.Fatal(err)
		}
	}
	disabled := false
	if _, err = chat.Change(ctx, f.admin, thread.ID, "sharing", conversations.Change{Version: thread.Version, BoosterShared: &disabled}); err != nil {
		t.Fatal(err)
	}
	if _, err = reader.ReadString('\n'); !errors.Is(err, io.EOF) {
		t.Fatal("paused stream retained access", err)
	}
}
