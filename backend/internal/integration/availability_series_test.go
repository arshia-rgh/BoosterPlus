//go:build integration

package integration

import (
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/availabilitywindow"
	work "github.com/arshia-rgh/BoosterPlus/backend/internal/fulfillment"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestAvailabilitySeriesAtomicRetryAndExceptions(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	_, start := f.availability(t)
	window := func(days int) work.WindowInput {
		at := start.Add(time.Duration(days) * 24 * time.Hour)
		return work.WindowInput{Start: localInstant(at), End: localInstant(at.Add(time.Hour))}
	}
	input := work.AvailabilitySeries{RequestKey: uuid.NewString(), Windows: []work.WindowInput{window(7), window(21)}}
	originalKey := input.RequestKey
	first, err := f.work.AddAvailabilitySeries(ctx, f.booster, f.booster.User.ID, false, input)
	if err != nil || len(first.Windows) != 2 {
		t.Fatal("publish", first, err)
	}
	if input.Windows[0].RequestKey != "" {
		t.Fatal("mutated caller input")
	}
	retry, err := f.work.AddAvailabilitySeries(ctx, f.booster, f.booster.User.ID, false, input)
	if err != nil || len(retry.Windows) != 2 || retry.Windows[0].ID != first.Windows[0].ID {
		t.Fatal("idempotent retry", retry, err)
	}
	input.Windows = append(input.Windows, window(28))
	if _, err = f.work.AddAvailabilitySeries(ctx, f.booster, f.booster.User.ID, false, input); !errors.Is(err, work.ErrConflict) {
		t.Fatal("changed same-key series", err)
	}
	input.RequestKey = uuid.NewString()
	input.Windows = []work.WindowInput{window(35), window(7)}
	if _, err = f.work.AddAvailabilitySeries(ctx, f.booster, f.booster.User.ID, false, input); !errors.Is(err, work.ErrConflict) {
		t.Fatal("overlap accepted", err)
	}
	count, err := f.auth.client.AvailabilityWindow.Query().Where(availabilitywindow.UserIDEQ(f.booster.User.ID)).Count(ctx)
	if err != nil || count != 3 {
		t.Fatal("partial series committed", count, err)
	}
	if _, err = f.work.AddAvailabilitySeries(ctx, f.second, f.booster.User.ID, false, input); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("foreign calendar", err)
	}
	if _, err = f.work.AddAvailabilitySeries(ctx, f.buyer, f.booster.User.ID, false, input); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customer calendar", err)
	}
	for _, bad := range []work.AvailabilitySeries{{RequestKey: "invalid", Windows: input.Windows}, {RequestKey: uuid.NewString()}, {RequestKey: uuid.NewString(), Windows: make([]work.WindowInput, 13)}} {
		if _, err = f.work.AddAvailabilitySeries(ctx, f.booster, f.booster.User.ID, false, bad); !errors.Is(err, work.ErrInvalid) {
			t.Fatal("bad series", err)
		}
	}
	// An exception removes one explicit date; repeating the original request does not reactivate it.
	if err = f.work.RemoveAvailability(ctx, f.booster, f.booster.User.ID, first.Windows[0].ID, false, first.Windows[0].Version); err != nil {
		t.Fatal(err)
	}
	retry, err = f.work.AddAvailabilitySeries(ctx, f.booster, f.booster.User.ID, false, work.AvailabilitySeries{RequestKey: originalKey, Windows: []work.WindowInput{window(7), window(21)}})
	if err != nil || len(retry.Windows) != 2 || retry.Windows[0].Active {
		t.Fatal("retry reactivated exception", retry, err)
	}
}

func TestAvailabilitySeriesConcurrentRetry(t *testing.T) {
	f := fulfillmentDB(t)
	ctx := t.Context()
	_, start := f.availability(t)
	start = start.Add(7 * 24 * time.Hour)
	input := work.AvailabilitySeries{RequestKey: uuid.NewString(), Windows: []work.WindowInput{{Start: localInstant(start), End: localInstant(start.Add(time.Hour))}}}
	results := make(chan string, 2)
	var group sync.WaitGroup
	for range 2 {
		group.Go(func() {
			result, err := f.work.AddAvailabilitySeries(ctx, f.booster, f.booster.User.ID, false, input)
			if err != nil || len(result.Windows) != 1 {
				t.Error("concurrent retry", err)
				return
			}
			results <- result.Windows[0].ID
		})
	}
	group.Wait()
	close(results)
	var id string
	count := 0
	for value := range results {
		count++
		if id != "" && id != value {
			t.Fatal("retry created different windows")
		}
		id = value
	}
	if count != 2 {
		t.Fatal("both idempotent retries should resolve", count)
	}
	rows, err := f.auth.client.AvailabilityWindow.Query().Where(availabilitywindow.UserIDEQ(f.booster.User.ID)).Count(ctx)
	if err != nil || rows != 2 {
		t.Fatal("duplicate published windows", rows, err)
	}
}
