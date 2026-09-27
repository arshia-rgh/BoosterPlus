package payments

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/booking"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/secretbundle"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/availabilityevents"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resaleevents"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/shopevents"
)

func (s *Store) applyCaseOutcome(ctx context.Context, tx *ent.Tx, p *identity.Principal, record *ent.ServiceCase) error {
	row, err := tx.Order.Get(ctx, record.OrderID)
	if err != nil {
		return err
	}
	next := row.State
	switch record.Outcome {
	case "cancel":
		next = order.StateCancelled
		if err = resaleevents.CancelPaid(ctx, tx, row, s.instant()); err != nil {
			return err
		}
		if err = shopevents.CancelPaid(ctx, tx, row, s.instant()); err != nil {
			return err
		}
		if _, err = tx.OrderContract.UpdateOneID(row.CurrentContract).SetCapacityHeld(false).Save(ctx); err != nil {
			return err
		}
		if err = s.closeCaseBookings(ctx, tx, row.ID); err != nil {
			return err
		}
		if err = s.deleteCaseSecrets(ctx, tx, p, row.ID); err != nil {
			return err
		}
	case "continue", "rework":
		contract, e := tx.OrderContract.Get(ctx, row.CurrentContract)
		if e != nil {
			return e
		}
		if contract.PaymentState != ordercontract.PaymentStateSettled {
			return ErrConflict
		}
		if !contract.CapacityHeld && row.PackageKey != "" {
			if e = caseCapacity(ctx, tx, row); e != nil {
				return e
			}
			if _, e = tx.OrderContract.UpdateOneID(contract.ID).SetCapacityHeld(true).Save(ctx); e != nil {
				return e
			}
		}
		next = order.StateQueued
		if row.Kind == order.KindAccount {
			if e = s.deleteCaseSecrets(ctx, tx, p, row.ID); e != nil {
				return e
			}
			if _, e = tx.AccountDelivery.Update().Where(accountdelivery.OrderIDEQ(row.ID)).AddVersion(1).SetState("pending").SetSecretVersion(0).SetInstructions("").ClearDeliveredAt().ClearAcknowledgedAt().ClearDisputeUntil().SetUpdatedAt(s.instant()).Save(ctx); e != nil {
				return e
			}
			break
		}
		if row.Kind == order.KindShop {
			// Shop delivery keeps its own staff review record; never mutate booster work.
			held, holdErr := shopevents.HoldDeliveryAfterCase(ctx, tx, row, s.instant())
			if holdErr != nil {
				return holdErr
			}
			if held {
				next = order.StateOnHold
			}
			break
		}
		update := tx.Fulfillment.Update().Where(fulfillment.OrderIDEQ(row.ID)).AddVersion(1).AddAccessVersion(1).SetCompletionPending(false).SetCurrentNote("Case resolved; review handoff before resuming.")
		if record.Outcome == "rework" {
			update.SetProgress(0)
		}
		if _, e = update.Save(ctx); e != nil {
			return e
		}
	case "retain":
		if row.State == order.StateOnHold && (record.PreviousState == string(order.StateQueued) || record.PreviousState == string(order.StateInProgress)) {
			contract, e := tx.OrderContract.Get(ctx, row.CurrentContract)
			if e != nil {
				return e
			}
			if contract.PaymentState != ordercontract.PaymentStateSettled {
				return ErrConflict
			}
			next = order.StateQueued
		}
	default:
		return ErrInvalid
	}
	if row.Kind == order.KindShop && record.Outcome == "retain" && next == order.StateQueued {
		held, holdErr := shopevents.HoldDeliveryAfterCase(ctx, tx, row, s.instant())
		if holdErr != nil {
			return holdErr
		}
		if held {
			next = order.StateOnHold
		}
	}
	if err = s.event(ctx, tx, row, next, "case_resolved", "The service case was resolved. Review its decision and refund history for the agreed outcome."); err != nil {
		return err
	}
	return availabilityevents.Changed(ctx, tx, row.GameID)
}
func caseCapacity(ctx context.Context, tx *ent.Tx, row *ent.Order) error {
	release, err := decode[catalog.Release](row.Snapshot)
	if err != nil {
		return err
	}
	for _, pack := range release.Configuration.Packages {
		if pack.Key != row.PackageKey {
			continue
		}
		for _, variant := range pack.Variants {
			if variant.Key != row.VariantKey {
				continue
			}
			if variant.Capacity == nil {
				return nil
			}
			count, e := tx.OrderContract.Query().Where(ordercontract.GameIDEQ(row.GameID), ordercontract.PackageKeyEQ(row.PackageKey), ordercontract.VariantKeyEQ(row.VariantKey), ordercontract.CapacityHeldEQ(true)).Count(ctx)
			if e != nil {
				return e
			}
			if count >= *variant.Capacity {
				return ErrConflict
			}
			return nil
		}
	}
	return ErrConflict
}
func (s *Store) closeCaseBookings(ctx context.Context, tx *ent.Tx, id string) error {
	bookings, err := tx.Booking.Query().Where(booking.OrderIDEQ(id), booking.StateIn(booking.StateProposed, booking.StateConfirmed)).Limit(101).All(ctx)
	if err != nil {
		return err
	}
	if len(bookings) > 100 {
		return ErrConflict
	}
	for _, row := range bookings {
		if row.Version >= maxVersion {
			return ErrConflict
		}
		updated, e := tx.Booking.UpdateOneID(row.ID).AddVersion(1).SetState(booking.StateCancelled).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if _, e = tx.BookingEvent.Create().SetBookingID(row.ID).SetVersion(updated.Version).SetState("cancelled").SetNote("Order cancelled after case review.").SetActorRole("system").SetCreatedAt(s.instant()).Save(ctx); e != nil {
			return e
		}
	}
	return nil
}
func (s *Store) deleteCaseSecrets(ctx context.Context, tx *ent.Tx, p *identity.Principal, id string) error {
	rows, err := tx.SecretBundle.Query().Where(secretbundle.PurposeIn(secretbundle.PurposeGameAccess, secretbundle.PurposeAccountTransfer), secretbundle.ResourceIDEQ(id), secretbundle.StateEQ(secretbundle.StateActive)).Limit(101).All(ctx)
	if err != nil {
		return err
	}
	if len(rows) > 100 {
		return ErrConflict
	}
	for _, row := range rows {
		if row.Version >= maxVersion {
			return ErrConflict
		}
		count, e := tx.SecretBundle.Update().Where(secretbundle.IDEQ(row.ID), secretbundle.VersionEQ(row.Version), secretbundle.StateEQ(secretbundle.StateActive)).AddVersion(1).ClearEncryptedPayload().ClearWrappedKey().SetKeyVersion("").SetState(secretbundle.StateDeleted).SetUpdatedAt(s.instant()).Save(ctx)
		if e != nil {
			return e
		}
		if count == 1 {
			if e = s.audit(ctx, tx, p, "case_secret_deleted", row.ID); e != nil {
				return e
			}
		}
	}
	return nil
}
