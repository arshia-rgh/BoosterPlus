package supply

import (
	"context"
	"slices"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// Reconcile performs GETs only, including when a create response was lost. It
// never equates an empty paginated result with a failed or safe-to-retry POST.
func (s *Purchaser) Reconcile(ctx context.Context, id string) error {
	if !validID(id) {
		return ErrInvalid
	}
	lease := uuid.NewString()
	var row *ent.SupplierPurchase
	err := s.transaction(ctx, func(tx *ent.Tx) error {
		var e error
		row, e = tx.SupplierPurchase.Get(ctx, id)
		if e != nil {
			return e
		}
		if !row.PostClaimed {
			return ErrConflict
		}
		if e = s.purchaseConnection(ctx, tx, row, false); e != nil {
			return e
		}
		if needsManualReview(row.Issue) {
			return ErrConflict
		}
		if row.LeaseUntil != nil && row.LeaseUntil.After(s.now()) {
			return ErrConflict
		}
		row, e = tx.SupplierPurchase.UpdateOne(row).SetLeaseOwner(lease).SetLeaseUntil(s.now().Add(purchaseLease)).Save(ctx)
		return e
	})
	if err != nil {
		return err
	}
	provider := s.providers[suppliers.Connection(row.ConnectionID)]
	if provider == nil {
		return s.afterSendFailure(ctx, id, lease, "connection_unavailable")
	}
	if row.ProviderID != nil {
		result, e := provider.GetOrder(ctx, *row.ProviderID)
		if e != nil {
			return s.afterSendFailure(ctx, id, lease, "status_unavailable")
		}
		return s.apply(ctx, id, lease, result)
	}
	rows, more, err := provider.FindOrders(ctx, id, row.ScanOffset)
	if err != nil {
		return s.afterSendFailure(ctx, id, lease, "search_unavailable")
	}
	// Never choose arbitrarily between multiple chargeable orders.
	if len(rows) > 1 || len(rows) == 1 && row.CandidateProviderID != "" && row.CandidateProviderID != rows[0].ID {
		return s.afterSendFailure(ctx, id, lease, "duplicate_provider_orders")
	}
	candidate := row.CandidateProviderID
	if len(rows) == 1 {
		input, e := request(row)
		if e != nil || !suppliers.Matches(rows[0], input) || !providerIDValid(rows[0].ID) {
			return s.afterSendFailure(ctx, id, lease, "identity_mismatch")
		}
		candidate = rows[0].ID
	}
	if !more && candidate != "" {
		result, e := provider.GetOrder(ctx, candidate)
		if e != nil {
			return s.afterSendFailure(ctx, id, lease, "status_unavailable")
		}
		return s.apply(ctx, id, lease, result)
	}
	return s.transaction(ctx, func(tx *ent.Tx) error {
		current, e := tx.SupplierPurchase.Get(ctx, id)
		if e != nil {
			return e
		}
		if current.LeaseOwner != lease || !current.PostClaimed || current.ProviderID != nil {
			return ErrConflict
		}
		offset, issue := 0, "not_visible_yet"
		if more {
			if current.ScanOffset >= 100000 {
				issue = "search_limit_review"
				offset = current.ScanOffset
			} else {
				offset = current.ScanOffset + 100
			}
		}
		_, e = tx.SupplierPurchase.UpdateOne(current).SetState("unresolved").SetIssue(issue).SetScanOffset(offset).SetCandidateProviderID(candidate).SetLeaseOwner("").ClearLeaseUntil().SetNextCheck(s.now().Add(time.Minute)).AddVersion(1).SetUpdatedAt(s.now()).Save(ctx)
		return e
	})
}

func terminal(status string) bool {
	return slices.Contains([]string{"completed", "failed", "cancelled", "partially_completed"}, status)
}

var manualReviewIssues = []string{"duplicate_provider_orders", "identity_mismatch", "terminal_state_changed", "search_limit_review"}

func needsManualReview(issue string) bool { return slices.Contains(manualReviewIssues, issue) }

func (s *Purchaser) apply(ctx context.Context, id, lease string, result suppliers.Order) error {
	return s.transaction(ctx, func(tx *ent.Tx) error {
		row, err := tx.SupplierPurchase.Get(ctx, id)
		if err != nil {
			return err
		}
		if !row.PostClaimed || row.LeaseOwner != lease {
			return ErrConflict
		}
		if err = s.purchaseConnection(ctx, tx, row, false); err != nil {
			return err
		}
		input, err := request(row)
		if err != nil {
			return err
		}
		issue := ""
		if !suppliers.Matches(result, input) || !providerIDValid(result.ID) || row.ProviderID != nil && *row.ProviderID != result.ID {
			issue = "identity_mismatch"
		}
		if terminal(row.ProviderStatus) && row.ProviderStatus != result.Status {
			issue = "terminal_state_changed"
		}
		update := tx.SupplierPurchase.UpdateOne(row).SetLeaseOwner("").ClearLeaseUntil().SetNextCheck(s.now().Add(time.Minute)).AddVersion(1).SetUpdatedAt(s.now())
		if issue != "" {
			_, err = update.SetState("held").SetIssue(issue).Save(ctx)
			return err
		}
		cost, e1 := result.Cost.Rational()
		maximum, e2 := input.MaximumCost.Rational()
		if e1 != nil || e2 != nil || cost.Cmp(maximum) > 0 || (result.Status == "completed" && cost.Sign() <= 0) {
			issue = "supplier_cost_review"
		}
		if !validProviderState(suppliers.Connection(row.ConnectionID), result.Status) {
			issue = "status_invalid"
		}
		state := "pending"
		switch result.Status {
		case "completed":
			state = "completed"
		case "failed", "cancelled":
			state = "cancelled"
		case "partially_completed":
			state = "partial"
		case "pending", "cancellation_requested":
		default:
			issue = "status_invalid"
		}
		// A callback/late provider result may record real delivery, but cannot revive
		// a cancelled/refunded/held customer order or override an open service case.
		if e := paid(ctx, tx, row); e != nil {
			issue = "payment_or_case_review"
		}
		if len(result.Keys) > 0 && row.DeliverySecretID == "" && (state == "completed" || state == "partial") {
			secretID, e := s.seal(ctx, tx, id, row.UserID, "supplier_delivery", result.Keys, s.now().Add(30*24*time.Hour))
			if e != nil {
				return e
			}
			update.SetDeliverySecretID(secretID)
		}
		if issue != "" {
			state = "held"
		}
		update.SetProviderID(result.ID).SetProviderStatus(result.Status).SetActualCost(string(result.Cost)).SetState(state).SetIssue(issue)
		if result.Delivered != nil {
			update.SetDelivered(string(*result.Delivered))
		}
		if _, err = update.Save(ctx); err != nil {
			return err
		}
		return audit(ctx, tx, "", id, "purchase_observed", row.Version+1, s.now())
	})
}

func validProviderState(connection suppliers.Connection, state string) bool {
	if connection == suppliers.VendoriaTest || connection == suppliers.VendoriaProduction {
		return slices.Contains([]string{"pending", "completed", "cancelled", "cancellation_requested"}, state)
	}
	return slices.Contains([]string{"pending", "completed", "failed", "partially_completed"}, state)
}

func providerIDValid(value string) bool {
	if len(value) < 1 || len(value) > 19 || value[0] == '0' {
		return false
	}
	for _, c := range value {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
