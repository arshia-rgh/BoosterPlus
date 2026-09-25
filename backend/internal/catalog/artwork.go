package catalog

// HeroLayout keeps artwork framing attached to its immutable catalog release.
// Percentages are bounded data, never administrator-supplied CSS.
type HeroLayout struct {
	DesktopX int    `json:"desktop_x"`
	DesktopY int    `json:"desktop_y"`
	MobileX  int    `json:"mobile_x"`
	MobileY  int    `json:"mobile_y"`
	CopySide string `json:"copy_side"`
}

func validateHeroLayout(layout *HeroLayout, add func(string, string)) {
	if layout == nil {
		return
	}
	for _, position := range []struct {
		name  string
		value int
	}{
		{"desktop_x", layout.DesktopX},
		{"desktop_y", layout.DesktopY},
		{"mobile_x", layout.MobileX},
		{"mobile_y", layout.MobileY},
	} {
		if position.value < 0 || position.value > 100 {
			add("hero_layout."+position.name, "Use a focal position from 0 to 100 percent.")
		}
	}
	if layout.CopySide != "left" && layout.CopySide != "right" {
		add("hero_layout.copy_side", "Choose left or right for desktop text placement.")
	}
}
