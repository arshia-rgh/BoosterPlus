//go:build integration

package integration

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversationmessage"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/notification"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

func supportStore(f *orderFixture) *conversations.Store {
	return conversations.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
}
func TestConversationVisibilityIdempotencyAndReads(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := supportStore(f)
	input := conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Questions before ordering"}
	thread, err := store.Create(ctx, f.buyer, false, input)
	if err != nil {
		t.Fatal(err)
	}
	repeat, err := store.Create(ctx, f.buyer, false, input)
	if err != nil || repeat.ID != thread.ID {
		t.Fatal("thread replay", err)
	}
	input.Subject = "Changed subject"
	if _, err = store.Create(ctx, f.buyer, false, input); !errors.Is(err, conversations.ErrConflict) {
		t.Fatal("create key changed request", err)
	}
	if _, err = store.Get(ctx, f.other, thread.ID, false); !ent.IsNotFound(err) {
		t.Fatal("other customer read", err)
	}
	if _, err = store.Get(ctx, f.other, thread.ID, true); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("nonstaff administration", err)
	}
	send := conversations.SendInput{RequestKey: uuid.NewString(), Body: "Can you explain the available scope?", Visibility: "public"}
	var count atomic.Int64
	var wg sync.WaitGroup
	for range 5 {
		wg.Go(func() {
			_, e := store.Send(ctx, f.buyer, thread.ID, false, send)
			if e != nil {
				t.Error(e)
			} else {
				count.Add(1)
			}
		})
	}
	wg.Wait()
	if count.Load() != 5 {
		t.Fatal("idempotent sends failed", count.Load())
	}
	rows, err := f.auth.client.ConversationMessage.Query().Where(conversationmessage.ConversationIDEQ(thread.ID)).Count(ctx)
	if err != nil || rows != 1 {
		t.Fatal("duplicate messages", rows, err)
	}
	send.Body = "Changed retry"
	if _, err = store.Send(ctx, f.buyer, thread.ID, false, send); !errors.Is(err, conversations.ErrConflict) {
		t.Fatal("key reuse accepted", err)
	}
	before, err := store.Get(ctx, f.buyer, thread.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	note := conversations.SendInput{RequestKey: uuid.NewString(), Body: "Staff-only planning note", Visibility: "internal"}
	if _, err = store.Send(ctx, f.buyer, thread.ID, false, note); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer wrote staff note", err)
	}
	if _, err = store.Send(ctx, f.admin, thread.ID, true, note); err != nil {
		t.Fatal(err)
	}
	after, err := store.Get(ctx, f.buyer, thread.ID, false)
	if err != nil || after.Version != before.Version || after.Sequence != before.Sequence || after.Unread != before.Unread || !after.UpdatedAt.Equal(before.UpdatedAt) {
		t.Fatal("internal note changed customer state", before, after, err)
	}
	messages, err := store.Messages(ctx, f.buyer, thread.ID, false, 0)
	if err != nil || len(messages.Messages) != 1 || messages.Latest != 1 || messages.Messages[0].SenderID != "" {
		t.Fatal("internal record leaked", messages, err)
	}
	if err = store.Read(ctx, f.buyer, thread.ID, false, 2); !errors.Is(err, conversations.ErrConflict) {
		t.Fatal("hidden sequence acknowledged", err)
	}
	if err = store.Read(ctx, f.buyer, thread.ID, false, 1); err != nil {
		t.Fatal(err)
	}
	reply, err := store.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "A specialist will review the request.", Visibility: "public"})
	if err != nil {
		t.Fatal(err)
	}
	messages, err = store.Messages(ctx, f.buyer, thread.ID, false, 1)
	if err != nil || len(messages.Messages) != 1 || messages.Messages[0].Sequence != 2 || messages.Messages[0].ID != reply.ID || messages.Messages[0].SenderID != "" || messages.Messages[0].SenderLabel != "PLAYORA support" {
		t.Fatal(messages, err)
	}
	after, err = store.Get(ctx, f.buyer, thread.ID, false)
	if err != nil || after.Unread != 1 || after.State != "waiting" {
		t.Fatal(after, err)
	}
	adminMessages, err := store.Messages(ctx, f.admin, thread.ID, true, 0)
	if err != nil || len(adminMessages.Messages) != 3 || adminMessages.Messages[1].Visibility != "internal" || adminMessages.Messages[1].SenderID != f.admin.User.ID {
		t.Fatal(adminMessages, err)
	}
	if _, err = f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Tick(ctx, f.buyer, thread.ID, false); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("stream retained revoked authority", err)
	}
}
func TestConversationLinkAssignmentAndRollback(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := supportStore(f)
	o := f.create(t, "custom")
	thread, err := store.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Before buying"})
	if err != nil {
		t.Fatal(err)
	}
	other, err := f.store.Create(ctx, f.other, f.input("custom"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.Change(ctx, f.admin, thread.ID, "link", conversations.Change{Version: thread.Version, OrderID: other.Order.ID}); !ent.IsNotFound(err) {
		t.Fatal("linked another customer's order", err)
	}
	thread, err = store.Change(ctx, f.admin, thread.ID, "assign", conversations.Change{Version: thread.Version, AssignedTo: f.admin.User.ID})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.Change(ctx, f.admin, thread.ID, "link", conversations.Change{Version: 1, OrderID: o.Order.ID}); !errors.Is(err, conversations.ErrConflict) {
		t.Fatal("stale change won", err)
	}
	thread, err = store.Change(ctx, f.admin, thread.ID, "link", conversations.Change{Version: thread.Version, OrderID: o.Order.ID})
	if err != nil || thread.LinkedOrderID != o.Order.ID || thread.Kind != "presales" || thread.OrderID != "" {
		t.Fatal("thread merge or bad link", thread, err)
	}
	var ids sync.Map
	var wg sync.WaitGroup
	for range 4 {
		wg.Go(func() {
			v, e := store.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "order", OrderID: o.Order.ID, Subject: "Order support"})
			if e != nil {
				t.Error(e)
			} else {
				ids.Store(v.ID, true)
			}
		})
	}
	wg.Wait()
	count := 0
	ids.Range(func(_, _ any) bool { count++; return true })
	if count != 1 {
		t.Fatal("duplicate order conversations", count)
	}
	if _, err = f.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Must roll back", Visibility: "public"}); err == nil {
		t.Fatal("message committed without audit")
	}
	messages, err := store.Messages(ctx, f.buyer, thread.ID, false, 0)
	if err != nil || len(messages.Messages) != 0 {
		t.Fatal("partial message", err)
	}
	notices, err := f.auth.client.Notification.Query().Count(ctx)
	if err != nil || notices != 0 {
		t.Fatal("partial notification", notices, err)
	}
}

type activitySender struct {
	mu    sync.Mutex
	calls int
	fail  bool
	sent  []identity.Message
}

func (s *activitySender) Send(_ context.Context, message identity.Message) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.calls++
	if s.fail {
		return errors.New("synthetic provider failure")
	}
	s.sent = append(s.sent, message)
	return nil
}
func TestConversationNotificationRetriesAndPreferences(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := supportStore(f)
	thread, err := store.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Private question"})
	if err != nil {
		t.Fatal(err)
	}
	message, err := store.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Sensitive ordinary conversation text stays out of email", Visibility: "public"})
	if err != nil {
		t.Fatal(err)
	}
	notice, err := f.auth.client.Notification.Query().Where(notification.MessageIDEQ(message.ID)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	notices, err := notifications.New(f.auth.client, f.auth.service, "http://localhost")
	if err != nil {
		t.Fatal(err)
	}
	sender := &activitySender{fail: true}
	handler := notices.EmailHandler(sender)
	payload, err := json.Marshal(map[string]string{"notification_id": notice.ID})
	if err != nil {
		t.Fatal(err)
	}
	job := jobs.Job{Payload: payload}
	if err = handler(ctx, job); err == nil {
		t.Fatal("delivery outage accepted")
	}
	pending, err := f.auth.client.Notification.Get(ctx, notice.ID)
	if err != nil || pending.EmailState != notification.EmailStatePending {
		t.Fatal("outage swallowed", err)
	}
	sender.fail = false
	if err = handler(ctx, job); err != nil {
		t.Fatal(err)
	}
	if err = handler(ctx, job); err != nil {
		t.Fatal(err)
	}
	if sender.calls != 2 || len(sender.sent) != 1 || strings.Contains(sender.sent[0].Body, "Sensitive ordinary") || strings.Contains(sender.sent[0].Body, f.buyer.User.Email) {
		t.Fatal("duplicate delivery or content leak")
	}
	list, err := notices.List(ctx, f.other, "")
	if err != nil || len(list.Notifications) != 0 {
		t.Fatal("private notices leaked", err)
	}
	if err = notices.Read(ctx, f.other, notice.ID); err != nil {
		t.Fatal(err)
	}
	original, err := f.auth.client.Notification.Get(ctx, notice.ID)
	if err != nil || original.ReadAt != nil {
		t.Fatal("other customer marked notice", err)
	}
	if _, err = f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetNotifyUpdates(false).Save(ctx); err != nil {
		t.Fatal(err)
	}
	message, err = store.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Another reply", Visibility: "public"})
	if err != nil {
		t.Fatal(err)
	}
	notice, err = f.auth.client.Notification.Query().Where(notification.MessageIDEQ(message.ID)).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	payload, err = json.Marshal(map[string]string{"notification_id": notice.ID})
	if err != nil {
		t.Fatal(err)
	}
	if err = handler(ctx, jobs.Job{Payload: payload}); err != nil {
		t.Fatal(err)
	}
	if sender.calls != 2 {
		t.Fatal("opt-out ignored")
	}
}

func TestConversationPaginationAndDeliveryAdministration(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := supportStore(f)
	thread, err := store.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "History"})
	if err != nil {
		t.Fatal(err)
	}
	for range 53 {
		if _, err = store.Send(ctx, f.buyer, thread.ID, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Ordinary history message", Visibility: "public"}); err != nil {
			t.Fatal(err)
		}
	}
	latest, err := store.History(ctx, f.buyer, thread.ID, false, 0)
	if err != nil || len(latest.Messages) != 50 || latest.Messages[0].Sequence != 4 || latest.Messages[49].Sequence != 53 || latest.Next != 4 {
		t.Fatal("latest window", latest.Next, err)
	}
	earlier, err := store.History(ctx, f.buyer, thread.ID, false, latest.Next)
	if err != nil || len(earlier.Messages) != 3 || earlier.Next != 0 {
		t.Fatal("older window", err)
	}
	forward, err := store.Messages(ctx, f.buyer, thread.ID, false, 0)
	if err != nil || len(forward.Messages) != 50 || forward.Next != 50 {
		t.Fatal("backfill page", err)
	}
	forward, err = store.Messages(ctx, f.buyer, thread.ID, false, forward.Next)
	if err != nil || len(forward.Messages) != 3 {
		t.Fatal("backfill tail", err)
	}
	if _, err = store.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "New public reply", Visibility: "public"}); err != nil {
		t.Fatal(err)
	}
	notices, err := notifications.New(f.auth.client, f.auth.service, "http://localhost")
	if err != nil {
		t.Fatal(err)
	}
	deliveries, err := notices.Deliveries(ctx, f.admin)
	if err != nil || len(deliveries) != 1 {
		t.Fatal("delivery reference missing", err)
	}
	if _, err = notices.Deliveries(ctx, f.buyer); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer read jobs", err)
	}
	if err = notices.Retry(ctx, f.admin, deliveries[0].ID); !errors.Is(err, identity.ErrConflict) {
		t.Fatal("running/pending job restarted", err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "UPDATE jobs SET state='failed',attempts=5,last_error='handler_failed' WHERE id=?", deliveries[0].ID); err != nil {
		t.Fatal(err)
	}
	if err = notices.Retry(ctx, f.buyer, deliveries[0].ID); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer retried jobs", err)
	}
	if err = notices.Retry(ctx, f.admin, deliveries[0].ID); err != nil {
		t.Fatal(err)
	}
	deliveries, err = notices.Deliveries(ctx, f.admin)
	if err != nil || len(deliveries) != 1 || deliveries[0].State != "pending" || deliveries[0].Attempts != 0 {
		t.Fatal("retry not scheduled", err)
	}
	f.auth.clock.Add(601)
	if err = notices.Retry(ctx, f.admin, deliveries[0].ID); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("stale factors retried delivery", err)
	}
}
func TestConversationHTTPContractAndCSRF(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := supportStore(f)
	token, _ := f.auth.login(t, "supporthttp@example.test")
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	store.Register(mux)
	bootstrap := httptest.NewRecorder()
	r := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil)
	cookie := &http.Cookie{Name: "bp-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
	r.AddCookie(cookie)
	mux.ServeHTTP(bootstrap, r)
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err := json.Unmarshal(bootstrap.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	response := bootstrap.Result()
	cookies := response.Cookies()
	if err := response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	call := func(path, body, origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequestWithContext(ctx, http.MethodPost, path, strings.NewReader(body))
		req.AddCookie(cookie)
		for _, c := range cookies {
			req.AddCookie(c)
		}
		req.Header.Set("Origin", origin)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Csrf-Token", session.CSRF)
		res := httptest.NewRecorder()
		mux.ServeHTTP(res, req)
		return res
	}
	body := `{"request_key":"` + uuid.NewString() + `","kind":"presales","order_id":"","subject":"HTTP test","slug":""}`
	if res := call("/api/v1/conversations", body, "https://evil.test"); res.Code != 403 {
		t.Fatal("CSRF accepted", res.Code)
	}
	if res := call("/api/v1/conversations", strings.Replace(body, `"kind"`, `"customer_id"`, 1), "http://localhost"); res.Code != 422 {
		t.Fatal("unknown property accepted", res.Code)
	}
	res := call("/api/v1/conversations", body, "http://localhost")
	if res.Code != 200 {
		t.Fatal(res.Code, res.Body.String())
	}
	var thread conversations.View
	if err := json.Unmarshal(res.Body.Bytes(), &thread); err != nil {
		t.Fatal(err)
	}
	send := `{"request_key":"` + uuid.NewString() + `","body":"Public message","visibility":"public"}`
	res = call("/api/v1/conversations/"+thread.ID+"/messages", send, "http://localhost")
	if res.Code != 200 {
		t.Fatal(res.Code, res.Body.String())
	}
	var message conversations.Message
	if err := json.Unmarshal(res.Body.Bytes(), &message); err != nil {
		t.Fatal(err)
	}
	if res = call("/api/v1/conversations/"+thread.ID+"/messages", strings.Replace(send, `"public"`, `"internal"`, 1), "http://localhost"); res.Code != 403 {
		t.Fatal("customer staff note", res.Code)
	}
	if res = call("/api/v1/conversations/"+thread.ID+"/messages", strings.Repeat("x", 262145), "http://localhost"); res.Code != 422 {
		t.Fatal("oversized message", res.Code)
	}
	var contract any
	if err := json.Unmarshal(api.Contract, &contract); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("contract.json", contract); err != nil {
		t.Fatal(err)
	}
	for name, value := range map[string]any{"Conversation": thread, "ConversationMessage": message, "ConversationMessages": conversations.Messages{Messages: []conversations.Message{message}}, "ActivityNotices": notifications.Listing{Notifications: []notifications.View{}}} {
		schema, err := compiler.Compile("contract.json#/components/schemas/" + name)
		if err != nil {
			t.Fatal(err)
		}
		encoded, err := json.Marshal(value)
		if err != nil {
			t.Fatal(err)
		}
		var data any
		if err = json.Unmarshal(encoded, &data); err != nil {
			t.Fatal(err)
		}
		if err = schema.Validate(data); err != nil {
			t.Fatal(name, err)
		}
	}
}

func TestConversationSSERechecksSessionAndHidesNotes(t *testing.T) {
	f := orderDB(t)
	store := supportStore(f)
	token, buyer := f.auth.login(t, "streambuyer@example.test")
	thread, err := store.Create(t.Context(), buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Stream test"})
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	store.Register(mux)
	server := httptest.NewServer(mux)
	defer server.Close()
	ctx, cancel := context.WithTimeout(t.Context(), 6*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, server.URL+"/api/v1/conversations/"+thread.ID+"/stream", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.AddCookie(&http.Cookie{Name: "bp-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode})
	response, err := server.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if closeErr := response.Body.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	}()
	if response.StatusCode != http.StatusOK || response.Header.Get("Content-Type") != "text/event-stream" {
		t.Fatal("stream headers", response.StatusCode)
	}
	reader := bufio.NewReader(response.Body)
	first, err := reader.ReadString('\n')
	if err != nil || first != "id: 1\n" {
		t.Fatal("initial cursor", first, err)
	}
	for range 3 {
		if _, err = reader.ReadString('\n'); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = store.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Invisible note", Visibility: "internal"}); err != nil {
		t.Fatal(err)
	}
	heartbeat, err := reader.ReadString('\n')
	if err != nil || heartbeat != ": heartbeat\n" {
		t.Fatal("internal event leaked", heartbeat, err)
	}
	if _, err = reader.ReadString('\n'); err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.client.User.UpdateOneID(buyer.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	_, err = reader.ReadString('\n')
	if !errors.Is(err, io.EOF) {
		t.Fatal("stream retained revoked session", err)
	}
}
