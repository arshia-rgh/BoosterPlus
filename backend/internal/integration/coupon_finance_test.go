//go:build integration

package integration

import (
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/couponclaim"
)

func TestCouponRedemptionFollowsReceiptAndSurvivesReplaysAndReversal(t *testing.T) {
	f := paymentDB(t)
	ctx := t.Context()
	policy := couponPolicy()
	coupon, err := f.base.catalog.SaveCoupon(ctx, f.base.admin, "", 0, policy)
	if err != nil {
		t.Fatal(err)
	}
	input := f.base.input("package")
	input.CouponCode = policy.Code
	input.ExpectedAmount = "617"
	input.ExpectedCouponVersion = coupon.Version
	d, err := f.base.store.Create(ctx, f.base.buyer, input)
	if err != nil {
		t.Fatal(err)
	}
	claim, err := f.base.auth.client.CouponClaim.Query().Where(couponclaim.ContractIDEQ(d.Contract.ID)).Only(ctx)
	if err != nil || claim.State != couponclaim.StateHeld {
		t.Fatal("unpaid coupon not held", err)
	}
	a := f.start(t, d)
	f.issue(t, a)
	evidence := f.evidence(t, a, "945", "finished", "12.34000001")
	evidence.PriceAmount = "6.17"
	f.reconcile(t, evidence)
	f.reconcile(t, evidence)
	claim, err = f.base.auth.client.CouponClaim.Get(ctx, claim.ID)
	if err != nil || claim.State != couponclaim.StateRedeemed {
		t.Fatal("verified coupon not redeemed", err)
	}
	evidence.Status = "refunded"
	f.reconcile(t, evidence)
	claim, err = f.base.auth.client.CouponClaim.Get(ctx, claim.ID)
	if err != nil || claim.State != couponclaim.StateRedeemed {
		t.Fatal("reversal reissued spent coupon", err)
	}
}
