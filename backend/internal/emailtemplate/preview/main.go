// Command preview writes synthetic email previews; it never contacts SMTP or a database.
package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/emailtemplate"
)

func main() {
	dir := filepath.Join("..", ".cache", "email-preview")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		panic(err)
	}
	samples := []struct{ name, kind, action string }{
		{"payment", "order_customer", "payment_verified"}, {"quote", "order_customer", "quote_issued"},
		{"completed", "order_customer", "approve_completion"}, {"refund", "order_customer", "refund_confirmed"},
		{"refund-pending", "order_customer", "refund_updated"}, {"payout", "submission_seller", "seller_payout_confirmed"},
		{"support", "conversation_customer", ""}, {"booking", "booking_customer", ""}, {"booster", "order_staff", ""},
		{"expired", "order_customer", "checkout_expired"}, {"case", "order_customer", "case_resolved"},
	}
	for _, s := range samples {
		n := emailtemplate.Event(s.kind, s.action)
		href := "https://playora.example.test/orders/synthetic-order-reference"
		switch s.kind {
		case "order_staff":
			href = "https://playora.example.test/booster/orders/synthetic-order-reference"
		case "submission_seller":
			href = "https://playora.example.test/sell/synthetic-submission-reference"
		case "conversation_customer":
			href = "https://playora.example.test/support/synthetic-conversation-reference"
		}
		body := n.Description + "\n\n" + href + "\n\nChange activity email preferences in your account settings."
		write(dir, s.name, n.Heading+" | PLAYORA", body, emailtemplate.View{Heading: n.Heading, Preview: n.Description, ActionLabel: n.ActionLabel, ActionURL: href})
	}
	write(dir, "verification", "Your PLAYORA verification code", "Enter the code in the verification screen for your request.\n\n123456\n\nIt expires in 10 minutes. Use it only for the customer portal login request you started. If you did not request this code, ignore this email. Never share this code with support or another person.", emailtemplate.View{Heading: "Verify your request", Preview: "Only use this code for the request you started.", Code: "123456"})
	href := "https://playora.example.test/games/mlbb/boost/packages/synthetic-offer"
	unsubscribe := "https://playora.example.test/availability/unsubscribe#synthetic-subscription/1/synthetic-token"
	write(dir, "availability", "An offer you follow has availability", "An offer matching your subscription is available.\nCheck its current price, eligibility and availability before ordering. This email is not a reservation or purchase guarantee.\n"+href+"\n\nStop these availability emails:\n"+unsubscribe+"\n\nManage all availability alerts in your account settings.", emailtemplate.View{Heading: "An offer you follow is available", Preview: "Check the latest price and availability before ordering.", ActionLabel: "View available offer", ActionURL: href, SecondaryLabel: "Stop availability emails", SecondaryURL: unsubscribe})
	write(dir, "security", "PLAYORA account email changed", "Your account email was changed. If you did not request this, contact support through the PLAYORA website. No passwords or verification codes will be requested by support.", emailtemplate.View{})
	fmt.Println("Synthetic email previews written; no messages sent.")
}
func write(dir, name, subject, body string, view emailtemplate.View) {
	rendered, err := emailtemplate.Render(subject, body, view)
	if err != nil {
		panic(err)
	}
	if err = os.WriteFile(filepath.Join(dir, name+".html"), []byte(rendered), 0o600); err != nil {
		panic(err)
	}
	if err = os.WriteFile(filepath.Join(dir, name+".txt"), []byte(subject+"\n\n"+body+"\n\n"+emailtemplate.Footer), 0o600); err != nil {
		panic(err)
	}
}
