// Package emailtemplate renders private transactional messages without remote assets or tracking.
package emailtemplate

import (
	"bytes"
	_ "embed"
	"errors"
	"html/template"
	"net"
	"net/url"
	"regexp"
	"strings"
)

// View contains presentation only; callers retain authority, event and delivery checks.
// Code is encrypted with the existing identity message, never stored in job payloads.
type View struct {
	Heading        string `json:"heading,omitempty"`
	Preview        string `json:"preview,omitempty"`
	Code           string `json:"code,omitempty"`
	ActionLabel    string `json:"action_label,omitempty"`
	ActionURL      string `json:"action_url,omitempty"`
	SecondaryLabel string `json:"secondary_label,omitempty"`
	SecondaryURL   string `json:"secondary_url,omitempty"`
}

// Footer also appears in the text alternative.
const Footer = "Need a hand? Support is available 24/7.\nUse your order conversation or email support@playoragames.com.\nKeep verification codes and account credentials private. PLAYORA support will never ask for your wallet seed phrase."

//go:embed message.html
var source string

var page = template.Must(template.New("email").Parse(source))
var codePattern = regexp.MustCompile(`^[0-9]{6}$`)

type document struct {
	Subject string
	View
	Lines []line
}

type line struct {
	Text string
	URL  string
}

// Render escapes all copy and rejects unsafe CTA destinations. Plain text remains
// authoritative and is always supplied alongside this HTML by the SMTP adapter.
func Render(subject, body string, view View) (string, error) {
	if strings.ContainsAny(subject, "\r\n") || len(subject) > 300 || len(body) > 30000 || len(view.Heading) > 300 || len(view.Preview) > 300 {
		return "", errors.New("invalid email presentation")
	}
	if view.Code != "" && !codePattern.MatchString(view.Code) {
		return "", errors.New("invalid verification presentation")
	}
	if view.ActionURL != "" {
		if !safeURL(view.ActionURL) || strings.TrimSpace(view.ActionLabel) == "" || len(view.ActionLabel) > 100 {
			return "", errors.New("invalid email action")
		}
	} else if view.ActionLabel != "" {
		return "", errors.New("email action destination missing")
	}
	if view.SecondaryURL != "" {
		if !safeURL(view.SecondaryURL) || strings.TrimSpace(view.SecondaryLabel) == "" || len(view.SecondaryLabel) > 100 {
			return "", errors.New("invalid secondary email action")
		}
	} else if view.SecondaryLabel != "" {
		return "", errors.New("secondary email destination missing")
	}
	if view.Heading == "" {
		view.Heading = subject
	}
	if view.Preview == "" {
		view.Preview = "An update from PLAYORA. Open this message for details."
	}
	lines := []line{}
	for _, text := range strings.Split(body, "\n") {
		if view.Code != "" && strings.TrimSpace(text) == view.Code {
			continue
		}
		if view.ActionURL != "" && strings.TrimSpace(text) == view.ActionURL {
			continue
		}
		if view.SecondaryURL != "" && strings.TrimSpace(text) == view.SecondaryURL {
			lines = append(lines, line{Text: view.SecondaryLabel, URL: view.SecondaryURL})
		} else {
			lines = append(lines, line{Text: text})
		}
	}
	var output bytes.Buffer
	if err := page.Execute(&output, document{Subject: subject, View: view, Lines: lines}); err != nil {
		return "", errors.New("email rendering failed")
	}
	return output.String(), nil
}

func safeURL(value string) bool {
	if len(value) > 4096 || strings.ContainsAny(value, "\r\n\t\\") {
		return false
	}
	u, err := url.Parse(value)
	if err != nil || u.Host == "" || u.User != nil || u.Opaque != "" {
		return false
	}
	if u.Scheme == "https" {
		return true
	}
	ip := net.ParseIP(u.Hostname())
	return u.Scheme == "http" && (u.Hostname() == "localhost" || ip != nil && ip.IsLoopback())
}
