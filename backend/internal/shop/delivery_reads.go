package shop

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentallocation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shoprecipient"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// DeliveryView retains order identity and accepted terms without disclosing identifiers.
type DeliveryView struct {
	OrderState        string    `json:"order_state"`
	OrderID           string    `json:"order_id"`
	OrderVersion      int       `json:"order_version"`
	Version           int       `json:"version"`
	State             string    `json:"state"`
	AssignedID        string    `json:"assigned_id,omitempty"`
	Note              string    `json:"note"`
	ProofMessageID    string    `json:"proof_message_id"`
	UpdatedAt         time.Time `json:"updated_at"`
	RecipientProvided bool      `json:"recipient_provided"`
	Purchase          Purchase  `json:"purchase"`
}

func shopOrder(ctx context.Context, tx *ent.Tx, p *identity.Principal, id string, admin bool) (*ent.Order, error) {
	query := tx.Order.Query().Where(order.IDEQ(id), order.KindEQ(order.KindShop))
	if !admin {
		query.Where(order.UserIDEQ(p.User.ID))
	}
	return query.Only(ctx)
}
func recipient(ctx context.Context, tx *ent.Tx, row *ent.Order) (*ent.ShopRecipient, error) {
	return tx.ShopRecipient.Query().Where(shoprecipient.OrderIDEQ(row.ID), shoprecipient.UserIDEQ(row.UserID), shoprecipient.ErasedAtIsNil()).Only(ctx)
}
func paidShop(ctx context.Context, tx *ent.Tx, row *ent.Order, purchase Purchase) error {
	contract, err := tx.OrderContract.Query().Where(ordercontract.IDEQ(row.CurrentContract), ordercontract.OrderIDEQ(row.ID), ordercontract.ActiveOrderIDEQ(row.ID), ordercontract.UserIDEQ(row.UserID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateSettled)).Only(ctx)
	if ent.IsNotFound(err) {
		return ErrConflict
	}
	if err != nil {
		return err
	}
	allocation, err := tx.PaymentAllocation.Query().Where(paymentallocation.ContractIDEQ(contract.ID), paymentallocation.OrderIDEQ(row.ID)).Only(ctx)
	if ent.IsNotFound(err) {
		return ErrConflict
	}
	if err != nil {
		return err
	}
	evidence, err := tx.PaymentReceipt.Get(ctx, allocation.ReceiptID)
	if ent.IsNotFound(err) {
		return ErrConflict
	}
	if err != nil {
		return err
	}
	if evidence.OrderID != row.ID || evidence.UserID != row.UserID || evidence.State != "confirmed" || allocation.AmountMinor != purchase.AmountMinor || allocation.Currency != purchase.Variant.Currency {
		return ErrConflict
	}
	reserved, err := tx.ShopReservation.Query().Where(shopreservation.OrderIDEQ(row.ID), shopreservation.UserIDEQ(row.UserID), shopreservation.StateEQ("paid")).Only(ctx)
	if ent.IsNotFound(err) {
		return ErrConflict
	}
	if err != nil {
		return err
	}
	if reserved.ProductID != purchase.ProductID || reserved.ReleaseID != purchase.ReleaseID || reserved.VariantKey != purchase.Variant.Key || reserved.Quantity != purchase.Quantity {
		return ErrConflict
	}
	return nil
}
func deliveryView(ctx context.Context, tx *ent.Tx, row *ent.Order, admin bool) (DeliveryView, error) {
	purchase, err := purchaseSnapshot(row)
	if err != nil {
		return DeliveryView{}, err
	}
	out := DeliveryView{OrderState: string(row.State), OrderID: row.ID, OrderVersion: row.Version, State: string(row.State), UpdatedAt: row.UpdatedAt, Purchase: purchase}
	values, err := recipient(ctx, tx, row)
	if err != nil && !ent.IsNotFound(err) {
		return DeliveryView{}, err
	}
	out.RecipientProvided = values != nil && ValidateRecipient(purchase.Product.Recipient, values.RecipientValues) == nil
	work, err := tx.ShopDelivery.Query().Where(shopdelivery.OrderIDEQ(row.ID)).Only(ctx)
	if ent.IsNotFound(err) {
		return out, nil
	}
	if err != nil {
		return DeliveryView{}, err
	}
	out.Version, out.State, out.Note, out.ProofMessageID, out.UpdatedAt = work.Version, work.State, work.Note, work.ProofMessageID, work.UpdatedAt
	if admin {
		out.AssignedID = work.AssignedID
	}
	return out, nil
}

// Delivery rechecks the current customer/admin portal inside the read transaction.
func (s *Store) Delivery(ctx context.Context, p *identity.Principal, id string, admin bool) (out DeliveryView, err error) {
	if !validID(id) {
		return out, ErrInvalid
	}
	capability := "account"
	if admin {
		capability = "admin"
	}
	err = s.auth.AuthorizedTransaction(ctx, p, capability, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := shopOrder(ctx, tx, current, id, admin)
		if e != nil {
			return e
		}
		out, e = deliveryView(ctx, tx, row, admin)
		return e
	})
	if err != nil {
		return DeliveryView{}, err
	}
	return out, nil
}
