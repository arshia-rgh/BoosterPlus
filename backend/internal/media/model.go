// Package media owns quarantined, audience-bound private images.
package media

import (
	"errors"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

// ErrInvalid rejects unsupported, mismatched, or unsafe upload input.
var ErrInvalid = errors.New("media invalid")

// ErrConflict requires a fresh upload or a completed scan before proceeding.
var ErrConflict = errors.New("media state changed")

// Intent fixes scope, visibility, bytes and type before any object upload.
type Intent struct {
	RequestKey     string `json:"request_key"`
	ConversationID string `json:"conversation_id"`
	Visibility     string `json:"visibility"`
	Checksum       string `json:"checksum"`
	Size           int64  `json:"size"`
	ContentType    string `json:"content_type"`
}

// View excludes object keys, original filenames, checksums and scan diagnostics.
type View struct {
	ID          string    `json:"id"`
	State       string    `json:"state"`
	ContentType string    `json:"content_type"`
	Size        int64     `json:"size"`
	ExpiresAt   time.Time `json:"expires_at"`
}

func view(row *ent.MediaFile) View {
	return View{row.ID, string(row.State), row.ContentType, row.Size, row.ExpiresAt}
}
