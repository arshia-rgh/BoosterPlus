package notifications

import (
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/emailtemplate"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

func TestActivityMessagesUseSpecificSafeCopyAndPortalLinks(t *testing.T) {
	t.Parallel()
	copyText := sitecontent.Notifications{ActivitySubject: "New activity on PLAYORA", ActivityIntro: "There is an update in your PLAYORA account.", Footer: "Synthetic footer"}
	for _, scenario := range []struct{ kind, action, path, title string }{
		{"order_customer", "payment_verified", "/orders/", "Payment confirmed"},
		{"order_customer", "refund_confirmed", "/orders/", "Refund transfer confirmed"},
		{"order_staff", "", "/booster/orders/", "Your assigned order has an update"},
		{"conversation_staff", "", "/admin/support/", "Your support workspace has an update"},
		{"submission_seller", "seller_payout_confirmed", "/sell/", "Seller payout confirmed"},
	} {
		href, ok := path(scenario.kind, "synthetic-id")
		if !ok {
			t.Fatal("missing route")
		}
		message := activityMessage("recipient@example.test", "https://playora.example.test", href, scenario.kind, scenario.action, copyText)
		if message.Subject != scenario.title+" | PLAYORA" || !strings.Contains(message.View.ActionURL, scenario.path) || !strings.Contains(message.Body, "Synthetic footer") {
			t.Fatalf("incorrect %s message", scenario.kind)
		}
		if _, err := emailtemplate.Render(message.Subject, message.Body, message.View); err != nil {
			t.Fatal(err)
		}
	}
}

func TestReviewedCopyCannotRemoveEventOrPreferenceInstructions(t *testing.T) {
	t.Parallel()
	message := activityMessage("recipient@example.test", "https://playora.example.test", "/orders/id", "order_customer", "refund_updated", sitecontent.Notifications{ActivitySubject: "Approved subject", ActivityIntro: "<script>synthetic</script>", Footer: "Approved footer"})
	if message.Subject != "Approved subject" || !strings.Contains(message.Body, "does not yet mean") || !strings.Contains(message.Body, "preferences") {
		t.Fatal("mandatory copy changed")
	}
	html, err := emailtemplate.Render(message.Subject, message.Body, message.View)
	if err != nil || strings.Contains(html, "<script>") || !strings.Contains(html, "&lt;script&gt;") {
		t.Fatal("reviewed plain copy became executable", err)
	}
}

func TestStaffEmailsFollowConfiguredPortalOrigins(t *testing.T) {
	for _, split := range []bool{false, true} {
		cfg := identity.Config{Key: []byte("synthetic-authentication-key-123"), ProxyKey: strings.Repeat("synthetic-proxy", 4), PublicOrigin: "https://playora.example"}
		if split {
			cfg.AdminPublicOrigin, cfg.BoosterPublicOrigin = "https://admin.playora.example", "https://booster.playora.example"
		}
		auth, err := identity.New(ent.NewClient(), cfg, nil, nil)
		if err != nil {
			t.Fatal(err)
		}
		s := &Store{auth: auth, origin: cfg.PublicOrigin}
		for _, scenario := range []struct{ kind, origin, href string }{
			{"order_staff", "https://booster.playora.example", "/orders/synthetic-id"},
			{"booking_staff", "https://booster.playora.example", "/orders/synthetic-id"},
			{"coordination_booster", "https://booster.playora.example", "/support/synthetic-id"},
			{"conversation_staff", "https://admin.playora.example", "/support/synthetic-id"},
			{"order_customer", "https://playora.example", "/orders/synthetic-id"},
		} {
			href, ok := path(scenario.kind, "synthetic-id")
			if !ok {
				t.Fatal("unknown notification")
			}
			origin, destination, err := s.emailDestination(scenario.kind, href)
			if err != nil {
				t.Fatal(err)
			}
			want := scenario.origin + scenario.href
			if !split {
				want = cfg.PublicOrigin + href
			}
			message := activityMessage("synthetic@example.test", origin, destination, scenario.kind, "", sitecontent.Notifications{})
			if message.View.ActionURL != want || !strings.Contains(message.Body, want) {
				t.Fatalf("wrong %s email destination: %s", scenario.kind, message.View.ActionURL)
			}
			if _, err = emailtemplate.Render(message.Subject, message.Body, message.View); err != nil {
				t.Fatal("portal email failed rendering", err)
			}
		}
		if _, _, err := s.emailDestination("conversation_staff", "//evil.example"); err == nil {
			t.Fatal("untrusted notification href accepted")
		}
	}
}
