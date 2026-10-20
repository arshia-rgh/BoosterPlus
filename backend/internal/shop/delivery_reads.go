package shop

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentallocation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shoprecipient"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// DeliveryView retains order identity and accepted terms without disclosing identifiers.
type DeliveryView struct {
	OrderState        string                `json:"order_state"`
	OrderID           string                `json:"order_id"`
	OrderVersion      int                   `json:"order_version"`
	Version           int                   `json:"version"`
	State             string                `json:"state"`
	AssignedID        string                `json:"assigned_id,omitempty"`
	Note              string                `json:"note"`
	ProofMessageID    string                `json:"proof_message_id"`
	UpdatedAt         time.Time             `json:"updated_at"`
	RecipientProvided bool                  `json:"recipient_provided"`
	Purchase          Purchase              `json:"purchase"`
	Supplier          *SupplierDeliveryView `json:"supplier,omitempty"`
}

// SupplierDeliveryView is a safe status projection, without protected inputs,
// keys, supplier cost or provider-specific diagnostics.
type SupplierDeliveryView struct {
	State          string `json:"state"`
	Requested      string `json:"requested"`
	Delivered      string `json:"delivered"`
	NeedsReview    bool   `json:"needs_review"`
	CodesAvailable bool   `json:"codes_available"`
	Testing        bool   `json:"testing"`
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
func (s *Store) deliveryView(ctx context.Context, tx *ent.Tx, row *ent.Order, admin bool) (DeliveryView, error) {
	purchase, err := purchaseSnapshot(row)
	if err != nil {
		return DeliveryView{}, err
	}
	out := DeliveryView{OrderState: string(row.State), OrderID: row.ID, OrderVersion: row.Version, State: string(row.State), UpdatedAt: row.UpdatedAt, Purchase: purchase}
	if purchase.Product.Supplier != nil {
		delivery, e := tx.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(row.ID), supplierpurchase.UserIDEQ(row.UserID), supplierpurchase.ContractIDEQ(row.CurrentContract)).Only(ctx)
		if e != nil {
			return DeliveryView{}, e
		}
		out.Version, out.State, out.UpdatedAt = delivery.Version, delivery.State, delivery.UpdatedAt
		out.RecipientProvided = delivery.InputSecretID != ""
		out.Supplier = &SupplierDeliveryView{State: delivery.State, Requested: delivery.Quantity, Delivered: delivery.Delivered, NeedsReview: delivery.State == "held" || delivery.State == "cancelled" || delivery.State == "partial" || delivery.Issue == "duplicate_provider_orders" || delivery.Issue == "identity_mismatch" || delivery.Issue == "terminal_state_changed" || delivery.Issue == "search_limit_review", CodesAvailable: delivery.DeliverySecretID != "" && delivery.State == "completed", Testing: purchase.Product.Supplier.Testing}
		blocked := row.State != order.StateAwaitingPayment && row.State != order.StateQueued && row.State != order.StateInProgress && row.State != order.StateCompleted
		activeCase, e := tx.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(row.ID)).Exist(ctx)
		if e != nil {
			return DeliveryView{}, e
		}
		blocked = blocked || activeCase
		out.Supplier.NeedsReview = out.Supplier.NeedsReview || blocked
		out.Supplier.CodesAvailable = out.Supplier.CodesAvailable && !blocked && delivery.Issue == ""
		if out.Supplier.CodesAvailable {
			out.Supplier.CodesAvailable, e = tx.SecretBundle.Query().Where(secretbundle.IDEQ(delivery.DeliverySecretID), secretbundle.OwnerIDEQ(row.UserID), secretbundle.ResourceIDEQ(delivery.ID), secretbundle.PurposeEQ(secretbundle.PurposeSupplierDelivery), secretbundle.StateEQ(secretbundle.StateActive), secretbundle.ExpiresAtGT(s.now())).Exist(ctx)
			if e != nil {
				return DeliveryView{}, e
			}
		}
		return out, nil
	}
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
		out, e = s.deliveryView(ctx, tx, row, admin)
		return e
	})
	if err != nil {
		return DeliveryView{}, err
	}
	return out, nil
}
