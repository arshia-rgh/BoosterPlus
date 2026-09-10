//go:build integration && browsertest

package integration

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http/httptest"
	"os"

	"strings"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
)

// TestBrowserEnvironment runs only through the frontend gate, with a private temporary ready/stop directory.
// Fixtures never introduce authentication bypasses into the production server or API.
func TestBrowserEnvironment(t *testing.T) {
	directory := os.Getenv("BROWSER_TEST_DIRECTORY")
	if directory == "" {
		t.Fatal("BROWSER_TEST_DIRECTORY is required")
	}
	directoryRoot, rootErr := os.OpenRoot(directory)
	if rootErr != nil {
		t.Fatal(rootErr)
	}
	defer func() {
		if closeErr := directoryRoot.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	}()
	f := authDB(t, nil)
	f.cfg.PublicOrigin = "http://127.0.0.1:4173"
	f.cfg.SMTPHost = "127.0.0.1"
	f.cfg.SMTPPort = 1025
	f.cfg.SMTPFrom = "test@boosterplus.test"
	f.cfg.SMTPPlaintext = true
	service, err := identity.New(f.client, f.cfg, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	sender, err := identity.NewSMTP(f.cfg)
	if err != nil {
		t.Fatal(err)
	}
	fixtures := map[string]string{}
	for _, project := range []string{"desktop", "mobile"} {
		for _, role := range []string{"customer", "booster", "administrator", "owner", "target", "catalog", "orders", "orderadmin", "orderother", "supportadmin", "supportbuyer", "supportother"} {
			email := strings.ToLower(role + "-" + project + "-" + rand.Text() + "@example.test")
			account, createErr := f.client.User.Create().SetEmail(email).SetEmailVerifiedAt(time.Now()).SetTermsVersion("test-v1").SetTermsAcceptedAt(time.Now()).SetRole(func() string {
				if role == "catalog" || role == "orderadmin" || role == "supportadmin" {
					return "administrator"
				}
				if role == "target" || role == "orders" || role == "orderother" || role == "supportbuyer" || role == "supportother" {
					return "customer"
				}
				return role
			}()).Save(t.Context())
			if createErr != nil {
				t.Fatal(createErr)
			}
			fixtures[project+"_"+role] = email
			fixtures[project+"_"+role+"_id"] = account.ID
		}
	}
	notices, noticeErr := notifications.New(f.client, service, f.cfg.PublicOrigin)
	if noticeErr != nil {
		t.Fatal(noticeErr)
	}
	files := media.New(f.client, service, mediaObjects(t, f.client), media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"})
	server := httptest.NewServer(httpapi.New(f.db.PingContext, slog.New(slog.DiscardHandler), false, service.Register, catalog.New(f.client, service).Register, orders.New(f.client, service, nil).Register, conversations.New(f.client, service, nil).Register, notices.Register, files.Register))
	defer server.Close()
	work, cancel := context.WithCancel(t.Context())
	defer cancel()
	done := make(chan error, 1)
	go func() {
		done <- jobs.Run(work, jobs.New(f.db), map[string]jobs.Handler{"identity.email": service.EmailHandler(sender), "activity.email": notices.EmailHandler(sender), "media.scan": files.ScanHandler()}, slog.New(slog.DiscardHandler))
	}()
	defer func() {
		cancel()
		if workerErr := <-done; workerErr != nil {
			t.Error(workerErr)
		}
	}()
	data, err := json.Marshal(map[string]any{"api_origin": server.URL, "proxy_key": f.cfg.ProxyKey, "fixtures": fixtures})
	if err != nil {
		t.Fatal(err)
	}
	if err = directoryRoot.WriteFile("ready.json", data, 0600); err != nil {
		t.Fatal(err)
	}
	timeout := time.NewTimer(10 * time.Minute)
	defer timeout.Stop()
	tick := time.NewTicker(200 * time.Millisecond)
	defer tick.Stop()
	for {
		select {
		case <-timeout.C:
			t.Fatal("browser tests did not stop environment")
		case <-t.Context().Done():
			return
		case <-tick.C:
			if _, statErr := directoryRoot.Stat("stop"); statErr == nil {
				return
			} else if !errors.Is(statErr, os.ErrNotExist) {
				t.Fatal(statErr)
			}
		}
	}
}
