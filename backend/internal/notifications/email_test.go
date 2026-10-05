package notifications

import (
	"strings"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/emailtemplate"
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
