package payments

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
)

func TestPaymentOptionsContract(t *testing.T) {
	var document any
	if err := json.Unmarshal(api.Contract, &document); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("contract.json", document); err != nil {
		t.Fatal(err)
	}
	schema, err := compiler.Compile("contract.json#/components/schemas/PaymentOptions")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	for _, status := range []string{"available", "below_minimum", "unavailable"} {
		value := Options{ContractID: "contract", PolicyID: "policy", Currency: "USD", AmountMinor: "100", ServerTime: now, Routes: []PaymentOption{{Code: "usdtbsc", Status: status, CheckedAt: &now, ValidUntil: &now, MinimumCrypto: "1", MinimumFiat: "1"}}}
		if status == "unavailable" {
			value.Routes[0] = PaymentOption{Code: "usdtbsc", Status: status}
		}
		raw, marshalErr := json.Marshal(value)
		if marshalErr != nil {
			t.Fatal(marshalErr)
		}
		var decoded any
		if err = json.Unmarshal(raw, &decoded); err != nil {
			t.Fatal(err)
		}
		if err = schema.Validate(decoded); err != nil {
			t.Fatal(err)
		}
	}
}
