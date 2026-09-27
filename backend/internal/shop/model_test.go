package shop

import (
	"errors"
	"strings"
	"testing"
)

func product() Definition {
	return Definition{Title: "Synthetic item", Description: "Isolated fixture product", Category: "Fixture", Asset: "/catalog-assets/test.webp", AssetAlt: "Test fixture", AssetSource: "Synthetic test artwork", Reviewed: true, Variants: []Variant{{Key: "item", Label: "Item", Region: "Fixture region", Platform: "Fixture platform", Server: "Fixture server", Currency: "USD", UnitAmountMinor: "1234", MinQuantity: 1, MaxQuantity: 100, Enabled: true}}, Recipient: []RecipientField{{Key: "player_id", Label: "Player identifier", Required: true, MaxLength: 20}}, Policy: Policy{DeliveryMinHours: 1, DeliveryMaxHours: 24, ReservationMinutes: 30, EvidenceRequired: true, DeliveryTerms: "Explicit fixture delivery terms.", CancellationTerms: "Explicit fixture cancellation terms.", RefundTerms: "Explicit fixture refund terms.", Fees: "Explicit fixture included fees."}}
}
func TestPublicationRejectsMissingTermsAndCredentialFields(t *testing.T) {
	valid := product()
	if issues := Validate(valid, true); len(issues) > 0 {
		t.Fatal(issues)
	}
	tests := []struct {
		name   string
		mutate func(*Definition)
	}{
		{"terms", func(d *Definition) { d.Policy.RefundTerms = "" }},
		{"review", func(d *Definition) { d.Reviewed = false }},
		{"evidence", func(d *Definition) { d.Policy.EvidenceRequired = false }},
		{"credential", func(d *Definition) { d.Recipient[0].Key = "password" }},
		{"unknown currency", func(d *Definition) { d.Variants[0].Currency = "BTC" }},
		{"unbounded metadata", func(d *Definition) { d.Asset = ""; d.AssetSource = strings.Repeat("x", 1001) }},
		{"negative draft estimate", func(d *Definition) { d.Policy.DeliveryMinHours = -1 }},
		{"external art", func(d *Definition) { d.Asset = "https://other.example/image.webp" }},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			d := product()
			test.mutate(&d)
			if len(Validate(d, true)) == 0 {
				t.Fatal("unsafe publication accepted")
			}
		})
	}
}
func TestExactTotalAndQuantityBounds(t *testing.T) {
	v := product().Variants[0]
	got, err := Total(v, 3)
	if err != nil || got != "3702" {
		t.Fatal(got, err)
	}
	for _, quantity := range []int{-1, 0, 101} {
		if _, err = Total(v, quantity); !errors.Is(err, ErrInvalid) {
			t.Fatal("invalid quantity accepted")
		}
	}
	v.UnitAmountMinor = "999999999999"
	if _, err = Total(v, 2); !errors.Is(err, ErrInvalid) {
		t.Fatal("overflow accepted")
	}
	v.Enabled = false
	if _, err = Total(v, 1); !errors.Is(err, ErrInvalid) {
		t.Fatal("disabled variant accepted")
	}
}
func TestRecipientRequiresDeclaredFieldsWithoutNormalization(t *testing.T) {
	fields := product().Recipient
	input := map[string]string{"player_id": " exact-value "}
	if err := ValidateRecipient(fields, input); err != nil {
		t.Fatal(err)
	}
	if input["player_id"] != " exact-value " {
		t.Fatal("destination normalized")
	}
	for _, value := range []map[string]string{{}, {"player_id": " "}, {"player_id": "id", "password": "unaccepted"}, {"player_id": strings.Repeat("x", 21)}} {
		if err := ValidateRecipient(fields, value); !errors.Is(err, ErrInvalid) {
			t.Fatal("invalid recipient accepted")
		}
	}
}
