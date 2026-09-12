//go:build integration && browsertest

package integration

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/order"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/ordercontract"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
)

func fixtureDocument(t *testing.T, value any) map[string]any {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	var out map[string]any
	if err = json.Unmarshal(raw, &out); err != nil {
		t.Fatal(err)
	}
	return out
}

// seedBrowserFulfillment creates synthetic settled fixtures before the HTTP server
// starts, solely in the UUID test database. There is no payment-bypass endpoint.
func seedBrowserFulfillment(t *testing.T, f *authFixture, fixtures map[string]string) {
	t.Helper()
	ctx := t.Context()
	now := time.Now().UTC()
	for _, project := range []string{"desktop", "mobile"} {
		c := catalogConfig()
		c.Name = "Fulfillment journey game"
		c.ReviewPolicy = &catalog.ReviewPolicy{Content: "Synthetic review policy: no private data, spam, abuse or unrelated content. Low ratings are allowed.", Fields: []catalog.Field{}, Rules: []catalog.Rule{}}
		c.Services[0].Delivery = syntheticDelivery()
		c.Services[0].Fulfillment = &catalog.FulfillmentPolicy{Mode: "selection", Field: "mode", AccountValue: "solo", TogetherValue: "duo", SecretHours: 24, ShareFields: []string{"mode", "player"}}
		c.Services[0].Fields = append(c.Services[0].Fields, catalog.Field{Key: "player", Label: "Player identifier", Type: "short_text", Stage: "fulfillment", Required: true, MinLength: 1, MaxLength: 80})
		c.Packages[0].Variants[0].Eligibility = nil
		game, err := f.client.Game.Create().SetSlug("work-" + project + "-" + uuid.NewString()).SetName(c.Name).SetConfiguration(fixtureDocument(t, c)).Save(ctx)
		if err != nil {
			t.Fatal(err)
		}
		release := catalog.Release{ID: uuid.NewString(), GameID: game.ID, Slug: game.Slug, Version: 1, CreatedAt: now, Configuration: c}
		if _, err = f.client.CatalogRelease.Create().SetID(release.ID).SetGameID(game.ID).SetVersion(1).SetConfiguration(fixtureDocument(t, c)).SetCreatedBy(fixtures[project+"_workadmin_id"]).SetCreatedAt(now).Save(ctx); err != nil {
			t.Fatal(err)
		}
		if _, err = f.client.Game.UpdateOneID(game.ID).SetCurrentRelease(release.ID).SetPublished(true).Save(ctx); err != nil {
			t.Fatal(err)
		}
		fixtures[project+"_work_slug"] = game.Slug
		for _, mode := range []string{"solo", "duo"} {
			answers := catalog.Answers{"mode": json.RawMessage(`"` + mode + `"`)}
			row, createErr := f.client.Order.Create().SetUserID(fixtures[project+"_workbuyer_id"]).SetGameID(game.ID).SetGameName(c.Name).SetSlug(game.Slug).SetService("boost").SetPackageKey("pack").SetVariantKey("basic").SetKind(order.KindPackage).SetRequestKey(uuid.NewString()).SetRequestHash(f.service.RequestDigest("fixture", []byte(uuid.NewString()))).SetState(order.StateQueued).SetAnswers(fixtureDocument(t, answers)).SetSnapshot(fixtureDocument(t, release)).SetEstimate(fixtureDocument(t, catalog.Calculate(release, "boost", answers, now))).SetTermsVersion("test-v1").Save(ctx)
			if createErr != nil {
				t.Fatal(createErr)
			}
			agreement := orders.Commercial{Currency: "USD", SubtotalMinor: "1234", AmountMinor: "1234", Lines: []catalog.PriceLine{{Key: "fixture", Label: "Synthetic fixture", AmountMinor: "1234"}}, Scope: "Synthetic paid test work", Reason: "Isolated test fixture", DeliveryMinHours: 1, DeliveryMaxHours: 24, ExpiresAt: now.Add(24 * time.Hour), TermsVersion: "test-v1"}
			contract, createErr := f.client.OrderContract.Create().SetOrderID(row.ID).SetActiveOrderID(row.ID).SetUserID(row.UserID).SetGameID(row.GameID).SetPackageKey("pack").SetVariantKey("basic").SetPaymentState(ordercontract.PaymentStateSettled).SetData(fixtureDocument(t, agreement)).Save(ctx)
			if createErr != nil {
				t.Fatal(createErr)
			}
			if _, createErr = f.client.Order.UpdateOneID(row.ID).SetCurrentContract(contract.ID).Save(ctx); createErr != nil {
				t.Fatal(createErr)
			}
			receipt, receiptErr := f.client.PaymentReceipt.Create().SetRecordID(uuid.NewString()).SetAttemptID(uuid.NewString()).SetOrderID(row.ID).SetUserID(row.UserID).SetCurrency("usdt").SetNetwork("tron").SetAmount("12.34").SetState("confirmed").SetObservationID(uuid.NewString()).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
			if receiptErr != nil {
				t.Fatal(receiptErr)
			}
			if _, receiptErr = f.client.PaymentAllocation.Create().SetReceiptID(receipt.ID).SetContractID(contract.ID).SetOrderID(row.ID).SetCurrency("USD").SetAmountMinor("1234").SetCryptoAmount("12.34").SetCreatedAt(now).Save(ctx); receiptErr != nil {
				t.Fatal(receiptErr)
			}
			fixtures[project+"_work_"+mode] = row.ID
		}
	}
}
