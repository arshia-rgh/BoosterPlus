//go:build integration

package integration

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"image"
	"image/png"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

func mediaObjects(t *testing.T, client *ent.Client) *media.S3 {
	t.Helper()
	secret := os.Getenv("TEST_MEDIA_S3_SECRET_KEY")
	if len(secret) < 20 {
		t.Fatal("required private storage credentials unavailable; use scripts/integration-tests.py")
	}
	objects := media.NewS3("http://127.0.0.1:8333", "us-east-1", "boosterplus-private", "boosterplus-local", secret, "tests/"+uuid.NewString()+"/")
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		rows, err := client.MediaFile.Query().All(ctx)
		if err != nil {
			t.Error(err)
			return
		}
		for _, row := range rows {
			for _, prefix := range []string{"quarantine/", "clean/"} {
				if err = objects.Delete(ctx, prefix+row.ID); err != nil {
					t.Error(err)
				}
			}
		}
	})
	return objects
}
func imageBytes(t *testing.T) []byte {
	t.Helper()
	var out bytes.Buffer
	if err := png.Encode(&out, image.NewRGBA(image.Rect(0, 0, 8, 8))); err != nil {
		t.Fatal(err)
	}
	out.WriteString("synthetic metadata to strip")
	return out.Bytes()
}
func mediaIntent(thread, visibility string, data []byte) media.Intent {
	sum := sha256.Sum256(data)
	return media.Intent{RequestKey: uuid.NewString(), ConversationID: thread, Visibility: visibility, Checksum: hex.EncodeToString(sum[:]), Size: int64(len(data)), ContentType: "image/png"}
}
func scanJob(t *testing.T, store *media.Store, id string) {
	t.Helper()
	raw, err := json.Marshal(map[string]string{"media_id": id})
	if err != nil {
		t.Fatal(err)
	}
	if err = store.ScanHandler()(t.Context(), jobs.Job{Payload: raw}); err != nil {
		t.Fatal("required scanner/storage integration failed", err)
	}
}
func TestPrivateMediaRealStorageScannerAndAudience(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	objects := mediaObjects(t, f.auth.client)
	scanner := media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"}
	// EICAR is an inert, standardized antivirus test string, not executable malware.
	eicar := []byte(`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`)
	if err := scanner.Scan(ctx, eicar); !errors.Is(err, media.ErrInfected) {
		t.Fatal("scanner did not detect standard test signature", err)
	}
	store := media.New(f.auth.client, f.auth.service, objects, scanner)
	support := supportStore(f)
	thread, err := support.Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Image support"})
	if err != nil {
		t.Fatal(err)
	}
	data := imageBytes(t)
	input := mediaIntent(thread.ID, "public", data)
	file, err := store.Create(ctx, f.buyer, false, input)
	if err != nil {
		t.Fatal(err)
	}
	same, err := store.Create(ctx, f.buyer, false, input)
	if err != nil || same.ID != file.ID {
		t.Fatal("duplicate intent", err)
	}
	input.Size++
	if _, err = store.Create(ctx, f.buyer, false, input); !errors.Is(err, media.ErrConflict) {
		t.Fatal("changed intent accepted", err)
	}
	if _, err = store.Grant(ctx, f.buyer, file.ID, false); !errors.Is(err, media.ErrConflict) {
		t.Fatal("quarantine download allowed", err)
	}
	if err = store.Upload(ctx, f.other, file.ID, false, data); !ent.IsNotFound(err) {
		t.Fatal("foreign upload allowed", err)
	}
	if err = store.Upload(ctx, f.buyer, file.ID, false, []byte("different")); !errors.Is(err, media.ErrInvalid) {
		t.Fatal("wrong checksum allowed", err)
	}
	var wg sync.WaitGroup
	for range 4 {
		wg.Go(func() {
			if e := store.Upload(ctx, f.buyer, file.ID, false, data); e != nil {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	for range 4 {
		wg.Go(func() {
			if _, e := store.Finalize(ctx, f.buyer, file.ID, false); e != nil {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	scanJob(t, store, file.ID)
	ready, err := store.Get(ctx, f.buyer, file.ID, false)
	if err != nil || ready.State != "ready" {
		t.Fatal("clean image not ready", ready, err)
	}
	if _, err = store.Get(ctx, f.admin, file.ID, true); !ent.IsNotFound(err) {
		t.Fatal("unbound draft exposed to another uploader", err)
	}
	grant, err := store.Grant(ctx, f.buyer, file.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(grant)
	if err != nil {
		t.Fatal(err)
	}
	query := parsed.Query()
	clean, kind, err := store.Content(ctx, f.buyer, file.ID, false, query.Get("expires"), query.Get("signature"))
	if err != nil || kind != "image/png" || bytes.Contains(clean, []byte("metadata")) {
		t.Fatal("raw bytes or metadata served", err)
	}
	if _, _, err = store.Content(ctx, f.other, file.ID, false, query.Get("expires"), query.Get("signature")); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("grant crossed sessions", err)
	}
	if _, _, err = store.Content(ctx, f.buyer, file.ID, false, "0", query.Get("signature")); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("expired grant accepted", err)
	}
	message, err := support.Send(ctx, f.buyer, thread.ID, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: "My proof image", Visibility: "public", Attachments: []string{file.ID}})
	if err != nil || len(message.Attachments) != 1 {
		t.Fatal("image bind failed", err)
	}
	if _, err = store.Grant(ctx, f.admin, file.ID, true); err != nil {
		t.Fatal("staff cannot read shared image", err)
	}
	if _, err = store.Get(ctx, f.other, file.ID, false); !ent.IsNotFound(err) {
		t.Fatal("foreign image exposed", err)
	}
	if err = store.Remove(ctx, f.buyer, file.ID, false); !errors.Is(err, media.ErrConflict) {
		t.Fatal("bound evidence deleted", err)
	}
	if _, err = support.Send(ctx, f.buyer, thread.ID, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Reuse", Visibility: "public", Attachments: []string{file.ID}}); err == nil {
		t.Fatal("image rebound")
	}
	internal, err := store.Create(ctx, f.admin, true, mediaIntent(thread.ID, "internal", data))
	if err != nil {
		t.Fatal(err)
	}
	if err = store.Upload(ctx, f.admin, internal.ID, true, data); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Finalize(ctx, f.admin, internal.ID, true); err != nil {
		t.Fatal(err)
	}
	scanJob(t, store, internal.ID)
	if _, err = support.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Internal evidence", Visibility: "public", Attachments: []string{internal.ID}}); err == nil {
		t.Fatal("internal attachment downgraded")
	}
	if _, err = support.Send(ctx, f.admin, thread.ID, true, conversations.SendInput{RequestKey: uuid.NewString(), Body: "Internal evidence", Visibility: "internal", Attachments: []string{internal.ID}}); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Get(ctx, f.buyer, internal.ID, false); !ent.IsNotFound(err) {
		t.Fatal("internal file exposed", err)
	}
	if _, err = f.auth.client.User.UpdateOneID(f.buyer.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, _, err = store.Content(ctx, f.buyer, file.ID, false, query.Get("expires"), query.Get("signature")); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("revoked session download allowed", err)
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://127.0.0.1:8333/boosterplus-private/", nil)
	if err != nil {
		t.Fatal(err)
	}
	response, err := (&http.Client{Timeout: 5 * time.Second}).Do(request)
	if err != nil {
		t.Fatal(err)
	}
	if err = response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusForbidden && response.StatusCode != http.StatusUnauthorized {
		t.Fatal("anonymous bucket access", response.StatusCode)
	}
}

type unavailableScanner struct{}

func (unavailableScanner) Scan(context.Context, []byte) error {
	return errors.New("synthetic unavailable scanner")
}
func TestPrivateMediaOutageRetryRejectionAndCleanup(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	objects := mediaObjects(t, f.auth.client)
	store := media.New(f.auth.client, f.auth.service, objects, unavailableScanner{})
	thread, err := supportStore(f).Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Retry"})
	if err != nil {
		t.Fatal(err)
	}
	data := imageBytes(t)
	file, err := store.Create(ctx, f.buyer, false, mediaIntent(thread.ID, "public", data))
	if err != nil {
		t.Fatal(err)
	}
	if err = store.Upload(ctx, f.buyer, file.ID, false, data); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Finalize(ctx, f.buyer, file.ID, false); err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(map[string]string{"media_id": file.ID})
	if err != nil {
		t.Fatal(err)
	}
	if err = store.ScanHandler()(ctx, jobs.Job{Payload: raw}); err == nil {
		t.Fatal("scanner outage accepted")
	}
	if _, err = store.Grant(ctx, f.buyer, file.ID, false); !errors.Is(err, media.ErrConflict) {
		t.Fatal("unscanned file downloadable", err)
	}
	if err = store.Retry(ctx, f.buyer, file.ID, false); !errors.Is(err, media.ErrConflict) {
		t.Fatal("active scan job restarted", err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "UPDATE jobs SET state='failed',attempts=5 WHERE kind='media.scan' AND idempotency_key=?", "media:"+file.ID); err != nil {
		t.Fatal(err)
	}
	status, err := store.Get(ctx, f.buyer, file.ID, false)
	if err != nil || status.State != "scan_failed" {
		t.Fatal("exhausted job invisible", err)
	}
	if err = store.Retry(ctx, f.other, file.ID, false); !ent.IsNotFound(err) {
		t.Fatal("foreign scan retried", err)
	}
	if err = store.Retry(ctx, f.buyer, file.ID, false); err != nil {
		t.Fatal(err)
	}
	scanningStore := media.New(f.auth.client, f.auth.service, objects, media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"})
	scanJob(t, scanningStore, file.ID)
	if err = store.Remove(ctx, f.buyer, file.ID, false); err != nil {
		t.Fatal(err)
	}
	if err = store.Cleanup(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = objects.Get(ctx, "clean/"+file.ID); err == nil {
		t.Fatal("discarded object retained")
	}
	if err = objects.Put(ctx, "quarantine/"+file.ID, data, "image/png"); err != nil {
		t.Fatal(err)
	}
	if err = store.Cleanup(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = objects.Get(ctx, "quarantine/"+file.ID); err == nil {
		t.Fatal("late write escaped repeated cleanup")
	}
	for _, payload := range [][]byte{[]byte("invalid image"), []byte(`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`)} {
		bad, e := store.Create(ctx, f.buyer, false, mediaIntent(thread.ID, "public", payload))
		if e != nil {
			t.Fatal(e)
		}
		if e = store.Upload(ctx, f.buyer, bad.ID, false, payload); e != nil {
			t.Fatal(e)
		}
		if _, e = store.Finalize(ctx, f.buyer, bad.ID, false); e != nil {
			t.Fatal(e)
		}
		scanJob(t, scanningStore, bad.ID)
		row, e := f.auth.client.MediaFile.Get(ctx, bad.ID)
		if e != nil || row.State != mediafile.StateRejected {
			t.Fatal("unsafe image accepted", e)
		}
		if _, e = scanningStore.Grant(ctx, f.buyer, bad.ID, false); !errors.Is(e, media.ErrConflict) {
			t.Fatal("rejected file downloaded", e)
		}
	}
	// A removed file cannot be included through a forged message payload.
	if _, err = supportStore(f).Send(ctx, f.buyer, thread.ID, false, conversations.SendInput{RequestKey: uuid.NewString(), Body: strings.Repeat("x", 3), Visibility: "public", Attachments: []string{file.ID}}); err == nil {
		t.Fatal("removed image attached")
	}
}

func TestPrivateMediaQuotaAndRollback(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := media.New(f.auth.client, f.auth.service, mediaObjects(t, f.auth.client), unavailableScanner{})
	thread, err := supportStore(f).Create(ctx, f.buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "Quota"})
	if err != nil {
		t.Fatal(err)
	}
	input := mediaIntent(thread.ID, "public", imageBytes(t))
	if _, err = store.Create(ctx, f.other, false, input); !ent.IsNotFound(err) {
		t.Fatal("foreign conversation intent", err)
	}
	input.Visibility = "internal"
	if _, err = store.Create(ctx, f.buyer, false, input); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer internal intent", err)
	}
	input.Visibility = "public"
	input.Size = media.MaxBytes + 1
	if _, err = store.Create(ctx, f.buyer, false, input); !errors.Is(err, media.ErrInvalid) {
		t.Fatal("oversized intent", err)
	}
	var wg sync.WaitGroup
	for range 25 {
		wg.Go(func() {
			_, e := store.Create(ctx, f.buyer, false, mediaIntent(thread.ID, "public", imageBytes(t)))
			if e != nil && !errors.Is(e, identity.ErrLimited) {
				t.Error(e)
			}
		})
	}
	wg.Wait()
	count, err := f.auth.client.MediaFile.Query().Count(ctx)
	if err != nil || count != 20 {
		t.Fatal("concurrent quota exceeded", count, err)
	}
	rows, err := f.auth.client.MediaFile.Query().All(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "UPDATE media_files SET expires_at=DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 2 HOUR)"); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Finalize(ctx, f.buyer, rows[0].ID, false); !errors.Is(err, media.ErrConflict) {
		t.Fatal("expired intent finalized", err)
	}
	if err = store.Cleanup(ctx); err != nil {
		t.Fatal(err)
	}
	count, err = f.auth.client.MediaFile.Query().Where(mediafile.PurgedAtNotNil()).Count(ctx)
	if err != nil || count != 20 {
		t.Fatal("expired intents not reaped", count, err)
	}
	if _, err = f.auth.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Create(ctx, f.buyer, false, mediaIntent(thread.ID, "public", imageBytes(t))); err == nil {
		t.Fatal("intent committed without audit")
	}
	count, err = f.auth.client.MediaFile.Query().Count(ctx)
	if err != nil || count != 20 {
		t.Fatal("quota/intent leaked after rollback", count, err)
	}
}

func TestPrivateMediaHTTPBoundaries(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	store := media.New(f.auth.client, f.auth.service, mediaObjects(t, f.auth.client), unavailableScanner{})
	token, buyer := f.auth.login(t, "mediahttp@example.test")
	thread, err := supportStore(f).Create(ctx, buyer, false, conversations.CreateInput{RequestKey: uuid.NewString(), Kind: "presales", Subject: "HTTP image"})
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	store.Register(mux)
	bootstrap := httptest.NewRecorder()
	request := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil)
	sessionCookie := &http.Cookie{Name: "bp-customer-session", Value: token, Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode}
	request.AddCookie(sessionCookie)
	mux.ServeHTTP(bootstrap, request)
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err = json.Unmarshal(bootstrap.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	response := bootstrap.Result()
	cookies := response.Cookies()
	if err = response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	handler := httpapi.New(f.auth.db.PingContext, slog.New(slog.DiscardHandler), false, f.auth.service.Register, store.Register)
	call := func(method, path, contentType, origin string, data []byte) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(ctx, method, path, bytes.NewReader(data))
		r.AddCookie(sessionCookie)
		for _, cookie := range cookies {
			r.AddCookie(cookie)
		}
		r.Header.Set("Content-Type", contentType)
		r.Header.Set("Origin", origin)
		r.Header.Set("X-Csrf-Token", session.CSRF)
		out := httptest.NewRecorder()
		handler.ServeHTTP(out, r)
		return out
	}
	input := mediaIntent(thread.ID, "public", imageBytes(t))
	raw, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	if out := call(http.MethodPost, "/api/v1/media", "application/json", "https://evil.test", raw); out.Code != http.StatusForbidden {
		t.Fatal("intent CSRF allowed", out.Code)
	}
	unknown := bytes.Replace(raw, []byte(`"conversation_id"`), []byte(`"object_key"`), 1)
	if out := call(http.MethodPost, "/api/v1/media", "application/json", "http://localhost", unknown); out.Code != http.StatusUnprocessableEntity {
		t.Fatal("unknown key allowed", out.Code)
	}
	out := call(http.MethodPost, "/api/v1/media", "application/json", "http://localhost", raw)
	if out.Code != http.StatusOK {
		t.Fatal("valid intent rejected", out.Code, out.Body.String())
	}
	var file media.View
	if err = json.Unmarshal(out.Body.Bytes(), &file); err != nil {
		t.Fatal(err)
	}
	path := "/api/v1/media/" + file.ID + "/bytes"
	if out = call(http.MethodPut, path, "application/octet-stream", "https://evil.test", imageBytes(t)); out.Code != http.StatusForbidden {
		t.Fatal("binary CSRF allowed", out.Code)
	}
	if out = call(http.MethodPut, path, "application/octet-stream", "http://localhost", bytes.Repeat([]byte{1}, media.MaxBytes+1)); out.Code != http.StatusUnprocessableEntity {
		t.Fatal("oversized body accepted", out.Code)
	}
	if out = call(http.MethodPut, path, "application/octet-stream", "http://localhost", imageBytes(t)); out.Code != http.StatusNoContent {
		t.Fatal("valid binary upload", out.Code, out.Body.String())
	}
	if out = call(http.MethodPost, "/api/v1/media/"+file.ID+"/grant", "application/json", "http://localhost", []byte(`{}`)); out.Code != http.StatusConflict {
		t.Fatal("quarantine grant", out.Code)
	}
}
