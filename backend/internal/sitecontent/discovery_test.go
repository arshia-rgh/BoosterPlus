package sitecontent

import "testing"

func TestDiscoveryContentCompatibilityAndValidation(t *testing.T) {
	t.Parallel()
	if !validIntroductions(nil) || !validPolicySections(nil) {
		t.Fatal("legacy content rejected")
	}
	if validIntroductions([]Introduction{}) {
		t.Fatal("explicit empty section set accepted")
	}
	sections := []Introduction{}
	for _, kind := range []string{"boost", "accounts", "shop", "payment", "news"} {
		sections = append(sections, Introduction{kind, "Reviewed title", "Reviewed copy"})
	}
	if !validIntroductions(sections) {
		t.Fatal("ordered sections rejected")
	}
	sections[0], sections[1] = sections[1], sections[0]
	if validIntroductions(sections) {
		t.Fatal("incorrect section order accepted")
	}
	policy := map[string]any{"text": "Existing immutable terms remain readable and complete.", "sections": []PolicySection{{"privacy", "Privacy", "Reviewed operator privacy information."}}}
	if err := validate("legal", policy); err != nil {
		t.Fatal(err)
	}
	policy["sections"] = []PolicySection{{"wallet", "Wallet", "Unsupported new business policy information."}}
	if err := validate("legal", policy); err == nil {
		t.Fatal("unsupported section accepted")
	}
	policy["sections"] = []PolicySection{{"privacy", "Privacy", "Reviewed operator privacy information."}, {"privacy", "Duplicate", "Reviewed operator privacy information."}}
	if err := validate("legal", policy); err == nil {
		t.Fatal("duplicate policy accepted")
	}
}
