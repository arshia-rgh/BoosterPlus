package conversations

import (
	"encoding/json"
	"regexp"
	"slices"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

var formKey = regexp.MustCompile(`^[a-z][a-z0-9_]{0,39}$`)

// FormField is an immutable, ordinary description, never a credential value.
type FormField struct {
	Key      string   `json:"key"`
	Label    string   `json:"label"`
	Kind     string   `json:"kind"`
	Required bool     `json:"required"`
	Secure   bool     `json:"secure"`
	Options  []string `json:"options,omitempty"`
}

// FormCreate binds one authored request or completed delivery to its audience.
type FormCreate struct {
	RequestKey       string            `json:"request_key"`
	Mode             string            `json:"mode"`
	Purpose          string            `json:"purpose"`
	Recipient        string            `json:"recipient"`
	ShareWithBooster bool              `json:"share_with_booster"`
	Title            string            `json:"title"`
	Description      string            `json:"description"`
	Fields           []FormField       `json:"fields"`
	Answers          map[string]string `json:"answers,omitempty"`
	ExpiresAt        time.Time         `json:"expires_at"`
}

// FormReply accepts answers only from the recipient of an open request.
type FormReply struct {
	Version    int               `json:"version"`
	RequestKey string            `json:"request_key"`
	Answers    map[string]string `json:"answers"`
}

// FormView omits private identifiers, hashes and secure values entirely.
type FormView struct {
	ID          string            `json:"id"`
	Version     int               `json:"version"`
	Title       string            `json:"title"`
	Description string            `json:"description"`
	Mode        string            `json:"mode"`
	Purpose     string            `json:"purpose"`
	Recipient   string            `json:"recipient"`
	Audience    string            `json:"audience"`
	State       string            `json:"state"`
	Fields      []FormField       `json:"fields"`
	Answers     map[string]string `json:"answers"`
	HasSecure   bool              `json:"has_secure"`
	CanRespond  bool              `json:"can_respond"`
	CanReveal   bool              `json:"can_reveal"`
	CanCancel   bool              `json:"can_cancel"`
	ExpiresAt   time.Time         `json:"expires_at"`
	AnsweredAt  *time.Time        `json:"answered_at"`
}

func canonicalID(value string) bool {
	id, err := uuid.Parse(value)
	return err == nil && id.String() == value
}
func fieldsFrom(row *ent.ConversationForm) ([]FormField, error) {
	raw, err := json.Marshal(row.Fields)
	if err != nil {
		return nil, err
	}
	var result []FormField
	err = json.Unmarshal(raw, &result)
	return result, err
}
func fieldsDocument(fields []FormField) ([]map[string]any, error) {
	raw, err := json.Marshal(fields)
	if err != nil {
		return nil, err
	}
	var result []map[string]any
	err = json.Unmarshal(raw, &result)
	return result, err
}
func validateForm(input FormCreate, now time.Time) (bool, error) {
	if !canonicalID(input.RequestKey) {
		return false, invalid("request_key", "Use a new request reference.")
	}
	if !text(input.Title, 1, 120) {
		return false, invalid("title", "Enter a title of 1–120 characters.")
	}
	if !text(input.Description, 0, 500) {
		return false, invalid("description", "Keep the introduction within 500 characters.")
	}
	if input.Mode != "request" && input.Mode != "share" {
		return false, invalid("mode", "Choose request answers or send details.")
	}
	if !slices.Contains([]string{"information", "game_access", "seller_access", "buyer_access"}, input.Purpose) {
		return false, invalid("purpose", "Choose an available form purpose.")
	}
	if input.Recipient != "customer" && input.Recipient != "booster" {
		return false, invalid("recipient", "Choose the customer or the currently assigned booster.")
	}
	if !input.ExpiresAt.After(now) || input.ExpiresAt.After(now.Add(30*24*time.Hour)) {
		return false, invalid("expires_at", "Choose a future expiry within 30 days.")
	}
	if len(input.Fields) < 1 || len(input.Fields) > 12 {
		return false, invalid("fields", "Add between 1 and 12 fields.")
	}
	seen := map[string]bool{}
	secure := false
	for i, f := range input.Fields {
		path := "fields." + strconv.Itoa(i)
		if !formKey.MatchString(f.Key) || seen[f.Key] {
			return false, invalid(path+".key", "Use a unique field key beginning with a letter.")
		}
		seen[f.Key] = true
		if !text(f.Label, 1, 100) {
			return false, invalid(path+".label", "Enter a field label of 1–100 characters.")
		}
		if !slices.Contains([]string{"text", "multiline", "select"}, f.Kind) {
			return false, invalid(path+".kind", "Choose text, long text or a selection.")
		}
		if f.Kind == "select" {
			if len(f.Options) < 2 || len(f.Options) > 20 {
				return false, invalid(path+".options", "Add 2–20 distinct choices.")
			}
			opts := map[string]bool{}
			for _, v := range f.Options {
				if !text(v, 1, 100) || opts[v] {
					return false, invalid(path+".options", "Use distinct choices of 1–100 characters.")
				}
				opts[v] = true
			}
		} else if len(f.Options) > 0 {
			return false, invalid(path+".options", "Choices belong only to selection fields.")
		}
		secure = secure || f.Secure
	}
	if input.Purpose != "information" && !secure {
		return false, invalid("fields", "Access forms need at least one secure field.")
	}
	if input.Mode == "request" && len(input.Answers) > 0 {
		return false, invalid("answers", "The recipient fills a requested form.")
	}
	return secure, nil
}
func splitAnswers(fields []FormField, answers map[string]string) (map[string]string, map[string]string, error) {
	ordinary, secrets := map[string]string{}, map[string]string{}
	if len(answers) > len(fields) {
		return nil, nil, invalid("answers", "Only answer the fields in this request.")
	}
	known := map[string]bool{}
	for _, f := range fields {
		known[f.Key] = true
		v := answers[f.Key]
		minimum := 0
		if f.Required {
			minimum = 1
		}
		if !text(v, minimum, 2000) {
			return nil, nil, invalid("answers."+f.Key, "Complete this field using at most 2,000 characters.")
		}
		if f.Kind == "select" && v != "" && !slices.Contains(f.Options, v) {
			return nil, nil, invalid("answers."+f.Key, "Choose one of the listed options.")
		}
		if f.Secure {
			secrets[f.Key] = v
		} else {
			ordinary[f.Key] = v
		}
	}
	for k := range answers {
		if !known[k] {
			return nil, nil, invalid("answers", "Only answer the fields in this request.")
		}
	}
	raw, err := json.Marshal(answers)
	if err != nil {
		return nil, nil, err
	}
	defer clear(raw)
	if len(raw) > vault.MaxBytes {
		return nil, nil, invalid("answers", "Keep the complete response within 8 KiB.")
	}
	return ordinary, secrets, nil
}
