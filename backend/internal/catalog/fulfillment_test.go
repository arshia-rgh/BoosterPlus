package catalog

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestFulfillmentPolicyMapping(t *testing.T) {
	c := fixture()
	p := &FulfillmentPolicy{Mode: "selection", Field: "mode", AccountValue: "solo", TogetherValue: "duo", SecretHours: 24, ShareFields: []string{"mode", "from", "to"}}
	c.Services[0].Fulfillment = p
	if issues := ValidateConfiguration(c, true); len(issues) > 0 {
		t.Fatal(issues)
	}
	for _, scenario := range []struct{ value, want string }{{`"solo"`, "account"}, {`"duo"`, "together"}, {`"unknown"`, ""}, {`true`, ""}} {
		mode, err := FulfillmentMode(c.Services[0], Answers{"mode": json.RawMessage(scenario.value)})
		if mode != scenario.want || (err != nil) != (scenario.want == "") {
			t.Fatal(mode, err)
		}
	}
	for _, mutate := range []func(*Configuration){
		func(c *Configuration) { c.Services[0].Fulfillment.AccountValue = "missing" },
		func(c *Configuration) { c.Services[0].Fulfillment.TogetherValue = "solo" },
		func(c *Configuration) { c.Services[0].Fields[0].Required = false },
		func(c *Configuration) { c.Services[0].Fields[0].Stage = "fulfillment" },
		func(c *Configuration) { c.Services[0].Fields[0].VisibleWhen = leaf("one", "eq", "true") },
		func(c *Configuration) { c.Services[0].Fulfillment.SecretHours = 721 },
		func(c *Configuration) { c.Services[0].Fulfillment.Mode = "guess" },
		func(c *Configuration) { c.Services[0].Fulfillment.ShareFields = []string{"missing"} },
		func(c *Configuration) { c.Services[0].Fulfillment.ShareFields = []string{"mode", "mode"} },
	} {
		bad := clone(c)
		mutate(&bad)
		if len(ValidateConfiguration(bad, true)) == 0 {
			t.Fatal("invalid mode or sharing policy accepted")
		}
	}
	c.Services[0].Fulfillment = nil
	if _, err := FulfillmentMode(c.Services[0], answers()); !errors.Is(err, ErrFulfillmentPolicy) {
		t.Fatal("legacy field name inferred mode", err)
	}
	c.Services[0].Fulfillment = &FulfillmentPolicy{Mode: "together", ShareFields: []string{}}
	if issues := ValidateConfiguration(c, true); len(issues) > 0 {
		t.Fatal(issues)
	}
	c.Services[0].Fulfillment.SecretHours = 1
	if len(ValidateConfiguration(c, true)) == 0 {
		t.Fatal("together accepted secret collection")
	}
}
