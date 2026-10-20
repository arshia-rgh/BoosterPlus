package supply

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierpurchase"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

const purchaseLease = 2 * time.Minute

// Dispatch claims before the only create POST. Once post_claimed is committed,
// even a crash before sending may only reconcile; it can never create again.
func (s *Purchaser) Dispatch(ctx context.Context, id string) error {
	if !validID(id) {
		return ErrInvalid
	}
	var row *ent.SupplierPurchase
	lease := uuid.NewString()
	claimed := false
	err := s.transaction(ctx, func(tx *ent.Tx) error {
		var e error
		row, e = tx.SupplierPurchase.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.PostClaimed {
			return nil
		}
		if e = s.purchaseConnection(ctx, tx, row, true); e != nil {
			return e
		}
		if row.State != "awaiting_payment" && row.State != "checking" {
			return nil
		}
		if row.LeaseUntil != nil && row.LeaseUntil.After(s.now()) {
			return ErrConflict
		}
		if e = paid(ctx, tx, row); e != nil {
			return e
		}
		row, e = tx.SupplierPurchase.UpdateOne(row).SetState("checking").SetLeaseOwner(lease).SetLeaseUntil(s.now().Add(purchaseLease)).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx)
		claimed = e == nil
		return e
	})
	if err != nil {
		return err
	}
	if row.PostClaimed {
		return s.Reconcile(ctx, id)
	}
	if !claimed {
		return nil
	}
	provider := s.providers[suppliers.Connection(row.ConnectionID)]
	if row.Product == nil {
		return s.beforeSendFailure(ctx, row.ID, lease, "binding_invalid")
	}
	quote, err := provider.QuoteOffer(ctx, *row.Product, row.OfferID, suppliers.Decimal(row.Quantity))
	if err != nil {
		return s.beforeSendFailure(ctx, row.ID, lease, "product_review")
	}
	cost, e1 := quote.TotalCost.Rational()
	maximum, e2 := suppliers.Decimal(row.MaximumCost).Rational()
	if e1 != nil || e2 != nil || cost.Sign() <= 0 || cost.Cmp(maximum) > 0 || quote.Connection != suppliers.Connection(row.ConnectionID) || quote.MerchantID != row.MerchantID || quote.Product.ID != row.Product.ID || quote.Offer.ID != row.OfferID || quote.Quantity != suppliers.Decimal(row.Quantity) {
		return s.beforeSendFailure(ctx, row.ID, lease, "price_review")
	}
	input, err := request(row)
	if err != nil {
		return s.beforeSendFailure(ctx, row.ID, lease, "binding_invalid")
	}
	defer func() { clear(input.Values) }()
	err = s.transaction(ctx, func(tx *ent.Tx) error {
		current, e := tx.SupplierPurchase.Get(ctx, id)
		if e != nil {
			return e
		}
		if current.PostClaimed || current.State != "checking" || current.LeaseOwner != lease || current.LeaseUntil == nil || !current.LeaseUntil.After(s.now()) {
			return ErrConflict
		}
		if e = s.purchaseConnection(ctx, tx, current, true); e != nil {
			return e
		}
		if e = paid(ctx, tx, current); e != nil {
			return e
		}
		input.Values, e = s.inputs(ctx, tx, current, input.Offer.Fields)
		if e != nil {
			return e
		}
		_, e = tx.SupplierPurchase.UpdateOne(current).SetPostClaimed(true).SetState("sending").SetNextCheck(s.now().Add(purchaseLease)).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		return audit(ctx, tx, "", id, "purchase_claimed", current.Version+1, s.now())
	})
	if err != nil {
		return err
	}
	// No retry helper surrounds this call. A commit timeout above never reaches it.
	result, err := provider.CreateOrder(ctx, input)
	if err != nil {
		return s.afterSendFailure(ctx, id, lease, "create_uncertain")
	}
	return s.apply(ctx, id, lease, result)
}

func (s *Purchaser) beforeSendFailure(ctx context.Context, id, lease, issue string) error {
	return s.transaction(ctx, func(tx *ent.Tx) error {
		row, err := tx.SupplierPurchase.Get(ctx, id)
		if err != nil {
			return err
		}
		if row.PostClaimed || row.LeaseOwner != lease {
			return ErrConflict
		}
		_, err = tx.SupplierPurchase.UpdateOne(row).SetState("held").SetIssue(issue).SetLeaseOwner("").ClearLeaseUntil().AddVersion(1).SetUpdatedAt(s.now()).Save(ctx)
		return err
	})
}

func (s *Purchaser) afterSendFailure(ctx context.Context, id, lease, issue string) error {
	return s.transaction(ctx, func(tx *ent.Tx) error {
		row, err := tx.SupplierPurchase.Get(ctx, id)
		if err != nil {
			return err
		}
		if !row.PostClaimed || row.LeaseOwner != lease {
			return ErrConflict
		}
		_, err = tx.SupplierPurchase.UpdateOne(row).SetState("unresolved").SetIssue(issue).SetLeaseOwner("").ClearLeaseUntil().SetNextCheck(s.now().Add(time.Minute)).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx)
		return err
	})
}

// Handler only accepts a persisted internal identifier. Replayed queue jobs
// enter Dispatch's durable fence and cannot create another supplier purchase.
func (s *Purchaser) Handler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var input struct {
			ID string `json:"purchase_id"`
		}
		if json.Unmarshal(job.Payload, &input) != nil || !validID(input.ID) {
			return ErrInvalid
		}
		return s.Dispatch(ctx, input.ID)
	}
}

// Maintain bounds read-only reconciliation. Disabled purchasing never prevents
// checking an already submitted obligation. Missing results remain unresolved.
func (s *Purchaser) Maintain(ctx context.Context) error {
	rows, err := s.client.SupplierPurchase.Query().Where(supplierpurchase.PostClaimedEQ(true), supplierpurchase.IssueNotIn(manualReviewIssues...), supplierpurchase.NextCheckLTE(s.now()), supplierpurchase.StateIn("sending", "unresolved", "pending", "held")).Order(ent.Asc(supplierpurchase.FieldNextCheck), ent.Asc(supplierpurchase.FieldID)).Limit(20).All(ctx)
	if err != nil {
		return err
	}
	var result error
	for _, row := range rows {
		if e := s.Reconcile(ctx, row.ID); e != nil && !errors.Is(e, ErrConflict) {
			result = errors.Join(result, e)
		}
	}
	return result
}
