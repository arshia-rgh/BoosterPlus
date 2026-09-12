package reports

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentreceipt"
)

func (s *Store) receipts(ctx context.Context, tx *ent.Tx, q Query, b bounds, r *Report) error {
	r.Basis = "Receipts first recorded in [from, to), UTC; current evidence state and exact crypto quantity at observation time. Only confirmed receipts represent verified received funds. No fiat conversion, net revenue or cross-currency total."
	r.Columns = []Column{{"id", "Receipt ID"}, {"created_at", "First recorded (UTC)"}, {"updated_at", "Evidence updated (UTC)"}, {"order_id", "Order ID"}, {"state", "Evidence state"}, {"currency", "Crypto asset"}, {"network", "Network"}, {"amount", "Exact crypto quantity"}}
	query := tx.PaymentReceipt.Query().Where(paymentreceipt.CreatedAtGTE(b.from), paymentreceipt.CreatedAtLT(b.to)).Order(ent.Asc(paymentreceipt.FieldCreatedAt), ent.Asc(paymentreceipt.FieldID)).Limit(101)
	if q.State != "" {
		query.Where(paymentreceipt.StateEQ(q.State))
	}
	if q.Search != "" {
		query.Where(paymentreceipt.Or(paymentreceipt.IDEQ(q.Search), paymentreceipt.OrderIDEQ(q.Search), paymentreceipt.CurrencyEQ(q.Search)))
	}
	if q.After != "" {
		query.Where(paymentreceipt.Or(paymentreceipt.CreatedAtGT(b.afterTime), paymentreceipt.And(paymentreceipt.CreatedAtEQ(b.afterTime), paymentreceipt.IDGT(b.afterID))))
	}
	rows, e := query.Select(paymentreceipt.FieldID, paymentreceipt.FieldCreatedAt, paymentreceipt.FieldUpdatedAt, paymentreceipt.FieldOrderID, paymentreceipt.FieldState, paymentreceipt.FieldCurrency, paymentreceipt.FieldNetwork, paymentreceipt.FieldAmount).All(ctx)
	if e != nil {
		return e
	}
	if len(rows) > 100 {
		r.Next = s.cursor(q, rows[99].CreatedAt, rows[99].ID)
		rows = rows[:100]
	}
	for _, v := range rows {
		r.Rows = append(r.Rows, []string{v.ID, instant(v.CreatedAt), instant(v.UpdatedAt), v.OrderID, v.State, v.Currency, v.Network, v.Amount})
	}
	return nil
}
func (s *Store) transfers(ctx context.Context, tx *ent.Tx, q Query, b bounds, r *Report) error {
	r.Basis = "Obligations created in [from, to), UTC; current execution state. Only confirmed records represent independently verified outgoing transfers. Pending obligations are not paid expenses. Quantities remain separated by crypto asset and network; no conversion or net revenue total."
	r.Columns = []Column{{"id", "Obligation ID"}, {"created_at", "Obligation created (UTC)"}, {"updated_at", "State updated (UTC)"}, {"order_id", "Order ID"}, {"state", "Execution state"}, {"currency", "Crypto asset"}, {"network", "Network"}, {"amount", "Exact crypto quantity"}}
	kind := "refund"
	if q.Kind == "payouts" {
		kind = "seller_payout"
	}
	query := tx.MoneyTransfer.Query().Where(moneytransfer.KindEQ(kind), moneytransfer.CreatedAtGTE(b.from), moneytransfer.CreatedAtLT(b.to)).Order(ent.Asc(moneytransfer.FieldCreatedAt), ent.Asc(moneytransfer.FieldID)).Limit(101)
	if q.State != "" {
		query.Where(moneytransfer.StateEQ(q.State))
	}
	if q.Search != "" {
		query.Where(moneytransfer.Or(moneytransfer.IDEQ(q.Search), moneytransfer.OrderIDEQ(q.Search), moneytransfer.CurrencyEQ(q.Search)))
	}
	if q.After != "" {
		query.Where(moneytransfer.Or(moneytransfer.CreatedAtGT(b.afterTime), moneytransfer.And(moneytransfer.CreatedAtEQ(b.afterTime), moneytransfer.IDGT(b.afterID))))
	}
	rows, e := query.Select(moneytransfer.FieldID, moneytransfer.FieldCreatedAt, moneytransfer.FieldUpdatedAt, moneytransfer.FieldOrderID, moneytransfer.FieldState, moneytransfer.FieldCurrency, moneytransfer.FieldNetwork, moneytransfer.FieldAmount).All(ctx)
	if e != nil {
		return e
	}
	if len(rows) > 100 {
		r.Next = s.cursor(q, rows[99].CreatedAt, rows[99].ID)
		rows = rows[:100]
	}
	for _, v := range rows {
		r.Rows = append(r.Rows, []string{v.ID, instant(v.CreatedAt), instant(v.UpdatedAt), v.OrderID, v.State, v.Currency, v.Network, v.Amount})
	}
	return nil
}
