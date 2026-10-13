package sitecontent

import (
	"encoding/json"
	"os"
	"testing"
)

func TestApprovedAccountPolicyFitsPublicationContract(t *testing.T) {
	content, err := os.ReadFile("../../../docs/legal/2026-10-13/PUBLIC_POLICY_RELEASE.json")
	if err != nil {
		t.Fatal(err)
	}
	var release struct {
		Label string         `json:"label"`
		Data  map[string]any `json:"data"`
	}
	if err = json.Unmarshal(content, &release); err != nil {
		t.Fatal(err)
	}
	if !labelPattern.MatchString(release.Label) {
		t.Fatal("invalid publication label")
	}
	if err = validate("legal", release.Data); err != nil {
		t.Fatal("approved release cannot be published", err)
	}
}
