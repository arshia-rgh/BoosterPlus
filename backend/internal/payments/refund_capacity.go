package payments

import (
	"context"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// refundableAmount is a display snapshot, never approval authority. ProposeRefund
// rechecks the same reserve under its transaction and shared authorization fence before accepting.
func refundableAmount(ctx context.Context, client *ent.Client, receipt *ent.PaymentReceipt) (*string, error) {
	if receipt.State != "confirmed" {
		return nil, nil
	}
	remaining, err := nowpayments.Decimal(receipt.Amount).Rational()
	if err != nil {
		return nil, err
	}
	rows, err := client.MoneyTransfer.Query().Where(moneytransfer.ReceiptIDEQ(receipt.ID), moneytransfer.StateNEQ("cancelled")).Limit(101).All(ctx)
	if err != nil {
		return nil, err
	}
	if len(rows) > 100 {
		return nil, nil
	}
	for _, row := range rows {
		amount, e := refundAmount(row.Amount)
		if e != nil {
			return nil, e
		}
		remaining.Sub(remaining, amount)
	}
	if remaining.Sign() < 0 {
		return nil, ErrConflict
	}
	precision, exact := remaining.FloatPrec()
	if !exact || precision > 139 {
		return nil, ErrConflict
	}
	result := remaining.FloatString(precision)
	if strings.Contains(result, ".") {
		result = strings.TrimRight(strings.TrimRight(result, "0"), ".")
	}
	return &result, nil
}
