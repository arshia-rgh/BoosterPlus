package reviews

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountdelivery"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentallocation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentreceipt"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/servicecase"
)

func eligible(ctx context.Context, c *ent.Client, row *ent.Order) (bool, error) {
	if row.State != order.StateCompleted || row.CurrentContract == "" {
		return false, nil
	}
	switch row.Kind {
	case order.KindCustom, order.KindPackage:
	case order.KindAccount:
		listing, err := c.AccountListing.Get(ctx, row.ListingID)
		if err != nil {
			return false, err
		}
		if listing.SellerID == row.UserID {
			return false, nil
		}
		acknowledged, err := c.AccountDelivery.Query().Where(accountdelivery.OrderIDEQ(row.ID), accountdelivery.BuyerIDEQ(row.UserID), accountdelivery.StateEQ("acknowledged")).Exist(ctx)
		if err != nil || !acknowledged {
			return false, err
		}
	default:
		return false, nil
	}
	settled, err := c.OrderContract.Query().Where(ordercontract.IDEQ(row.CurrentContract), ordercontract.OrderIDEQ(row.ID), ordercontract.ActiveOrderIDEQ(row.ID), ordercontract.UserIDEQ(row.UserID), ordercontract.PaymentStateEQ(ordercontract.PaymentStateSettled)).Exist(ctx)
	if err != nil || !settled {
		return false, err
	}
	return confirmedPurchase(ctx, c, row)
}
func confirmedPurchase(ctx context.Context, c *ent.Client, row *ent.Order) (bool, error) {
	allocation, err := c.PaymentAllocation.Query().Where(paymentallocation.ContractIDEQ(row.CurrentContract), paymentallocation.OrderIDEQ(row.ID)).Only(ctx)
	if ent.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return c.PaymentReceipt.Query().Where(paymentreceipt.IDEQ(allocation.ReceiptID), paymentreceipt.OrderIDEQ(row.ID), paymentreceipt.UserIDEQ(row.UserID), paymentreceipt.StateEQ("confirmed")).Exist(ctx)
}

// Public status changes preserve feedback, including low ratings, without disclosing case contents.
func financialStatus(ctx context.Context, c *ent.Client, purchase *ent.Order, initial string) (string, error) {
	if purchase == nil {
		return initial, nil
	}
	verified, err := confirmedPurchase(ctx, c, purchase)
	if err != nil {
		return "", err
	}
	if !verified {
		return "purchase_status_updated", nil
	}
	active, err := c.ServiceCase.Query().Where(servicecase.ActiveOrderIDEQ(purchase.ID)).Exist(ctx)
	if err != nil {
		return "", err
	}
	if active {
		return "dispute_in_progress", nil
	}
	refunded, err := c.MoneyTransfer.Query().Where(moneytransfer.OrderIDEQ(purchase.ID), moneytransfer.KindEQ("refund"), moneytransfer.StateEQ("confirmed")).Exist(ctx)
	if err != nil {
		return "", err
	}
	if refunded {
		return "refund_recorded", nil
	}
	return initial, nil
}
