package catalog

import (
	"errors"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/scheduling"
)

func deliveryFixture() Configuration {
	c := fixture()
	c.Services[0].Fulfillment = &FulfillmentPolicy{Mode: "selection", Field: "mode", AccountValue: "solo", TogetherValue: "duo", SecretHours: 24}
	c.Services[0].Delivery = &DeliveryPolicy{Calendar: scheduling.Calendar{Zone: "UTC", Windows: []scheduling.WeeklyWindow{{Weekday: 1, Start: "09:00", End: "17:00"}}}, Rules: []DeliveryRule{
		{Key: "conditional", Mode: "account", When: leaf("start_units", "gte", "5"), MinMinutes: 60, MaxMinutes: 120},
		{Key: "fallback", Mode: "account", MinMinutes: 120, MaxMinutes: 240, WaitMaxMinutes: 60, WorkloadMinutes: 10},
	}}
	return c
}
func TestDeliveryRuleValidationAndSelection(t *testing.T) {
	t.Parallel()
	c := deliveryFixture()
	if issues := ValidateConfiguration(c, true); len(issues) != 0 {
		t.Fatal(issues)
	}
	a := answers()
	a["start_units"] = []byte(`"5"`)
	rule, err := Delivery(c.Services[0], a, "account")
	if err != nil || rule.Key != "conditional" {
		t.Fatal(rule, err)
	}
	rule, err = Delivery(c.Services[0], answers(), "account")
	if err != nil || rule.Key != "fallback" {
		t.Fatal(rule, err)
	}
	if _, err = Delivery(c.Services[0], answers(), "together"); !errors.Is(err, ErrDeliveryPolicy) {
		t.Fatal(err)
	}
	for _, mutate := range []func(*ServiceDefinition){
		func(s *ServiceDefinition) { s.Fulfillment = nil },
		func(s *ServiceDefinition) { s.Delivery.Calendar.Zone = "Local" },
		func(s *ServiceDefinition) { s.Delivery.Rules = nil },
		func(s *ServiceDefinition) { s.Delivery.Rules = append(s.Delivery.Rules, s.Delivery.Rules[0]) },
		func(s *ServiceDefinition) { s.Delivery.Rules[0].MinMinutes = 0 },
		func(s *ServiceDefinition) { s.Delivery.Rules[0].MaxMinutes = 43201 },
		func(s *ServiceDefinition) { s.Delivery.Rules[0].WaitMinMinutes = -1 },
		func(s *ServiceDefinition) { s.Delivery.Rules[0].WaitMaxMinutes = 43201 },
		func(s *ServiceDefinition) { s.Delivery.Rules[0].WorkloadMinutes = 721 },
		func(s *ServiceDefinition) { s.Delivery.Rules[0].When = leaf("player", "eq", "later") },
		func(s *ServiceDefinition) { s.Delivery.Rules[0].When = leaf("screenshot", "eq", "file") },
		func(s *ServiceDefinition) { s.Delivery.Rules[0].When = nil },
		func(s *ServiceDefinition) { s.Delivery.Rules[0].Mode = "guess" },
		func(s *ServiceDefinition) { s.Delivery.Rules[0].When = leaf("mode", "gt", "solo") },
	} {
		bad := clone(c)
		mutate(&bad.Services[0])
		if len(ValidateConfiguration(bad, true)) == 0 {
			t.Fatal("invalid delivery rule published")
		}
	}
	c.Services[0].Delivery = nil
	if _, err = Delivery(c.Services[0], a, "account"); !errors.Is(err, ErrDeliveryPolicy) {
		t.Fatal(err)
	}
}
