package supply

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

// projectDelivery reports supplier evidence without manufacturing manual proofs,
// automatic customer refunds or completion of partial deliveries.
func (s *Purchaser) projectDelivery(ctx context.Context, tx *ent.Tx, purchase *ent.SupplierPurchase, state, issue string) error {
	row, err := tx.Order.Get(ctx, purchase.OrderID)
	if err != nil {
		return err
	}
	if row.State != order.StateQueued && row.State != order.StateInProgress {
		return nil
	}
	next, action, message := row.State, "", ""
	switch {
	case issue != "" || state == "partial" || state == "cancelled":
		next, action, message = order.StateOnHold, "supplier_delivery_review", "Delivery needs support review. You do not need to pay again. Open Messages for help."
	case state == "completed":
		next, action, message = order.StateCompleted, "approve_completion", "The supplier confirmed delivery. Review your items or protected codes in Delivery."
	case state == "pending":
		next, action, message = order.StateInProgress, "supplier_delivery_started", "Payment is confirmed and your delivery is in progress. Check Delivery for any action needed."
	}
	if next == row.State || action == "" {
		return nil
	}
	if !validVersion(row.Version) {
		return ErrConflict
	}
	row, err = tx.Order.UpdateOne(row).SetState(next).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx)
	if err != nil {
		return err
	}
	entry, err := tx.OrderEvent.Create().SetOrderID(row.ID).SetVersion(row.Version).SetAction(action).SetMessage(message).SetActorRole("system").SetActorID("").SetCreatedAt(s.now()).Save(ctx)
	if err != nil {
		return err
	}
	return notifications.Enqueue(ctx, tx, row.UserID, row.ID, entry.ID, "order_customer", s.now())
}

func scheduleDispatch(ctx context.Context, tx *ent.Tx, row *ent.SupplierPurchase) error {
	payload, err := json.Marshal(map[string]string{"purchase_id": row.ID})
	if err != nil {
		return err
	}
	_, err = jobs.EnqueueEntTx(ctx, tx, "supplier.dispatch", "supplier-wake:"+row.ID+":"+strconv.Itoa(row.Version), payload)
	return err
}

// RevealCodesInTransaction requires the current owning customer and settled
// evidence again. Private codes never go into notifications or ordinary views.
func (s *Purchaser) RevealCodesInTransaction(ctx context.Context, tx *ent.Tx, p *identity.Principal, orderID string) ([]suppliers.DeliveredKey, error) {
	if p.User.Role != identity.RoleCustomer || p.Session.Portal != string(identity.PortalCustomer) {
		return nil, identity.ErrForbidden
	}
	row, err := tx.SupplierPurchase.Query().Where(supplierpurchase.OrderIDEQ(orderID), supplierpurchase.UserIDEQ(p.User.ID)).Only(ctx)
	if err != nil {
		return nil, err
	}
	if row.State != "completed" || row.Issue != "" || row.DeliverySecretID == "" {
		return nil, ErrConflict
	}
	if err = paymentEvidence(ctx, tx, row, true); err != nil {
		return nil, err
	}
	secret, err := tx.SecretBundle.Get(ctx, row.DeliverySecretID)
	if err != nil {
		return nil, err
	}
	if secret.Purpose != secretbundle.PurposeSupplierDelivery || secret.ResourceID != row.ID || secret.OwnerID != p.User.ID || secret.State != secretbundle.StateActive || !secret.ExpiresAt.After(s.now()) || secret.CipherOwnerID != "" {
		return nil, ErrUnavailable
	}
	raw, err := s.keys.Open(secret.ID, vault.Scope{Purpose: "supplier_delivery", ResourceID: row.ID, OwnerID: p.User.ID}, vault.Envelope{KeyID: secret.KeyVersion, WrappedKey: secret.WrappedKey, Payload: secret.EncryptedPayload})
	if err != nil {
		return nil, err
	}
	defer clear(raw)
	var keys []suppliers.DeliveredKey
	if json.Unmarshal(raw, &keys) != nil || len(keys) == 0 {
		return nil, ErrUnavailable
	}
	if err = audit(ctx, tx, p.User.ID, row.ID, "codes_revealed", row.Version, s.now()); err != nil {
		return nil, err
	}
	return keys, nil
}

// WakePaid queues only unclaimed, currently paid obligations after a temporary
// pause/case. The create fence and final price read remain in Dispatch.
func (s *Purchaser) WakePaid(ctx context.Context) error {
	if !s.enabled {
		return nil
	}
	rows, err := s.client.SupplierPurchase.Query().Where(supplierpurchase.PostClaimedEQ(false), supplierpurchase.StateIn("awaiting_payment", "checking"), supplierpurchase.NextCheckLTE(s.now())).Order(ent.Asc(supplierpurchase.FieldNextCheck)).Limit(20).All(ctx)
	if err != nil {
		return err
	}
	for _, row := range rows {
		err = s.transaction(ctx, func(tx *ent.Tx) error {
			current, e := tx.SupplierPurchase.Get(ctx, row.ID)
			if e != nil {
				return e
			}
			if current.PostClaimed {
				return nil
			}
			if current, e = tx.SupplierPurchase.UpdateOne(current).SetNextCheck(s.now().Add(time.Minute)).AddVersion(1).Save(ctx); e != nil {
				return e
			}
			// Unpaid/closed/paused purchases are not errors and cannot spend.
			for _, check := range []error{paid(ctx, tx, current), s.purchaseConnection(ctx, tx, current, true)} {
				if check == nil {
					continue
				}
				if errors.Is(check, ErrConflict) || errors.Is(check, ErrUnavailable) || errors.Is(check, identity.ErrForbidden) || errors.Is(check, suppliers.ErrReadOnly) || ent.IsNotFound(check) {
					return nil
				}
				return check
			}
			return scheduleDispatch(ctx, tx, current)
		})
		if err != nil {
			return err
		}
	}
	return nil
}
