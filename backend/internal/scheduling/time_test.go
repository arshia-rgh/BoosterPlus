package scheduling

import (
	"testing"
	"time"
)

func TestLocalTimeResolution(t *testing.T) {
	for _, c := range []struct{ local, zone, choice, want string }{
		{"2026-03-08T02:30", "America/New_York", "", ""},
		{"2026-11-01T01:30", "America/New_York", "", ""},
		{"2026-11-01T01:30", "America/New_York", "first", "2026-11-01T05:30:00Z"},
		{"2026-11-01T01:30", "America/New_York", "second", "2026-11-01T06:30:00Z"},
		{"2026-04-05T01:45", "Australia/Lord_Howe", "first", "2026-04-04T14:45:00Z"},
		{"2026-04-05T01:45", "Australia/Lord_Howe", "second", "2026-04-04T15:15:00Z"},
		{"2026-09-10T12:00", "Asia/Tehran", "", "2026-09-10T08:30:00Z"},
		{"2026-09-10T12:00", "UTC", "", "2026-09-10T12:00:00Z"},
		{"2026-02-30T12:00", "UTC", "", ""},
		{"2026-09-10T12:00", "../../etc/passwd", "", ""},
		{"2026-09-10T12:00", "Local", "", ""},
	} {
		got, err := Resolve(LocalTime{c.local, c.zone, c.choice})
		if c.want == "" {
			if err == nil {
				t.Fatal(c, "accepted")
			}
		} else if err != nil || got.Format(time.RFC3339) != c.want {
			t.Fatal(c, got, err)
		}
	}
}
