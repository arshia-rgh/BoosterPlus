package scheduling

import (
	"errors"
	"fmt"
	"slices"
	"time"
)

// ErrCapacity means the declared calendar or booked sessions cannot support this range.
var ErrCapacity = errors.New("insufficient declared working time within the forecast horizon")

// Calendar is an immutable, explicitly declared operating calendar.
type Calendar struct {
	Zone     string         `json:"zone"`
	Windows  []WeeklyWindow `json:"windows"`
	Closures []string       `json:"closures"`
}

// WeeklyWindow uses Sunday=0 and local HH:mm boundaries; only an end may be 24:00.
type WeeklyWindow struct {
	Weekday int    `json:"weekday"`
	Start   string `json:"start"`
	End     string `json:"end"`
}

// Interval contains actual confirmed UTC working instants, without customer identities.
type Interval struct{ Start, End time.Time }

func minuteOfDay(value string, end bool) (int, error) {
	if end && value == "24:00" {
		return 1440, nil
	}
	parsed, err := time.Parse("15:04", value)
	if err != nil || parsed.Format("15:04") != value {
		return 0, ErrTime
	}
	return parsed.Hour()*60 + parsed.Minute(), nil
}

// ValidateCalendar bounds structure, disallows overlapping declarations and validates dates.
func ValidateCalendar(calendar Calendar) error {
	if _, err := Location(calendar.Zone); err != nil {
		return err
	}
	if len(calendar.Windows) < 1 || len(calendar.Windows) > 28 || len(calendar.Closures) > 180 {
		return ErrTime
	}
	type window struct{ weekday, start, end int }
	windows := []window{}
	for _, item := range calendar.Windows {
		start, a := minuteOfDay(item.Start, false)
		end, b := minuteOfDay(item.End, true)
		if a != nil || b != nil || item.Weekday < 0 || item.Weekday > 6 || end <= start {
			return ErrTime
		}
		windows = append(windows, window{item.Weekday, start, end})
	}
	slices.SortFunc(windows, func(a, b window) int {
		if a.weekday != b.weekday {
			return a.weekday - b.weekday
		}
		return a.start - b.start
	})
	for i := 1; i < len(windows); i++ {
		if windows[i].weekday == windows[i-1].weekday && windows[i].start < windows[i-1].end {
			return ErrTime
		}
	}
	seen := map[string]bool{}
	for _, date := range calendar.Closures {
		parsed, err := time.Parse("2006-01-02", date)
		if err != nil || parsed.Format("2006-01-02") != date || seen[date] {
			return ErrTime
		}
		seen[date] = true
	}
	return nil
}

func dayInterval(day time.Time, window WeeklyWindow, zone string) (Interval, error) {
	start, err := Resolve(LocalTime{Local: day.Format("2006-01-02") + "T" + window.Start, Zone: zone, Occurrence: "first"})
	if err != nil {
		return Interval{}, err
	}
	endDay, endClock := day, window.End
	if endClock == "24:00" {
		endDay = day.AddDate(0, 0, 1)
		endClock = "00:00"
	}
	end, err := Resolve(LocalTime{Local: endDay.Format("2006-01-02") + "T" + endClock, Zone: zone, Occurrence: "second"})
	if err != nil || !end.After(start) {
		return Interval{}, ErrTime
	}
	return Interval{start, end}, nil
}

// AdvanceCalendar consumes real working minutes within 90 days. A zero duration
// finds the next open instant. Repeated openings use their first occurrence and
// repeated closings use their second; a needed clock-gap boundary requires review.
func AdvanceCalendar(calendar Calendar, after time.Time, minutes int) (time.Time, error) {
	if minutes < 0 || minutes > 90*24*60 {
		return time.Time{}, ErrCapacity
	}
	if err := ValidateCalendar(calendar); err != nil {
		return time.Time{}, err
	}
	zone, err := Location(calendar.Zone)
	if err != nil {
		return time.Time{}, err
	}
	local := after.In(zone)
	day := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, time.UTC)
	windows := slices.Clone(calendar.Windows)
	slices.SortFunc(windows, func(a, b WeeklyWindow) int {
		if a.Weekday != b.Weekday {
			return a.Weekday - b.Weekday
		}
		return compareClock(a.Start, b.Start)
	})
	remaining := time.Duration(minutes) * time.Minute
	horizon := after.Add(90 * 24 * time.Hour)
	consumedUntil := after
	for range 91 {
		if !slices.Contains(calendar.Closures, day.Format("2006-01-02")) {
			for _, window := range windows {
				if window.Weekday != int(day.Weekday()) {
					continue
				}
				interval, e := dayInterval(day, window, calendar.Zone)
				if e != nil {
					return time.Time{}, e
				}
				start, end := interval.Start, interval.End
				// Distinct local windows may overlap in UTC during a repeated hour.
				// Consume their union so the same real minute is never counted twice.
				if start.Before(consumedUntil) {
					start = consumedUntil
				}
				if end.After(horizon) {
					end = horizon
				}
				if !end.After(start) {
					continue
				}
				if remaining <= end.Sub(start) {
					return start.Add(remaining).UTC(), nil
				}
				remaining -= end.Sub(start)
				consumedUntil = end
			}
		}
		day = day.AddDate(0, 0, 1)
	}
	return time.Time{}, ErrCapacity
}
func compareClock(a, b string) int {
	if a < b {
		return -1
	}
	if a > b {
		return 1
	}
	return 0
}

// AdvanceIntervals consumes only explicitly confirmed sessions, never unconfirmed availability.
func AdvanceIntervals(intervals []Interval, after time.Time, minutes int) (time.Time, error) {
	if minutes < 0 || minutes > 90*24*60 || len(intervals) > 1000 {
		return time.Time{}, ErrCapacity
	}
	windows := slices.Clone(intervals)
	slices.SortFunc(windows, func(a, b Interval) int { return a.Start.Compare(b.Start) })
	for i, value := range windows {
		if !value.End.After(value.Start) || i > 0 && value.Start.Before(windows[i-1].End) {
			return time.Time{}, fmt.Errorf("%w: invalid session intervals", ErrCapacity)
		}
	}
	remaining := time.Duration(minutes) * time.Minute
	horizon := after.Add(90 * 24 * time.Hour)
	for _, window := range windows {
		start, end := window.Start, window.End
		if start.Before(after) {
			start = after
		}
		if end.After(horizon) {
			end = horizon
		}
		if !end.After(start) {
			continue
		}
		if remaining <= end.Sub(start) {
			return start.Add(remaining).UTC(), nil
		}
		remaining -= end.Sub(start)
	}
	return time.Time{}, ErrCapacity
}
