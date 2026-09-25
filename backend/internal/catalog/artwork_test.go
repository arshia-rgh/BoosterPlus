package catalog

import "testing"

func TestHeroLayoutBoundaries(t *testing.T) {
	tests := []struct {
		name    string
		layout  *HeroLayout
		invalid bool
	}{
		{name: "legacy release", layout: nil},
		{name: "minimum positions", layout: &HeroLayout{CopySide: "left"}},
		{name: "maximum positions", layout: &HeroLayout{DesktopX: 100, DesktopY: 100, MobileX: 100, MobileY: 100, CopySide: "right"}},
		{name: "negative desktop x", layout: &HeroLayout{DesktopX: -1, CopySide: "left"}, invalid: true},
		{name: "overflow desktop y", layout: &HeroLayout{DesktopY: 101, CopySide: "left"}, invalid: true},
		{name: "negative mobile x", layout: &HeroLayout{MobileX: -1, CopySide: "left"}, invalid: true},
		{name: "overflow mobile y", layout: &HeroLayout{MobileY: 101, CopySide: "left"}, invalid: true},
		{name: "unsupported alignment", layout: &HeroLayout{CopySide: "center"}, invalid: true},
		{name: "css injection", layout: &HeroLayout{CopySide: "left;display:none"}, invalid: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			found := false
			validateHeroLayout(tt.layout, func(string, string) { found = true })
			if found != tt.invalid {
				t.Fatalf("invalid=%v, want %v", found, tt.invalid)
			}
		})
	}
}
