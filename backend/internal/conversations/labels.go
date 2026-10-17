package conversations

import "github.com/arshia-rgh/BoosterPlus/backend/internal/identity"

// staffLabel never falls back to a private email address or profile name.
func staffLabel(role, alias string) string {
	if alias != "" {
		return alias
	}
	if role == identity.RoleBooster {
		return "Assigned booster"
	}
	return "PLAYORA support"
}
