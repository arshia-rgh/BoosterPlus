// Package conversations owns private order and pre-sales support.
package conversations

import (
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

// ErrConflict requires reloading administrative state, never silently overwriting it.
var ErrConflict = errors.New("conversation state changed")

// Invalid exposes bounded customer-safe issues, never echoes message content.
type Invalid struct{ Issues []catalog.Issue }

func (e *Invalid) Error() string { return "conversation request invalid" }
func invalid(field, message string) error {
	return &Invalid{[]catalog.Issue{{Path: field, Message: message}}}
}
func text(value string, minimum, maximum int) bool {
	return utf8.ValidString(value) && utf8.RuneCountInString(strings.TrimSpace(value)) >= minimum && utf8.RuneCountInString(value) <= maximum && !strings.ContainsRune(value, 0)
}

// CreateInput binds retry keys to one immutable request.
type CreateInput struct {
	RequestKey string `json:"request_key"`
	Kind       string `json:"kind"`
	OrderID    string `json:"order_id"`
	Subject    string `json:"subject"`
	Slug       string `json:"slug"`
}

// SendInput cannot name a sender, alias, sequence or customer.
type SendInput struct {
	Purpose     string   `json:"purpose,omitempty"`
	Attachments []string `json:"attachments,omitempty"`
	RequestKey  string   `json:"request_key"`
	Body        string   `json:"body"`
	Visibility  string   `json:"visibility"`
}

// Change requires a staff-observed revision for state, assignment and order linking.
type Change struct {
	BoosterShared *bool  `json:"booster_shared,omitempty"`
	Version       int    `json:"version"`
	State         string `json:"state"`
	AssignedTo    string `json:"assigned_to"`
	OrderID       string `json:"order_id"`
}

// View has a separate public sequence/revision/time for customer privacy.
type View struct {
	BoosterShared bool      `json:"booster_shared"`
	ID            string    `json:"id"`
	Kind          string    `json:"kind"`
	OrderID       string    `json:"order_id"`
	LinkedOrderID string    `json:"linked_order_id"`
	Subject       string    `json:"subject"`
	Slug          string    `json:"slug"`
	State         string    `json:"state"`
	AssignedTo    string    `json:"assigned_to,omitempty"`
	Version       int       `json:"version"`
	Sequence      int       `json:"sequence"`
	Unread        int       `json:"unread"`
	UpdatedAt     time.Time `json:"updated_at"`
	CreatedAt     time.Time `json:"created_at"`
}

// Message never exposes a private sender ID to the customer API.
type Message struct {
	Purpose     string    `json:"purpose"`
	Attachments []string  `json:"attachments,omitempty"`
	ID          string    `json:"id"`
	Sequence    int       `json:"sequence"`
	SenderLabel string    `json:"sender_label"`
	SenderRole  string    `json:"sender_role"`
	SenderID    string    `json:"sender_id,omitempty"`
	Visibility  string    `json:"visibility"`
	Body        string    `json:"body"`
	CreatedAt   time.Time `json:"created_at"`
}

// Listing uses bounded stable UUID pagination; activity timestamps remain visible.
type Listing struct {
	Conversations []View `json:"conversations"`
	Next          string `json:"next"`
}

// Messages contains a bounded forward page for backfill or polling.
type Messages struct {
	Messages []Message `json:"messages"`
	Next     int       `json:"next"`
	Latest   int       `json:"latest"`
}
