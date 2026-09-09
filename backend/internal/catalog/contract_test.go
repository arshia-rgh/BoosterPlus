package catalog

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
)

func TestCatalogJSONContract(t *testing.T) {
	t.Parallel()
	var document any
	if err := json.Unmarshal(api.Contract, &document); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("contract.json", document); err != nil {
		t.Fatal(err)
	}
	c := fixture()
	for name, value := range map[string]any{
		"CatalogConfiguration": c,
		"CatalogDraft":         Draft{ID: "id", Slug: "game", Revision: 1, Configuration: c},
		"CatalogRelease":       Release{ID: "release", GameID: "id", Slug: "game", Version: 1, CreatedAt: time.Now(), Configuration: c},
		"CatalogValidation":    ValidateAnswers(c, "boost", "estimate", answers(), nil),
		"CatalogListing":       Listing{Games: []Summary{}, Next: ""},
	} {
		t.Run(name, func(t *testing.T) {
			schema, err := compiler.Compile("contract.json#/components/schemas/" + name)
			if err != nil {
				t.Fatal(err)
			}
			raw, err := json.Marshal(value)
			if err != nil {
				t.Fatal(err)
			}
			var data any
			if err = json.Unmarshal(raw, &data); err != nil {
				t.Fatal(err)
			}
			if err = schema.Validate(data); err != nil {
				t.Fatal(err)
			}
		})
	}
}
