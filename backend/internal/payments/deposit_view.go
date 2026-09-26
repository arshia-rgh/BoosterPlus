package payments

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"slices"
	"strings"
	"time"

	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/qr"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// The QR carries the address alone. Asset, amount and memo stay independently
// labeled; inventing wallet-specific URIs could silently lose a destination tag.
func destinationQR(address string) (string, error) {
	code, err := qr.Encode(address, qr.M, qr.Auto)
	if err != nil {
		return "", err
	}
	modules := code.Bounds().Dx()
	const scale = 4
	scaled, err := barcode.Scale(code, modules*scale, modules*scale)
	if err != nil {
		return "", err
	}
	// Four modules of white quiet zone on each side are required for scanning.
	side := (modules + 8) * scale
	picture := image.NewRGBA(image.Rect(0, 0, side, side))
	draw.Draw(picture, picture.Bounds(), image.NewUniform(color.White), image.Point{}, draw.Src)
	draw.Draw(picture, image.Rect(4*scale, 4*scale, side-4*scale, side-4*scale), scaled, scaled.Bounds().Min, draw.Src)
	var encoded bytes.Buffer
	if err = png.Encode(&encoded, picture); err != nil {
		return "", err
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(encoded.Bytes()), nil
}

func depositView(attempt *ent.PaymentAttempt, p nowpayments.Payment, now time.Time) (*Deposit, error) {
	if !attempt.NativeCheckout || attempt.ActiveContractID == nil || attempt.InvoiceID == nil || matching(attempt, p) != "" || p.Status != "waiting" || !nowpayments.ValidDestination(p.Destination) || !p.Destination.ExpiresAt.After(now) || !attempt.ExpiresAt.After(now) || attempt.FundsDetectedAt != nil {
		return nil, nil
	}
	if slices.Contains([]string{"xrp", "xlm", "eos", "bnbmainnet", "ton"}, p.PayCurrency) && p.Destination.Memo == "" {
		return nil, nil
	}
	if p.Network == "" || attempt.DepositPaymentID != "" && attempt.DepositPaymentID != p.ID {
		return nil, nil
	}
	paid, err := p.ActuallyPaid.Rational()
	if err != nil || paid.Sign() != 0 {
		return nil, err
	}
	amount, err := p.PayAmount.Rational()
	if err != nil || amount.Sign() <= 0 {
		return nil, err
	}
	expiry := p.Destination.ExpiresAt.UTC()
	if attempt.ExpiresAt.Before(expiry) {
		expiry = attempt.ExpiresAt
	}
	qrData, err := destinationQR(p.Destination.Address)
	if err != nil {
		return nil, err
	}
	// Decimal's accepted exponent/fraction bounds need at most 139 places.
	exact := strings.TrimRight(strings.TrimRight(amount.FloatString(140), "0"), ".")
	return &Deposit{PaymentID: p.ID, Address: p.Destination.Address, Memo: p.Destination.Memo, Amount: exact, Currency: p.PayCurrency, Network: p.Network, ExpiresAt: expiry, CheckedAt: now, ValidUntil: minTime(expiry, now.Add(2*time.Minute)), QR: qrData}, nil
}

func minTime(a, b time.Time) time.Time {
	if a.Before(b) {
		return a
	}
	return b
}

// Only the owned order history exposes fresh instructions, never a finance list.
// The freshness limit is a display safeguard, not a commercial expiry promise.
func (s *Store) projectDeposit(row *ent.PaymentAttempt, view *Attempt) {
	if !row.NativeCheckout {
		return
	}
	view.CheckoutURL = ""
	now := s.instant()
	switch {
	case row.Account != s.account || row.State == "exception" || row.State == "uncertain" || row.Issue == "instructions_unavailable":
		view.InstructionStatus = "review_required"
		return
	case row.ActiveContractID == nil || row.State == "closed" || row.State == "settled" || row.FundsDetectedAt != nil || row.State == "confirming":
		view.InstructionStatus = "closed"
		return
	case !row.ExpiresAt.After(now):
		view.InstructionStatus = "expired"
		return
	case row.Issue != "":
		view.InstructionStatus = "refreshing"
		return
	}
	if row.DepositData == nil {
		view.InstructionStatus = "preparing"
		return
	}
	deposit, err := decode[Deposit](row.DepositData)
	if err != nil || deposit.PaymentID != row.DepositPaymentID || deposit.CheckedAt.After(now) {
		view.InstructionStatus = "review_required"
		return
	}
	if !deposit.ExpiresAt.After(now) {
		view.InstructionStatus = "expired"
		return
	}
	if !deposit.ValidUntil.After(now) || row.State != "awaiting_payment" {
		view.InstructionStatus = "refreshing"
		return
	}
	view.InstructionStatus = "ready"
	view.Deposit = &deposit
}
