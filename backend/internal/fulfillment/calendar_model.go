package fulfillment

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/user"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/scheduling"
)

// StaffCalendarProfile declares staffing hints and availability, never permissions.
type StaffCalendarProfile struct {
	Version    int      `json:"version"`
	Timezone   string   `json:"timezone"`
	Enabled    bool     `json:"enabled"`
	GameTags   []string `json:"game_tags"`
	RegionTags []string `json:"region_tags"`
}

// WindowView contains only explicitly offered times, not another customer's booking.
type WindowView struct {
	ID       string    `json:"id"`
	Version  int       `json:"version"`
	StartsAt time.Time `json:"starts_at"`
	EndsAt   time.Time `json:"ends_at"`
	Timezone string    `json:"timezone"`
	Active   bool      `json:"active"`
}

// CalendarView pages immutable dated availability independently of profile revisions.
type CalendarView struct {
	Profile StaffCalendarProfile `json:"profile"`
	Windows []WindowView         `json:"windows"`
	Next    string               `json:"next"`
}

// WindowInput pins local times and explicitly disambiguates repeated clock hours.
type WindowInput struct {
	RequestKey string               `json:"request_key"`
	Start      scheduling.LocalTime `json:"start"`
	End        scheduling.LocalTime `json:"end"`
}

func calendarProfile(row *ent.StaffProfile) StaffCalendarProfile {
	if row == nil {
		return StaffCalendarProfile{Timezone: "UTC", GameTags: []string{}, RegionTags: []string{}}
	}
	return StaffCalendarProfile{row.Version, row.Timezone, row.Enabled, row.GameTags, row.RegionTags}
}
func windowView(row *ent.AvailabilityWindow) WindowView {
	return WindowView{row.ID, row.Version, row.StartsAt, row.EndsAt, row.Timezone, row.Active}
}
func staffTarget(ctx context.Context, c *ent.Client, p *identity.Principal, id string, admin bool) error {
	if !admin && p.User.ID != id {
		return identity.ErrForbidden
	}
	return activeStaff(ctx, c, id)
}
func activeStaff(ctx context.Context, c *ent.Client, id string) error {
	_, err := c.User.Query().Where(user.IDEQ(id), user.RoleIn(identity.RoleBooster, identity.RoleAdmin, identity.RoleOwner), user.SuspendedEQ(false), user.MfaEnabledEQ(true)).Only(ctx)
	return err
}
func staffCapability(admin bool) string {
	if admin {
		return "admin"
	}
	return "booster"
}
func calendarAudit(ctx context.Context, tx *ent.Tx, p *identity.Principal, id, action string, now time.Time) error {
	_, err := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(p.User.ID).SetTargetID(id).SetAction(action).SetMetadata(map[string]string{}).SetCreatedAt(now).Save(ctx)
	return err
}
func cursorPair(cursor string) (time.Time, string, error) {
	if len(cursor) > 160 {
		return time.Time{}, "", ErrInvalid
	}
	raw, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return time.Time{}, "", ErrInvalid
	}
	parts := strings.Split(string(raw), "\n")
	if len(parts) != 2 {
		return time.Time{}, "", ErrInvalid
	}
	at, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return at, "", ErrInvalid
	}
	if value, e := uuid.Parse(parts[1]); e != nil || value.String() != parts[1] {
		return at, "", ErrInvalid
	}
	return at, parts[1], nil
}
func nextCursor(at time.Time, id string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(at.Format(time.RFC3339Nano) + "\n" + id))
}
func validTags(tags []string) bool {
	if len(tags) > 12 {
		return false
	}
	seen := map[string]bool{}
	for _, tag := range tags {
		if !bounded(tag, 1, 48) || strings.TrimSpace(tag) != tag || seen[tag] {
			return false
		}
		seen[tag] = true
	}
	return true
}
func resolveWindow(input WindowInput) (time.Time, time.Time, error) {
	key, err := uuid.Parse(input.RequestKey)
	if err != nil || key.String() != input.RequestKey || input.Start.Zone != input.End.Zone {
		return time.Time{}, time.Time{}, ErrInvalid
	}
	start, err := scheduling.Resolve(input.Start)
	if err != nil {
		return start, time.Time{}, err
	}
	end, err := scheduling.Resolve(input.End)
	if err != nil {
		return start, end, err
	}
	if end.Sub(start) < 15*time.Minute || end.Sub(start) > 12*time.Hour {
		return start, end, ErrInvalid
	}
	return start, end, nil
}
func requestDigest(s *Store, scope string, input any) (string, error) {
	raw, err := json.Marshal(input)
	if err != nil {
		return "", err
	}
	return s.auth.RequestDigest(scope, raw), nil
}
func normalizedTags(tags []string) []string { return slices.Clone(append([]string{}, tags...)) }
