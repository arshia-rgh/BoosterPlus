// Package availabilityevents adds reference-only capacity changes to business transactions.
package availabilityevents

import (
	"context"
	"crypto/rand"
	"encoding/json"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitytarget"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

// Changed is atomic with catalog/reservation changes; workers read current public capacity.
func Changed(ctx context.Context, tx *ent.Tx, gameID string) error {
	exists, err := tx.AvailabilityTarget.Query().Where(availabilitytarget.GameIDEQ(gameID)).Exist(ctx)
	if err != nil {
		return err
	}
	if !exists {
		return nil
	}
	payload, err := json.Marshal(map[string]string{"game_id": gameID})
	if err != nil {
		return err
	}
	_, err = jobs.EnqueueEntTx(ctx, tx, "availability.changed", "availability-change:"+rand.Text(), payload)
	return err
}
