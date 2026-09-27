package payments

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
)

// OutgoingProvider is separate from checkout activation: pausing sales must not erase refund history.
type OutgoingProvider interface {
	CheckRecipient(context.Context, string, nowpayments.Recipient) error
	CreatePayout(context.Context, nowpayments.PayoutRequest) (nowpayments.Payout, error)
	VerifyPayout(context.Context, string, string) error
	GetPayout(context.Context, string) (nowpayments.Payout, error)
	ListPayouts(context.Context, int) (nowpayments.PayoutPage, error)
}

// ConfigureOutgoing is called during construction before workers or HTTP serving begin.
func (s *Store) ConfigureOutgoing(provider OutgoingProvider, enabled bool) *Store {
	s.outgoing = provider
	s.outgoingEnabled = enabled
	return s
}

// RefundInput proposes a bounded exact amount from one confirmed receipt.
type RefundInput struct {
	RequestKey string `json:"request_key"`
	ReceiptID  string `json:"receipt_id"`
	Amount     string `json:"amount"`
	Terms      string `json:"terms"`
}

// RecipientInput is accepted only from the receipt owner with recent primary authentication.
type RecipientInput struct {
	Version int    `json:"version"`
	Address string `json:"address"`
	Memo    string `json:"memo"`
	Accept  bool   `json:"accept"`
}

// TransferChange authorizes a specific immutable revision; the provider code is ephemeral.
type TransferChange struct {
	Version int    `json:"version"`
	Reason  string `json:"reason"`
	Code    string `json:"code"`
}

// SellerAgreement preserves the accepted per-offer model, fees and due conditions.
type SellerAgreement struct {
	ID         string             `json:"id"`
	AcceptedAt *time.Time         `json:"accepted_at"`
	Terms      resale.SellerTerms `json:"terms"`
}

// TransferView is private to the beneficiary and authorized finance staff.
type TransferView struct {
	SellerAgreement *SellerAgreement      `json:"seller_agreement,omitempty"`
	ID              string                `json:"id"`
	CaseID          string                `json:"case_id"`
	ReceiptID       string                `json:"receipt_id"`
	OrderID         string                `json:"order_id"`
	Kind            string                `json:"kind"`
	Currency        string                `json:"currency"`
	Network         string                `json:"network"`
	Amount          string                `json:"amount"`
	Terms           string                `json:"terms"`
	State           string                `json:"state"`
	Issue           string                `json:"issue"`
	Version         int                   `json:"version"`
	Recipient       nowpayments.Recipient `json:"recipient"`
	RecipientAt     *time.Time            `json:"recipient_at"`
	ApprovedAt      *time.Time            `json:"approved_at"`
	CreatedAt       time.Time             `json:"created_at"`
	UpdatedAt       time.Time             `json:"updated_at"`
}
