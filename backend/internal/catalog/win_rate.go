package catalog

import (
	"regexp"
	"strings"
)

var winRatePercentPattern = regexp.MustCompile(`^(0|[1-9][0-9]?|100)(\.[1-9])?$`)

// IsWinRateField recognizes the new declared type and the original bounded seed
// field. The latter adapter leaves immutable released/accepted documents intact.
func IsWinRateField(field Field) bool {
	return field.Type == "win_rate" || (field.Type == "decimal" && field.Key == "requested_win_rate" && field.Unit == "%" && field.Min == "0" && field.Max == "100")
}

func winRatePercent(value string) bool {
	if !winRatePercentPattern.MatchString(value) {
		return false
	}
	number, ok := decimal(value)
	hundred, _ := decimal("100")
	return ok && number.Cmp(hundred) <= 0
}

func validWinRate(value string) bool {
	if value == "any" || value == "exact:100" {
		return true
	}
	parts := strings.Split(value, ":")
	if len(parts) < 2 || !winRatePercent(parts[1]) {
		return false
	}
	first, _ := decimal(parts[1])
	switch parts[0] {
	case "range":
		if len(parts) != 3 || !winRatePercent(parts[2]) {
			return false
		}
		second, _ := decimal(parts[2])
		return first.Cmp(second) < 0
	case "below":
		return len(parts) == 2 && first.Sign() > 0
	case "above":
		hundred, _ := decimal("100")
		return len(parts) == 2 && first.Cmp(hundred) < 0
	default:
		return false
	}
}
