package scheduling

import (
	"errors"
	"testing"
	"time"
)

func instant(t *testing.T, value string) time.Time {
	t.Helper()
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		t.Fatal(err)
	}
	return parsed
}
func TestWorkingCalendarBoundariesClosuresAndClockChanges(t *testing.T) {
	weekdays := []WeeklyWindow{}
	for day := 1; day <= 5; day++ {
		weekdays = append(weekdays, WeeklyWindow{day, "09:00", "17:00"})
	}
	for _, scenario := range []struct {
		name     string
		calendar Calendar
		after    string
		minutes  int
		want     string
	}{
		{"weekend", Calendar{"UTC", weekdays, nil}, "2026-09-11T16:30:00Z", 120, "2026-09-14T10:30:00Z"},
		{"closure", Calendar{"UTC", weekdays, []string{"2026-09-14"}}, "2026-09-11T16:30:00Z", 120, "2026-09-15T10:30:00Z"},
		{"next opening", Calendar{"UTC", weekdays, nil}, "2026-09-11T17:00:00Z", 0, "2026-09-14T09:00:00Z"},
		{"at close", Calendar{"UTC", weekdays, nil}, "2026-09-11T16:30:00Z", 30, "2026-09-11T17:00:00Z"},
		{"fall repeated hour", Calendar{"America/New_York", []WeeklyWindow{{0, "01:00", "03:00"}}, nil}, "2026-11-01T04:00:00Z", 180, "2026-11-01T08:00:00Z"},
		{"adjacent repeated windows share real minutes", Calendar{"America/New_York", []WeeklyWindow{{0, "01:00", "01:30"}, {0, "01:30", "02:00"}}, nil}, "2026-11-01T04:00:00Z", 120, "2026-11-01T07:00:00Z"},
		{"non-hour repeated windows share real minutes", Calendar{"Australia/Lord_Howe", []WeeklyWindow{{0, "01:30", "01:45"}, {0, "01:45", "02:00"}}, nil}, "2026-04-04T14:00:00Z", 60, "2026-04-04T15:30:00Z"},
		{"midnight end", Calendar{"UTC", []WeeklyWindow{{5, "23:00", "24:00"}}, nil}, "2026-09-11T23:00:00Z", 60, "2026-09-12T00:00:00Z"},
		{"clock gap requires review", Calendar{"America/New_York", []WeeklyWindow{{0, "02:30", "04:00"}}, nil}, "2026-03-08T05:00:00Z", 15, ""},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			got, err := AdvanceCalendar(scenario.calendar, instant(t, scenario.after), scenario.minutes)
			if scenario.want == "" {
				if !errors.Is(err, ErrTime) {
					t.Fatal(err)
				}
				return
			}
			if err != nil || !got.Equal(instant(t, scenario.want)) {
				t.Fatal(got, err)
			}
		})
	}
}
func TestCalendarRejectsInvalidDeclarations(t *testing.T) {
	for _, calendar := range []Calendar{
		{"Local", []WeeklyWindow{{1, "09:00", "17:00"}}, nil},
		{"UTC", nil, nil},
		{"UTC", []WeeklyWindow{{1, "09:00", "17:00"}, {1, "16:00", "18:00"}}, nil},
		{"UTC", []WeeklyWindow{{7, "09:00", "17:00"}}, nil},
		{"UTC", []WeeklyWindow{{1, "24:00", "24:00"}}, nil},
		{"UTC", []WeeklyWindow{{1, "09:00", "17:00"}}, []string{"2026-02-30"}},
		{"UTC", []WeeklyWindow{{1, "09:00", "17:00"}}, []string{"2026-09-10", "2026-09-10"}},
	} {
		if err := ValidateCalendar(calendar); err == nil {
			t.Fatal("invalid calendar accepted")
		}
	}
}
func TestConfirmedIntervalsDoNotInventAvailability(t *testing.T) {
	at := instant(t, "2026-09-10T10:00:00Z")
	windows := []Interval{{at, at.Add(time.Hour)}, {at.Add(3 * time.Hour), at.Add(4 * time.Hour)}}
	end, err := AdvanceIntervals(windows, at, 90)
	if err != nil || !end.Equal(at.Add(210*time.Minute)) {
		t.Fatal(end, err)
	}
	if _, err = AdvanceIntervals(windows, at, 121); !errors.Is(err, ErrCapacity) {
		t.Fatal("unbooked time counted", err)
	}
	if _, err = AdvanceIntervals(append(windows, windows[0]), at, 15); !errors.Is(err, ErrCapacity) {
		t.Fatal("overlap counted twice", err)
	}
	if _, err = AdvanceIntervals(windows, at, -1); !errors.Is(err, ErrCapacity) {
		t.Fatal("negative duration accepted", err)
	}
}
