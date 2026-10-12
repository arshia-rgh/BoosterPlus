package payments

import (
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

func TestHostedRecoveryCannotReopenUnsafeCheckout(t *testing.T) {
	now := time.Now()
	contract := "contract"
	for _, test := range []struct {
		name   string
		change func(*ent.PaymentAttempt)
	}{
		{"native", func(a *ent.PaymentAttempt) { a.NativeCheckout = true }},
		{"unclaimed", func(a *ent.PaymentAttempt) { a.PostClaimed = false }},
		{"retired", func(a *ent.PaymentAttempt) { a.ActiveContractID = nil }},
		{"superseded", func(a *ent.PaymentAttempt) { a.ContractID = "another" }},
		{"expired", func(a *ent.PaymentAttempt) { a.ExpiresAt = now }},
		{"funds detected", func(a *ent.PaymentAttempt) { a.FundsDetectedAt = &now }},
		{"settled", func(a *ent.PaymentAttempt) { a.State = "settled" }},
		{"issue", func(a *ent.PaymentAttempt) { a.Issue = "evidence_conflict" }},
	} {
		t.Run(test.name, func(t *testing.T) {
			a := &ent.PaymentAttempt{ContractID: contract, ActiveContractID: &contract, PostClaimed: true, State: "awaiting_payment", ExpiresAt: now.Add(time.Minute)}
			if href := hostedLink(a, "123", now); href != "https://nowpayments.io/payment/?iid=123" {
				t.Fatal("eligible checkout did not recover canonical URL")
			}
			for _, id := range []string{"", "0", "01", "123&redirect=https://example.test", "../123", "1.2", "-1"} {
				if href := hostedLink(a, id, now); href != "" {
					t.Fatal("invalid provider reference produced a link")
				}
			}
			test.change(a)
			if href := hostedLink(a, "123", now); href != "" {
				t.Fatal("unsafe checkout reopened")
			}
		})
	}
}
