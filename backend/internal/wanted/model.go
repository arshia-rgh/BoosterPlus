// Package wanted publishes staff-authored plain-text requests for accounts PLAYORA can buy.
package wanted

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

// ErrInvalid rejects malformed wanted-account input.
var ErrInvalid = errors.New("wanted account input invalid")

// ErrConflict requires refreshing an outdated or full wanted-account list.
var ErrConflict = errors.New("wanted account changed")

// ErrUnavailable hides wanted accounts for unknown or unavailable games.
var ErrUnavailable = errors.New("wanted accounts unavailable")

const (
	// MaxPerGame bounds staff-managed entries, including hidden ones.
	MaxPerGame = 20
	// MaxShown bounds the entries that may be shown publicly per game.
	MaxShown  = 6
	maxTitle  = 80
	maxBody   = 300
	maxBreaks = 4
)

// Input is the editable plain-text content. Markup is stored and rendered as text.
type Input struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Visible     bool   `json:"visible"`
}

// CreateInput is idempotent per game and request key.
type CreateInput struct {
	RequestKey string `json:"request_key"`
	GameID     string `json:"game_id"`
	Input
}

// UpdateInput replaces the content of one known version.
type UpdateInput struct {
	Version int `json:"version"`
	Input
}

// MoveInput swaps an entry with its neighbour in staff order.
type MoveInput struct {
	Version   int    `json:"version"`
	Direction string `json:"direction"`
}

// VersionInput confirms the exact entry version being removed.
type VersionInput struct {
	Version int `json:"version"`
}

// Entry is the private staff view.
type Entry struct {
	ID          string    `json:"id"`
	GameID      string    `json:"game_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Position    int       `json:"position"`
	Visible     bool      `json:"visible"`
	Version     int       `json:"version"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// List is every staff entry for one game in public order.
type List struct {
	GameID   string  `json:"game_id"`
	GameName string  `json:"game_name"`
	GameSlug string  `json:"game_slug"`
	Open     bool    `json:"accepting_sales"`
	Limit    int     `json:"limit"`
	Shown    int     `json:"shown_limit"`
	Items    []Entry `json:"items"`
}

// PublicEntry omits staff identifiers, dates, ordering values and hidden state.
type PublicEntry struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

// PublicList contains only shown entries while the game accepts account sales.
type PublicList struct {
	Items []PublicEntry `json:"items"`
}

func validID(v string) bool { id, e := uuid.Parse(v); return e == nil && id.String() == v }
func validVersion(v int) bool {
	return v > 0 && v < 2147483645
}

// plain permits line breaks but no other control characters.
func plain(v string, minimum, maximum int) bool {
	return utf8.ValidString(v) && utf8.RuneCountInString(strings.TrimSpace(v)) >= minimum && utf8.RuneCountInString(v) <= maximum &&
		!strings.ContainsFunc(v, func(r rune) bool { return unicode.IsControl(r) && r != '\n' })
}

// normalize trims surrounding whitespace and collapses Windows line endings.
func normalize(in Input) Input {
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(strings.ReplaceAll(in.Description, "\r\n", "\n"))
	return in
}

// Validate returns field issues using the shared catalog issue shape.
func Validate(in Input) []catalog.Issue {
	issues := []catalog.Issue{}
	if !plain(in.Title, 1, maxTitle) || strings.ContainsRune(in.Title, '\n') {
		issues = append(issues, catalog.Issue{Path: "title", Message: "Enter a title of 1–80 characters."})
	}
	if !plain(in.Description, 0, maxBody) || strings.Count(in.Description, "\n") > maxBreaks {
		issues = append(issues, catalog.Issue{Path: "description", Message: "Use up to 300 characters and 4 line breaks."})
	}
	return issues
}

func requestHash(gameID string, in Input) string {
	visible := "0"
	if in.Visible {
		visible = "1"
	}
	sum := sha256.Sum256([]byte(gameID + "\x00" + in.Title + "\x00" + in.Description + "\x00" + visible))
	return hex.EncodeToString(sum[:])
}

func shownLimit() *catalog.Invalid {
	return &catalog.Invalid{Issues: []catalog.Issue{{Path: "visible", Message: "Up to 6 can be shown. Hide another first."}}}
}

func view(row *ent.WantedAccount) Entry {
	return Entry{ID: row.ID, GameID: row.GameID, Title: row.Title, Description: row.Description, Position: row.Position, Visible: row.Visible, Version: row.Version, UpdatedAt: row.UpdatedAt}
}
