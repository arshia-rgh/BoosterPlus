// Package sitecontent owns reviewed public content and owner-defined retention policies.
package sitecontent

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/mail"
	"regexp"
	"strings"
	"unicode/utf8"
)

// ErrInvalid rejects unsupported content, unsafe destinations and missing policies.
var ErrInvalid = errors.New("site content invalid")

// ErrConflict fences publication against stale drafts and duplicate policy labels.
var ErrConflict = errors.New("site content changed")

// FAQ is plain text, never executable HTML or Markdown.
type FAQ struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

// Featured is an explicitly selected internal public destination.
type Featured struct {
	Label string `json:"label"`
	Href  string `json:"href"`
}

// Home configures editorial text and vetted local artwork without accepting scripts or remote fetch targets.
type Home struct {
	Headline         string     `json:"headline"`
	Accent           string     `json:"accent"`
	Description      string     `json:"description"`
	Notice           string     `json:"notice"`
	StartRank        string     `json:"start_rank"`
	EndRank          string     `json:"end_rank"`
	SceneDescription string     `json:"scene_description"`
	Artwork          string     `json:"artwork"`
	ShowScene        bool       `json:"show_scene"`
	ShowPathways     bool       `json:"show_pathways"`
	ShowSteps        bool       `json:"show_steps"`
	ContactEmail     string     `json:"contact_email"`
	SupportHours     string     `json:"support_hours"`
	FAQs             []FAQ      `json:"faqs"`
	Featured         []Featured `json:"featured"`
}

// Legal is operator-authored account and privacy terms; the release label is the accepted version.
type Legal struct {
	Text string `json:"text"`
}

// Retention sets explicit minimum retention periods before requested profile erasure. No periods default to zero.
// Financial and audit evidence is preserved; eligible support content and private files are erased separately.
type Retention struct {
	Enabled          bool   `json:"enabled"`
	FinancialDays    *int   `json:"financial_days"`
	DisputeDays      *int   `json:"dispute_days"`
	AuditDays        *int   `json:"audit_days"`
	SupportDays      *int   `json:"support_days"`
	GraceDays        *int   `json:"grace_days"`
	PolicyText       string `json:"policy_text"`
	BackupPolicy     string `json:"backup_policy"`
	PreserveEvidence bool   `json:"preserve_evidence"`
}

func clean(v string, minimum, maximum int) bool {
	return utf8.ValidString(v) && utf8.RuneCountInString(strings.TrimSpace(v)) >= minimum && utf8.RuneCountInString(v) <= maximum && !strings.ContainsRune(v, 0)
}
func decode(data map[string]any, target any) error {
	raw, e := json.Marshal(data)
	if e != nil || len(raw) > 100000 {
		return ErrInvalid
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if e = d.Decode(target); e != nil {
		return ErrInvalid
	}
	var extra any
	if e = d.Decode(&extra); !errors.Is(e, io.EOF) {
		return ErrInvalid
	}
	return nil
}

var labelPattern = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`)
var destinationPattern = regexp.MustCompile(`^/(games(/[a-z][a-z0-9-]{0,79}(/(services|packages)/[a-z0-9_-]{1,48})?)?|accounts(/[a-f0-9-]{36})?)$`)

func validate(kind string, data map[string]any) error {
	switch kind {
	case "home":
		var h Home
		if e := decode(data, &h); e != nil {
			return e
		}
		if !clean(h.Headline, 1, 80) || !clean(h.Accent, 1, 80) || !clean(h.Description, 1, 400) || !clean(h.Notice, 0, 300) || !clean(h.StartRank, 1, 60) || !clean(h.EndRank, 1, 60) || !clean(h.SceneDescription, 1, 400) || !clean(h.SupportHours, 0, 300) || len(h.FAQs) > 20 || len(h.Featured) > 8 {
			return ErrInvalid
		}
		if h.Artwork != "ascension" && h.Artwork != "none" {
			return ErrInvalid
		}
		if h.ContactEmail != "" {
			a, e := mail.ParseAddress(h.ContactEmail)
			if e != nil || a.Address != h.ContactEmail || len(h.ContactEmail) > 254 {
				return ErrInvalid
			}
		}
		for _, v := range h.FAQs {
			if !clean(v.Question, 1, 200) || !clean(v.Answer, 1, 2000) {
				return ErrInvalid
			}
		}
		for _, v := range h.Featured {
			if !clean(v.Label, 1, 100) || !destinationPattern.MatchString(v.Href) {
				return ErrInvalid
			}
		}
	case "notifications":
		var n Notifications
		if e := decode(data, &n); e != nil {
			return e
		}
		for _, subject := range []string{n.ActivitySubject, n.AvailabilitySubject} {
			if !clean(subject, 1, 100) || strings.ContainsAny(subject, "\r\n") {
				return ErrInvalid
			}
		}
		if !clean(n.ActivityIntro, 1, 500) || !clean(n.AvailabilityIntro, 1, 500) || !clean(n.Footer, 0, 1000) {
			return ErrInvalid
		}
	case "legal":
		var l Legal
		if e := decode(data, &l); e != nil {
			return e
		}
		if !clean(l.Text, 30, 50000) {
			return ErrInvalid
		}
	case "retention":
		var r Retention
		if e := decode(data, &r); e != nil {
			return e
		}
		for _, v := range []*int{r.FinancialDays, r.DisputeDays, r.AuditDays, r.SupportDays, r.GraceDays} {
			if v == nil || *v < 0 || *v > 36500 {
				return ErrInvalid
			}
		}
		if !r.PreserveEvidence || !clean(r.PolicyText, 30, 10000) || !clean(r.BackupPolicy, 20, 4000) {
			return ErrInvalid
		}
	default:
		return ErrInvalid
	}
	return nil
}

// DecodeRetention reads only validated explicit owner policy.
func DecodeRetention(data map[string]any) (Retention, error) {
	var r Retention
	e := validate("retention", data)
	if e == nil {
		e = decode(data, &r)
	}
	return r, e
}
