package shop

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestPublicJSONOmitsProvenanceWithoutChangingPurchaseDefinition(t *testing.T) {
	d := product()
	d.AssetSource = "Private supplier review note"
	p := PublicProduct{Definition: d}
	raw, err := json.Marshal(p)
	if err != nil || strings.Contains(string(raw), d.AssetSource) {
		t.Fatal("customer projection exposed provenance", err)
	}
	if p.Definition.AssetSource != d.AssetSource || len(Validate(p.Definition, true)) != 0 {
		t.Fatal("public serialization changed valid internal purchase definition")
	}
	var customer PublicProduct
	if err = json.Unmarshal(raw, &customer); err != nil || customer.Definition.AssetSource != "" || customer.Definition.Policy != d.Policy || customer.Definition.Title != d.Title {
		t.Fatal("customer projection changed commercial terms", err)
	}
}
