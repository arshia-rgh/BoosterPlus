package privacy

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/privacyrequest"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacyjournal"
)

// ReplayRecovery reapplies authenticated, independently held erasure evidence.
// Call only in isolated recovery. All mentioned accounts remain suspended;
// conservative holds/intents require owner review before any reactivation.
func ReplayRecovery(ctx context.Context, client *ent.Client, entries []privacyjournal.Entry) (result error) {
	tx, err := client.Tx(ctx)
	if err != nil {
		return errors.New("privacy recovery transaction unavailable")
	}
	defer func() {
		if rollbackErr := tx.Rollback(); rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
			result = errors.Join(result, rollbackErr)
		}
	}()
	states := map[string]bool{}
	for _, entry := range entries {
		if !validID(entry.User) || !validID(entry.Request) || (entry.Action != "erased" && entry.Action != "hold" && entry.Action != "erase_intent") {
			return ErrInvalid
		}
		states[entry.User] = states[entry.User] || entry.Action == "erased"
	}
	store := New(client, nil, time.Now)
	for id, erased := range states {
		target, readErr := tx.User.Get(ctx, id)
		if ent.IsNotFound(readErr) {
			continue
		} // Account was created after the recovered checkpoint.
		if readErr != nil {
			return readErr
		}
		if target.Role != identity.RoleCustomer {
			return errors.New("privacy recovery role mismatch; keep quarantine")
		}
		if erased && target.DeletedAt == nil {
			if err = store.erase(ctx, tx, target); err != nil {
				return err
			}
		} else {
			if !erased {
				if _, err = tx.PrivacyRequest.Update().Where(privacyrequest.UserIDEQ(id), privacyrequest.StateNotIn("completed", "cancelled", "erased_pending_files")).SetManualHold(true).SetHoldReason("Independent recovery evidence requires owner review.").SetState("held").AddVersion(1).SetUpdatedAt(time.Now()).Save(ctx); err != nil {
					return err
				}
			}
			if _, err = tx.User.UpdateOne(target).SetSuspended(true).Save(ctx); err != nil {
				return err
			}
		}
		if err = store.audit(ctx, tx, "", "restore_replay", id); err != nil {
			return err
		}
	}
	if err = tx.Commit(); err != nil {
		return errors.New("privacy recovery commit failed; keep quarantine")
	}
	return nil
}
