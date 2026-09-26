package sitecontent

import "slices"

// Introduction is a reviewed homepage section. Kind selects a local icon and
// the shared game-picker destination, never arbitrary HTML, CSS or a URL.
type Introduction struct {
	Kind        string `json:"kind"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

// PolicySection gives the published agreement typed presentation while its
// complete legacy Text and immutable accepted release label remain intact.
type PolicySection struct {
	Kind  string `json:"kind"`
	Title string `json:"title"`
	Text  string `json:"text"`
}

func validIntroductions(items []Introduction) bool {
	if items == nil {
		return true
	}
	kinds := []string{"boost", "accounts", "shop", "payment", "news"}
	if len(items) != len(kinds) {
		return false
	}
	for i, item := range items {
		if item.Kind != kinds[i] || !clean(item.Title, 1, 100) || !clean(item.Description, 1, 1200) {
			return false
		}
	}
	return true
}

func validPolicySections(items []PolicySection) bool {
	if len(items) > 8 {
		return false
	}
	seen := map[string]bool{}
	for _, item := range items {
		if !slices.Contains([]string{"terms", "privacy", "refunds", "account_sales", "contact", "delivery", "cookies", "complaints"}, item.Kind) || seen[item.Kind] || !clean(item.Title, 1, 120) || !clean(item.Text, 20, 10000) {
			return false
		}
		seen[item.Kind] = true
	}
	return true
}
