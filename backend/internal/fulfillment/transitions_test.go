package fulfillment

import (
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

func TestHistoricalWinRateStillPassesHandoffValidation(t *testing.T) {
	release := catalog.Release{Configuration: catalog.Configuration{Services: []catalog.ServiceDefinition{{
		Key: "boost", Fulfillment: &catalog.FulfillmentPolicy{Mode: "account", SecretHours: 24},
		Fields: []catalog.Field{
			{Key: "requested_win_rate", Type: "decimal", Stage: "estimate", Unit: "%", Min: "0", Max: "100", Step: "0.1"},
			{Key: "player", Type: "short_text", Stage: "fulfillment", Required: true, MinLength: 1, MaxLength: 40},
		},
	}}}}
	snapshot, err := document(release)
	if err != nil {
		t.Fatal(err)
	}
	row := &ent.Order{Service: "boost", Snapshot: snapshot, Answers: map[string]any{"requested_win_rate": "85"}}
	work := &ent.Fulfillment{Answers: map[string]any{"player": "fixture-player"}}
	validated, err := handoffValidation(row, work)
	if err != nil || len(validated.Issues) != 0 || string(validated.Answers["requested_win_rate"]) != `"85"` {
		t.Fatalf("accepted historical guarantee blocked during handoff: %+v, %v", validated, err)
	}
	work.Answers = map[string]any{}
	validated, err = handoffValidation(row, work)
	if err != nil || len(validated.Issues) != 1 || validated.Issues[0].Path != "player" {
		t.Fatalf("historical compatibility skipped required fulfillment details: %+v, %v", validated, err)
	}
}
