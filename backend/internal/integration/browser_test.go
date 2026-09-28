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

	"github.com/arshia-rgh/BoosterPlus/backend/internal/availability"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/conversations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/news"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/operations"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reports"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reviews"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shop"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/submissions"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
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
		for _, role := range []string{"newseditor", "shopmarketing", "shopbuyer", "shopworker", "shopadmin", "contentowner", "resaleseller", "resalebuyer", "payadmin", "paybuyer", "customer", "booster", "administrator", "owner", "target", "catalog", "orders", "orderadmin", "orderother", "supportadmin", "supportbuyer", "supportother", "workadmin", "workbuyer", "workbooster", "workother", "worksecond", "seller", "selleradmin", "sellerother"} {
			email := strings.ToLower(role + "-" + project + "-" + rand.Text() + "@example.test")
			account, createErr := f.client.User.Create().SetEmail(email).SetEmailVerifiedAt(time.Now()).SetTermsVersion("test-v1").SetTermsAcceptedAt(time.Now()).SetRole(func() string {
				if role == "workbooster" || role == "worksecond" {
					return "booster"
				}
				if role == "newseditor" || role == "shopmarketing" || role == "shopadmin" || role == "selleradmin" || role == "workadmin" || role == "catalog" || role == "orderadmin" || role == "supportadmin" {
					return "administrator"
				}
				if role == "shopworker" || role == "payadmin" || role == "contentowner" {
					return "owner"
				}
				if role == "shopbuyer" || role == "resaleseller" || role == "resalebuyer" || role == "paybuyer" || role == "seller" || role == "sellerother" || role == "workbuyer" || role == "workother" || role == "target" || role == "orders" || role == "orderother" || role == "supportbuyer" || role == "supportother" {
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
	seedBrowserChat(t, f, fixtures)
	seedBrowserFulfillment(t, f, fixtures)
	seedBrowserDiscovery(t, f, fixtures)
	seedBrowserOperations(t, f, fixtures)
	seedBrowserPayments(t, f, fixtures)
	seedBrowserShop(t, f, fixtures)
	seedBrowserNews(t, f, fixtures)
	ring, ringErr := vault.NewKeyring("v1", map[string][]byte{"v1": vaultKey(t)})
	if ringErr != nil {
		t.Fatal(ringErr)
	}
	execution, executionErr := fulfillment.New(f.client, service, ring, nil)
	if executionErr != nil {
		t.Fatal(executionErr)
	}
	notices, noticeErr := notifications.New(f.client, service, f.cfg.PublicOrigin)
	if noticeErr != nil {
		t.Fatal(noticeErr)
	}
	alerts, alertErr := availability.New(f.client, service, f.cfg.PublicOrigin, nil)
	if alertErr != nil {
		t.Fatal(alertErr)
	}
	files := media.New(f.client, service, mediaObjects(t, f.client), media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"})
	finance := payments.New(f.client, service, &browserPaymentProvider{newPaymentProvider(t)}, "fixture:browser-fixture", true, nil).ConfigureOutgoing(&browserOutgoingProvider{outgoingFixture: &outgoingFixture{}}, true)
	server := httptest.NewServer(httpapi.New(f.db.PingContext, slog.New(slog.DiscardHandler), false, news.New(f.client, service, nil).Register, resale.New(f.client, service, ring, nil).Register, shop.New(f.client, service, nil).Register, finance.Register, service.Register, catalog.New(f.client, service).Register, orders.New(f.client, service, nil).Register, conversations.New(f.client, service, nil).Register, notices.Register, files.Register, execution.Register, submissions.New(f.client, service, nil).Register, reviews.New(f.client, service, nil).Register, operations.New(f.client, service, nil).Register, alerts.Register, reports.New(service, nil).Register, privacy.New(f.client, service, nil).Register, sitecontent.New(f.client, service, nil).Register))
	defer server.Close()
	work, cancel := context.WithCancel(t.Context())
	defer cancel()
	done := make(chan error, 1)
	go func() {
		done <- jobs.Run(work, jobs.New(f.db), map[string]jobs.Handler{"payments.payout": finance.RefundHandler(), "payments.seller_obligation": finance.SellerObligationHandler(), "payments.refund": finance.RefundHandler(), "payments.outgoing_reconcile": finance.OutgoingHandler(), "payments.invoice": finance.InvoiceHandler(), "payments.reconcile": finance.ReconcileHandler(), "availability.changed": alerts.ChangedHandler(), "availability.fanout": alerts.FanoutHandler(), "availability.email": alerts.EmailHandler(sender), "system.ping": func(context.Context, jobs.Job) error { return nil }, "identity.email": service.EmailHandler(sender), "activity.email": notices.EmailHandler(sender), "media.scan": files.ScanHandler()}, slog.New(slog.DiscardHandler))
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
