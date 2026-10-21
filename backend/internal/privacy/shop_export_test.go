package privacy

import "testing"

func TestShopExportRetainsAcceptedTermsWithoutStaffProvenance(t *testing.T) {
	product := map[string]any{"asset_source": "Private supplier artwork note", "description": "Accepted description", "policy": map[string]any{"refund_terms": "Accepted full refund"}}
	record := map[string]any{"shop_snapshot": map[string]any{"product": product, "amount_minor": "1150"}}
	omitShopProvenance(record)
	policy, policyOK := product["policy"].(map[string]any)
	snapshot, snapshotOK := record["shop_snapshot"].(map[string]any)
	if _, exists := product["asset_source"]; exists || product["description"] != "Accepted description" || !policyOK || !snapshotOK || policy["refund_terms"] != "Accepted full refund" || snapshot["amount_minor"] != "1150" {
		t.Fatal("export leaked staff notes or changed accepted terms")
	}
	omitShopProvenance(map[string]any{})
}
