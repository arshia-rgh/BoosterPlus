package httpapi_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
)

func TestResponsesMatchPublishedContract(t *testing.T) {
	var document any
	if err := json.Unmarshal(api.Contract, &document); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("contract.json", document); err != nil {
		t.Fatal(err)
	}
	for _, scenario := range []struct {
		path, schema string
		unavailable  bool
		status       int
	}{{"/api/v1/status", "Status", false, 200}, {"/health/live", "Health", false, 200}, {"/health/ready", "Health", false, 200}, {"/health/ready", "Health", true, 503}, {"/unknown", "Problem", false, 404}} {
		t.Run(fmt.Sprintf("%s_%d", scenario.path, scenario.status), func(t *testing.T) {
			schema, err := compiler.Compile("contract.json#/components/schemas/" + scenario.schema)
			if err != nil {
				t.Fatal(err)
			}
			handler := httpapi.New(func(context.Context) error {
				if scenario.unavailable {
					return errors.New("offline")
				}
				return nil
			}, slog.New(slog.DiscardHandler), false)
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, httptest.NewRequestWithContext(t.Context(), http.MethodGet, scenario.path, nil))
			if recorder.Code != scenario.status {
				t.Fatal(recorder.Code)
			}
			var value any
			if decodeErr := json.Unmarshal(recorder.Body.Bytes(), &value); decodeErr != nil {
				t.Fatal(decodeErr)
			}
			if validateErr := schema.Validate(value); validateErr != nil {
				t.Fatal(validateErr)
			}
		})
	}
}
