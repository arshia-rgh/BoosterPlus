package suppliers

import "testing"

func TestQuantityRulesHandleFractionsAndSteps(t *testing.T) {
	rules := Quantity{Kind: "multiple", Min: "0.1", Max: "10", Step: "0.1"}
	for _, value := range []Decimal{"0.1", "1.2", "10"} {
		if err := ValidateQuantity(rules, value); err != nil {
			t.Fatal(err)
		}
	}
	for _, value := range []Decimal{"0", "0.01", "1.01", "10.1", "-1"} {
		if ValidateQuantity(rules, value) == nil {
			t.Fatalf("accepted invalid quantity %s", value)
		}
	}
	if ValidateQuantity(Quantity{Kind: "one"}, "2") == nil {
		t.Fatal("accepted multiple single product")
	}
}
func TestFieldsRejectUnknownAndInvalidWithoutEchoing(t *testing.T) {
	fields := []Field{{ID: "player", Label: "Player", Kind: "text", Required: true, Pattern: `^\d+$`}, {ID: "server", Label: "Server", Kind: "select", Options: []Option{{ID: "tr", Label: "Turkey"}}}, {ID: "password", Label: "Password", Kind: "text", Secret: true, Transient: true}}
	for _, input := range []map[string]string{{"player": "123", "server": "tr"}, {"player": "123", "password": "private-fixture"}} {
		if err := ValidateFields(fields, input); err != nil {
			t.Fatal(err)
		}
	}
	for _, input := range []map[string]string{{}, {"player": "abc"}, {"player": "123", "server": "xx"}, {"player": "123", "unknown": "private-fixture"}, {"player": "123", "password": ""}} {
		if err := ValidateFields(fields, input); err == nil {
			t.Fatal("accepted invalid input")
		}
	}
	values, err := deliveryData([]Field{{ID: "id", Kind: "number", Required: true}}, map[string]string{"id": "123456789012"})
	if err != nil || values["id"] == "123456789012" {
		t.Fatal("numeric field was not a numeric JSON token")
	}
}
func TestNexusSecretIsTransientAndNeverRequiredByDefault(t *testing.T) {
	fields, _, err := normalizeFields([]sourceField{{ID: "password", Label: "Password", Type: "secret"}}, true)
	if err != nil {
		t.Fatal(err)
	}
	if !fields[0].Secret || !fields[0].Transient || fields[0].Required {
		t.Fatal("secret contract lost")
	}
	if err = ValidateFields(fields, map[string]string{}); err != nil {
		t.Fatal("optional provider verification path blocked")
	}
}
