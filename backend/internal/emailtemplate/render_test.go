package emailtemplate

import (
	"strings"
	"testing"
)

func TestRenderEscapesCopyAndKeepsSafeAction(t *testing.T) {
	t.Parallel()
	result, err := Render("Payment <confirmed>", "A private update.\n<script>alert(1)</script>\n", View{Heading: `<img src=x onerror=alert(1)>`, ActionLabel: "View order", ActionURL: "https://playora.example.test/orders/fixture?one=1&two=2"})
	if err != nil {
		t.Fatal(err)
	}
	for _, forbidden := range []string{"<script>", "<img ", "#ZgotmplZ", "<iframe", "<link ", "<script "} {
		if strings.Contains(result, forbidden) {
			t.Fatalf("unsafe markup: %s", forbidden)
		}
	}
	for _, expected := range []string{"&lt;script&gt;", "&lt;img", "one=1&amp;two=2", "View order", `lang="en"`, `role="presentation"`} {
		if !strings.Contains(result, expected) {
			t.Fatalf("missing content: %s", expected)
		}
	}
}

func TestRenderRejectsUnsafeActionsAndHeaderInjection(t *testing.T) {
	t.Parallel()
	for _, destination := range []string{"javascript:alert(1)", "data:text/html,test", "//evil.test", "http://remote.example.test", "https://user:secret@example.test", "https://example.test\r\nBcc:bad", "https://example.test\\evil", ""} {
		if _, err := Render("Update", "Safe body", View{ActionLabel: "Open", ActionURL: destination}); err == nil {
			t.Errorf("unsafe destination accepted: %q", destination)
		}
	}
	for _, destination := range []string{"https://playora.example.test/orders/id", "http://127.0.0.1:5173/orders/id", "http://[::1]:5173/orders/id"} {
		if _, err := Render("Update", "Safe body", View{ActionLabel: "Open", ActionURL: destination}); err != nil {
			t.Error(err)
		}
	}
	if _, err := Render("Update\r\nBcc:other@example.test", "Body", View{}); err == nil {
		t.Fatal("header injection accepted")
	}
	if _, err := Render("Update", "Body", View{Code: "<b>123</b>"}); err == nil {
		t.Fatal("invalid code accepted")
	}
}

func TestCodeIsVisibleOnceAndAbsentFromPreview(t *testing.T) {
	t.Parallel()
	result, err := Render("Verification", "Use this code:\n\n123456\n\nExpires in 10 minutes.", View{Code: "123456"})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Count(result, "123456") != 1 || !strings.Contains(result, "Expires in 10 minutes.") {
		t.Fatal("code or expiry presentation wrong")
	}
}

func TestFinancialCopyDoesNotConfuseIntermediateAndConfirmedStates(t *testing.T) {
	t.Parallel()
	for _, action := range []string{"refund_updated", "case_resolved", "outgoing_exception", "unknown"} {
		if strings.Contains(Event("order_customer", action).Heading, "confirmed") {
			t.Fatalf("intermediate %s claimed confirmation", action)
		}
	}
	if !strings.Contains(Event("order_customer", "refund_confirmed").Description, "one part") {
		t.Fatal("partial refund incorrectly presented as complete repayment")
	}
	if !strings.Contains(Event("order_customer", "payment_verified").Description, "hold still applies") {
		t.Fatal("payment mail promises held work can start")
	}
	if Event("submission_seller", "seller_payout_confirmed").Heading != "Seller payout confirmed" {
		t.Fatal("verified seller transfer missing")
	}
}
