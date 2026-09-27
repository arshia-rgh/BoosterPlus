package catalog

import (
	"encoding/json"
	"testing"
)

func TestAttachmentShapeIsOnlyAnOrderReference(t *testing.T) {
	t.Parallel()
	field := Field{Key: "screenshot", Type: "attachment", Stage: "order"}
	cases := []struct {
		raw   string
		valid bool
	}{
		{`["8c910a2e-9718-45cb-929c-96caa9d33fe9"]`, true},
		{`[]`, false}, {`null`, false}, {`"storage/path"`, false},
		{`["https://example.test/private"]`, false},
		{`["8C910A2E-9718-45CB-929C-96CAA9D33FE9"]`, false},
		{`["8c910a2e-9718-45cb-929c-96caa9d33fe9","8c910a2e-9718-45cb-929c-96caa9d33fe9"]`, false},
	}
	for _, tc := range cases {
		if got := validateValue(field, json.RawMessage(tc.raw), nil) == ""; got != tc.valid {
			t.Errorf("shape %s: valid=%v", tc.raw, got)
		}
	}
	for _, stage := range []string{"estimate", "fulfillment"} {
		field.Stage = stage
		if validateValue(field, json.RawMessage(cases[0].raw), nil) == "" {
			t.Fatal("file reference accepted outside order collection")
		}
	}
}
