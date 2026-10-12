package payments

import (
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

// hostedLink restores only an authenticated invoice's canonical provider URL.
// Callers must first match provider evidence to this merchant and agreement.
// A terminal, paid, native or superseded attempt can never regain a pay link.
func hostedLink(attempt *ent.PaymentAttempt, invoiceID string, now time.Time) string {
	if !providerPattern.MatchString(invoiceID) || attempt.NativeCheckout || !attempt.PostClaimed ||
		attempt.ActiveContractID == nil || *attempt.ActiveContractID != attempt.ContractID ||
		attempt.FundsDetectedAt != nil || !attempt.ExpiresAt.After(now) || attempt.Issue != "" ||
		attempt.State != "awaiting_payment" {
		return ""
	}
	return "https://nowpayments.io/payment/?iid=" + invoiceID
}
