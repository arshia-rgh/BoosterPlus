package conversations

import (
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func TestStaffLabelsKeepAssignedBoosterDistinctAndAliases(t *testing.T) {
	for _, scenario := range []struct{ role, alias, want string }{
		{identity.RoleBooster, "", "Assigned booster"},
		{identity.RoleAdmin, "", "PLAYORA support"},
		{identity.RoleOwner, "", "PLAYORA support"},
		{identity.RoleBooster, "Rank specialist", "Rank specialist"},
		{identity.RoleAdmin, "Support lead", "Support lead"},
	} {
		if got := staffLabel(scenario.role, scenario.alias); got != scenario.want {
			t.Errorf("role %s: got %q, want %q", scenario.role, got, scenario.want)
		}
	}
}
