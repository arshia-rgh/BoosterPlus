package supply

import (
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func TestSupplierCommercialBindingIsExactUSD(t *testing.T) {
	for _, row := range []struct {
		currency, amount, expected string
		valid                      bool
	}{
		{"USD", "1050", "1050", true}, {"EUR", "1050", "1050", false}, {"USD", "1050", "1051", false}, {"USD", "0", "0", false}, {"USD", "01", "01", false}, {"USD", "1.00", "1.00", false}, {"USD", "1000000000000", "1000000000000", false},
	} {
		record := &ent.OrderContract{Data: map[string]any{"currency": row.currency, "amount_minor": row.amount}}
		if sameCommercial(record, row.expected) != row.valid {
			t.Fatal("invalid commercial binding", row.currency, row.amount)
		}
	}
}

func TestSupplierTerminalEvidenceUsesPlatformContract(t *testing.T) {
	for _, connection := range []suppliers.Connection{suppliers.VendoriaTest, suppliers.VendoriaProduction} {
		if validProviderState(connection, "failed") || validProviderState(connection, "partially_completed") || !validProviderState(connection, "cancelled") {
			t.Fatal("Nexus terminal semantics used for Vendoria")
		}
	}
	for _, connection := range []suppliers.Connection{suppliers.NexusSandbox, suppliers.NexusProduction} {
		if validProviderState(connection, "cancelled") || !validProviderState(connection, "failed") {
			t.Fatal("Vendoria terminal semantics used for Nexus")
		}
	}
	for _, issue := range []string{"duplicate_provider_orders", "identity_mismatch", "terminal_state_changed", "search_limit_review"} {
		if !needsManualReview(issue) {
			t.Fatal("quarantined evidence may be automatically reused")
		}
	}
	if needsManualReview("not_visible_yet") {
		t.Fatal("eventual visibility should continue read-only reconciliation")
	}
}
