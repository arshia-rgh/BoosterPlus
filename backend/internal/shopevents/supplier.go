package shopevents

import (
	"context"
	"encoding/json"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentallocation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

// supplierOrder recognizes only a persisted binding, never a client-supplied
// flag or a queue hint. Legacy manually fulfilled shops retain their stock path.
func supplierOrder(ctx context.Context, tx *ent.Tx, purchase *ent.Order) (bool, error) {
	row, err := tx.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(purchase.ID)).Only(ctx)
	if ent.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if row.UserID != purchase.UserID || row.ContractID != purchase.CurrentContract || purchase.Kind != order.KindShop {
		return false, ErrConflict
	}
	return true, nil
}

// ScheduleSupplier runs inside the payment allocation transaction, after the
// contract is settled and the order is queued. Dispatch rechecks every fact.
func ScheduleSupplier(ctx context.Context, tx *ent.Tx, purchase *ent.Order) error {
	if purchase.Kind != order.KindShop {
		return nil
	}
	row, err := tx.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(purchase.ID)).Only(ctx)
	if ent.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return err
	}
	latest, err := tx.Order.Get(ctx, purchase.ID)
	if err != nil {
		return err
	}
	if row.UserID != latest.UserID || row.ContractID != latest.CurrentContract {
		return ErrConflict
	}
	if latest.State != order.StateQueued {
		return nil
	}
	contract, err := tx.OrderContract.Get(ctx, row.ContractID)
	if err != nil {
		return err
	}
	allocation, err := tx.PaymentAllocation.Query().Where(paymentallocation.ContractIDEQ(row.ContractID), paymentallocation.OrderIDEQ(row.OrderID)).Only(ctx)
	if err != nil {
		return err
	}
	receipt, err := tx.PaymentReceipt.Get(ctx, allocation.ReceiptID)
	if err != nil {
		return err
	}
	if contract.PaymentState != ordercontract.PaymentStateSettled || receipt.State != "confirmed" || receipt.UserID != row.UserID || receipt.OrderID != row.OrderID || allocation.AmountMinor != row.AmountMinor || allocation.Currency != "USD" {
		return ErrConflict
	}
	payload, err := json.Marshal(map[string]string{"purchase_id": row.ID})
	if err != nil {
		return err
	}
	_, err = jobs.EnqueueEntTx(ctx, tx, "supplier.dispatch", "supplier-paid:"+row.ID, payload)
	return err
}
