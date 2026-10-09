package reviews

import (
	"context"
	"encoding/json"
	"slices"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/review"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/notifications"
)

// Save only accepts feedback from the actual customer after a completed verified paid purchase.
func (s *Store) Save(ctx context.Context, p *identity.Principal, orderID string, input Input) (View, error) {
	rating := input.Rating
	if rating < 1 || rating > 5 {
		return View{}, ErrInvalid
	}
	score := int8(rating)
	key, e := uuid.Parse(input.RequestKey)
	if e != nil || key.String() != input.RequestKey || input.Version < 0 || input.Version >= 2147483646 || input.Rating < 1 || input.Rating > 5 || !validText(input.Body, 1, 4000) || len(input.Answers) > 40 || !input.AcceptPolicy || len(input.PolicyReleaseID) > 36 {
		return View{}, ErrInvalid
	}
	raw, e := json.Marshal(input)
	if e != nil {
		return View{}, e
	}
	digest := s.auth.RequestDigest("review-create", raw)
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		if current.User.Role != identity.RoleCustomer {
			return identity.ErrForbidden
		}
		purchase, err := ownedOrder(ctx, tx.Client(), current, orderID)
		if err != nil {
			return err
		}
		existing, err := tx.Review.Query().Where(review.OrderIDEQ(orderID), review.UserIDEQ(current.User.ID)).Only(ctx)
		if err != nil && !ent.IsNotFound(err) {
			return err
		}
		if existing != nil && input.Version == 0 {
			if existing.RequestKey != input.RequestKey || existing.RequestHash != digest {
				return ErrConflict
			}
			result, err = view(existing, false)
			return err
		}
		if existing == nil && input.Version != 0 || existing != nil && existing.Version != input.Version {
			return ErrConflict
		}
		allowed, err := eligible(ctx, tx.Client(), purchase)
		if err != nil {
			return err
		}
		if !allowed {
			return ErrConflict
		}
		release, err := released(ctx, tx.Client(), purchase.GameID)
		if err != nil {
			return err
		}
		currentPolicy := policy(release)
		if currentPolicy == nil || currentPolicy.ReleaseID != input.PolicyReleaseID {
			return ErrConflict
		}
		validated := catalog.ValidateReview(currentPolicy.config(), input.Answers)
		if len(validated.Issues) > 0 {
			return &catalog.Invalid{Issues: validated.Issues}
		}
		answers, err := document(validated.Answers)
		if err != nil {
			return err
		}
		snapshot, err := document(currentPolicy)
		if err != nil {
			return err
		}
		now := s.now().UTC()
		action := "edited"
		if existing == nil {
			reused, checkErr := tx.Review.Query().Where(review.UserIDEQ(current.User.ID), review.RequestKeyEQ(input.RequestKey)).Exist(ctx)
			if checkErr != nil {
				return checkErr
			}
			if reused {
				return ErrConflict
			}
			existing, err = tx.Review.Create().SetOrderID(orderID).SetContractID(purchase.CurrentContract).SetUserID(current.User.ID).SetGameID(purchase.GameID).SetGameName(purchase.GameName).SetSlug(purchase.Slug).SetService(purchase.Service).SetPackageKey(purchase.PackageKey).SetRequestKey(input.RequestKey).SetRequestHash(digest).SetRating(score).SetBody(input.Body).SetAnswers(answers).SetPolicy(snapshot).SetPolicyReleaseID(currentPolicy.ReleaseID).SetResponse("").SetReasonCode("").SetInternalReason("").SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
			action = "submitted"
		} else {
			existing, err = tx.Review.UpdateOneID(existing.ID).AddVersion(1).SetState(review.StatePending).SetRating(score).SetBody(input.Body).SetAnswers(answers).SetPolicy(snapshot).SetPolicyReleaseID(currentPolicy.ReleaseID).SetResponse("").SetReasonCode("").SetInternalReason("").ClearPublishedAt().SetUpdatedAt(now).Save(ctx)
		}
		if err != nil {
			return err
		}
		if err = s.record(ctx, tx, current, existing, action, now); err != nil {
			return err
		}
		result, err = view(existing, false)
		return err
	})
	return result, err
}

// Withdraw removes the owned review from publication, preserving private revision history.
func (s *Store) Withdraw(ctx context.Context, p *identity.Principal, orderID string, version int) (View, error) {
	if !validVersion(version) {
		return View{}, ErrInvalid
	}
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, "account", false, func(tx *ent.Tx, current *identity.Principal) error {
		row, err := tx.Review.Query().Where(review.OrderIDEQ(orderID), review.UserIDEQ(current.User.ID)).Only(ctx)
		if err != nil {
			return err
		}
		if row.Version != version || row.State == review.StateWithdrawn {
			return ErrConflict
		}
		now := s.now().UTC()
		row, err = tx.Review.UpdateOneID(row.ID).AddVersion(1).SetState(review.StateWithdrawn).ClearPublishedAt().SetUpdatedAt(now).Save(ctx)
		if err != nil {
			return err
		}
		if err = s.record(ctx, tx, current, row, "withdrawn", now); err != nil {
			return err
		}
		result, err = view(row, false)
		return err
	})
	return result, err
}

// Moderate changes publication or a labeled response; it never rewrites customer feedback.
func (s *Store) Moderate(ctx context.Context, p *identity.Principal, id, action string, input Action) (View, error) {
	if !validVersion(input.Version) || !validText(input.Note, 0, 2000) || !validText(input.Response, 0, 2000) || len(input.ReasonCode) > 32 {
		return View{}, ErrInvalid
	}
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, "admin", true, func(tx *ent.Tx, current *identity.Principal) error {
		row, err := tx.Review.Get(ctx, id)
		if err != nil {
			return err
		}
		if same, sameErr := sameReviewer(ctx, tx, current.User, row.UserID); sameErr != nil {
			return sameErr
		} else if same {
			return identity.ErrForbidden
		}
		purchase, readErr := tx.Order.Get(ctx, row.OrderID)
		if readErr != nil {
			return readErr
		}
		if purchase.ListingID != "" {
			listing, listingErr := tx.AccountListing.Get(ctx, purchase.ListingID)
			if listingErr != nil {
				return listingErr
			}
			if same, sameErr := sameReviewer(ctx, tx, current.User, listing.SellerID); sameErr != nil {
				return sameErr
			} else if same {
				return identity.ErrForbidden
			}
		}
		if row.Version != input.Version || row.State == review.StateWithdrawn {
			return ErrConflict
		}
		now := s.now().UTC()
		change := tx.Review.UpdateOneID(id).AddVersion(1).SetUpdatedAt(now)
		switch action {
		case "publish":
			if !input.PolicyChecked || !validText(input.Note, 1, 2000) {
				return ErrInvalid
			}
			if row.State == review.StatePublished {
				return ErrConflict
			}
			purchase, readErr := tx.Order.Get(ctx, row.OrderID)
			if readErr != nil {
				return readErr
			}
			allowed, readErr := eligible(ctx, tx.Client(), purchase)
			if readErr != nil {
				return readErr
			}
			if !allowed || purchase.UserID != row.UserID || purchase.CurrentContract != row.ContractID {
				return ErrConflict
			}
			change.SetState(review.StatePublished).SetPublishedAt(now).SetReasonCode("").SetInternalReason(input.Note)
		case "hide", "reject":
			if !slices.Contains([]string{"privacy", "spam", "abuse", "off_topic"}, input.ReasonCode) || !validText(input.Note, 1, 2000) {
				return ErrInvalid
			}
			if action == "hide" && row.State != review.StatePublished || action == "reject" && row.State != review.StatePending && row.State != review.StateHidden {
				return ErrConflict
			}
			state := review.StateHidden
			if action == "reject" {
				state = review.StateRejected
			}
			change.SetState(state).ClearPublishedAt().SetReasonCode(input.ReasonCode).SetInternalReason(input.Note)
		case "respond":
			if row.State != review.StatePublished {
				return ErrConflict
			}
			if !input.PolicyChecked || !validText(input.Response, 1, 2000) {
				return ErrInvalid
			}
			change.SetResponse(input.Response)
		default:
			return ErrInvalid
		}
		row, err = change.Save(ctx)
		if err != nil {
			return err
		}
		if err = s.record(ctx, tx, current, row, action, now); err != nil {
			return err
		}
		result, err = view(row, true)
		return err
	})
	return result, err
}
func (s *Store) record(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.Review, action string, now time.Time) error {
	_, err := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(p.User.ID).SetTargetID(row.ID).SetAction("review_" + action).SetMetadata(map[string]string{}).SetCreatedAt(now).Save(ctx)
	if err != nil {
		return err
	}
	role := "customer"
	if p.User.ID != row.UserID {
		role = "staff"
	}
	event, err := tx.ReviewRevision.Create().SetReviewID(row.ID).SetVersion(row.Version).SetAction(action).SetState(string(row.State)).SetRating(row.Rating).SetBody(row.Body).SetAnswers(row.Answers).SetPolicy(row.Policy).SetResponse(row.Response).SetReasonCode(row.ReasonCode).SetInternalReason(row.InternalReason).SetActorRole(role).SetCreatedAt(now).Save(ctx)
	if err != nil {
		return err
	}
	if p.User.ID != row.UserID {
		return notifications.Enqueue(ctx, tx, row.UserID, row.OrderID, event.ID, "review_customer", now)
	}
	return nil
}

// sameReviewer preserves review conflicts across independent account namespaces.
func sameReviewer(ctx context.Context, tx *ent.Tx, staff *ent.User, counterpartID string) (bool, error) {
	counterpart, err := tx.User.Get(ctx, counterpartID)
	if err != nil {
		return false, err
	}
	return identity.IndependentReviewConflict(ctx, tx, staff, counterpart)
}
