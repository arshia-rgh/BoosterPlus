package privacy

import (
	"context"
	"strings"
	"unicode/utf8"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Update requires owner verification for review/erasure and recent self verification for cancellation.
func (s *Store) Update(ctx context.Context, p *identity.Principal, id string, admin bool, input Change) (out View, err error) {
	if !validID(id) || input.Version < 1 || input.Version >= 2147483645 || !utf8.ValidString(input.Reason) || len(input.Reason) > 2000 || strings.ContainsRune(input.Reason, 0) {
		return out, ErrInvalid
	}
	apply := func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.PrivacyRequest.Get(ctx, id)
		if e != nil {
			return e
		}
		if !admin && row.UserID != current.User.ID {
			return identity.ErrForbidden
		}
		if row.Version != input.Version {
			return ErrConflict
		}
		if row.State == "completed" || row.State == "cancelled" {
			return ErrConflict
		}
		update := tx.PrivacyRequest.UpdateOne(row).AddVersion(1).SetUpdatedAt(s.now())
		if !admin {
			if input.Action != "cancel" || row.State == "erased_pending_files" {
				return ErrConflict
			}
			update.SetState("cancelled").ClearActiveUserID()
		} else {
			switch input.Action {
			case "hold":
				if row.State == "erased_pending_files" || strings.TrimSpace(input.Reason) == "" {
					return ErrInvalid
				}
				if s.journal != nil {
					if e = s.journalRecord(ctx, row.ID, row.UserID, "hold"); e != nil {
						return e
					}
				}
				update.SetState("held").SetManualHold(true).SetHoldReason(input.Reason).SetReviewedBy(current.User.ID)
			case "release_hold":
				if !row.ManualHold || strings.TrimSpace(input.Reason) == "" {
					return ErrInvalid
				}
				update.SetManualHold(false).SetHoldReason("").SetState("requested").ClearEligibleAt().SetReviewedPolicyID("").SetReviewedBy(current.User.ID)
			case "review", "erase":
				if row.State == "erased_pending_files" || row.ManualHold {
					return ErrConflict
				}
				release, r, readErr := policy(ctx, tx.Client())
				if readErr != nil {
					return readErr
				}
				if input.PolicyID != release.ReleaseID {
					return ErrConflict
				}
				target, readErr := tx.User.Get(ctx, row.UserID)
				if readErr != nil {
					return readErr
				}
				if target.Role != identity.RoleCustomer || target.DeletedAt != nil {
					return ErrConflict
				}
				r, readErr = effectiveRetention(ctx, tx.Client(), row.PolicyID, r)
				if readErr != nil {
					return readErr
				}
				at, held, readErr := s.eligibility(ctx, tx, row, r)
				if readErr != nil {
					return readErr
				}
				if input.Action == "erase" {
					if row.State != "reviewed" || row.HoldReason != "" || row.ReviewedPolicyID != release.ReleaseID || held || at.After(s.now()) {
						return ErrConflict
					}
					if readErr = s.journalRecord(ctx, row.ID, row.UserID, "erase_intent"); readErr != nil {
						return readErr
					}
					if readErr = s.erase(ctx, tx, target); readErr != nil {
						return readErr
					}
					update.SetState("erased_pending_files")
				} else {
					update.SetState("reviewed").SetHoldReason("")
					if held {
						update.SetState("held").SetHoldReason("Active business records require resolution before erasure.")
					}
				}
				if at.IsZero() {
					update.ClearEligibleAt()
				} else {
					update.SetEligibleAt(at)
				}
				update.SetReviewedPolicyID(release.ReleaseID).SetReviewedBy(current.User.ID)
			case "finalize":
				if row.State != "erased_pending_files" {
					return ErrConflict
				}
				pending, readErr := tx.MediaFile.Query().Where(personalMedia(row.UserID), mediafile.Or(mediafile.StateNEQ(mediafile.StateDeleted), mediafile.PurgedAtIsNil())).Exist(ctx)
				if readErr != nil {
					return readErr
				}
				if pending {
					return ErrConflict
				}
				// The erased_pending_files state was committed earlier. Recording that
				// irreversible fact before finalize is safe even if this transaction fails.
				if readErr = s.journalRecord(ctx, row.ID, row.UserID, "erased"); readErr != nil {
					return readErr
				}
				update.SetState("completed").SetCompletedAt(s.now()).ClearActiveUserID()
			default:
				return ErrInvalid
			}
		}
		row, e = update.Save(ctx)
		if e != nil {
			return e
		}
		if e = s.audit(ctx, tx, current.User.ID, input.Action, row.ID); e != nil {
			return e
		}
		out = view(row, admin)
		return nil
	}
	if admin {
		err = s.auth.AuthorizedTransaction(ctx, p, "owner", true, apply)
	} else {
		err = s.auth.RecentAccountTransaction(ctx, p, apply)
	}
	return out, err
}
