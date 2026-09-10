// Package scheduling resolves explicit local times without guessing clock-change occurrences.
package scheduling

import (
	"errors"
	"regexp"
	"slices"
	"time"
	_ "time/tzdata" // Embed the pinned Go release's IANA data for minimal runtime images.
)

// ErrTime deliberately excludes submitted values.
var ErrTime = errors.New("choose a valid local time, IANA zone and clock-change occurrence")
var zoneName = regexp.MustCompile(`^[A-Za-z0-9_+/-]{1,64}$`)

// LocalTime makes repeated local times explicit instead of silently guessing.
type LocalTime struct {
	Local      string `json:"local"`
	Zone       string `json:"zone"`
	Occurrence string `json:"occurrence"`
}

// Location validates an explicit IANA identifier, never the process-local zone.
func Location(name string) (*time.Location, error) {
	if !zoneName.MatchString(name) || name == "Local" {
		return nil, ErrTime
	}
	location, err := time.LoadLocation(name)
	if err != nil {
		return nil, ErrTime
	}
	return location, nil
}

// Resolve rejects daylight-saving gaps and requires a choice in overlaps.
func Resolve(input LocalTime) (time.Time, error) {
	if !zoneName.MatchString(input.Zone) || input.Zone == "Local" || input.Zone == "" || !slices.Contains([]string{"", "first", "second"}, input.Occurrence) {
		return time.Time{}, ErrTime
	}
	location, err := Location(input.Zone)
	if err != nil {
		return time.Time{}, ErrTime
	}
	wall, err := time.Parse("2006-01-02T15:04", input.Local)
	if err != nil || wall.Format("2006-01-02T15:04") != input.Local {
		return time.Time{}, ErrTime
	}
	// Collect actual zone intervals around this wall time, including half-hour
	// transitions. ZoneBounds avoids assuming every clock change is one hour.
	cursor, end := wall.Add(-36*time.Hour), wall.Add(36*time.Hour)
	offsets := map[int]bool{}
	complete := false
	for range 12 {
		_, offset := cursor.In(location).Zone()
		offsets[offset] = true
		_, bound := cursor.In(location).ZoneBounds()
		if bound.IsZero() || !bound.Before(end) {
			complete = true
			break
		}
		if !bound.After(cursor) {
			return time.Time{}, ErrTime
		}
		cursor = bound
	}
	if !complete {
		return time.Time{}, ErrTime
	}
	candidates := []time.Time{}
	for offset := range offsets {
		candidate := wall.Add(-time.Duration(offset) * time.Second)
		if candidate.In(location).Format("2006-01-02T15:04") == input.Local {
			candidates = append(candidates, candidate.UTC())
		}
	}
	slices.SortFunc(candidates, func(a, b time.Time) int { return a.Compare(b) })
	if len(candidates) == 0 || len(candidates) > 2 {
		return time.Time{}, ErrTime
	}
	if len(candidates) == 1 {
		return candidates[0], nil
	}
	switch input.Occurrence {
	case "first":
		return candidates[0], nil
	case "second":
		return candidates[1], nil
	default:
		return time.Time{}, ErrTime
	}
}
