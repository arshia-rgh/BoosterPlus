package suppliers

import (
	"context"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

// PendingAction is a private, freshly read customer handoff. Never log its URL.
type PendingAction struct {
	Kind       string `json:"kind"`
	URL        string `json:"url"`
	Employee   string `json:"employee"`
	ProfileURL string `json:"profile_url"`
}

var robloxProfilePath = regexp.MustCompile(`^/users/[1-9][0-9]{0,18}/profile$`)

// PendingAction retrieves the documented GET fallback for a pending Nexus order.
// A missing/not-ready action is not a reason to recreate or resend the order.
func (c *Client) PendingAction(ctx context.Context, id, productID string) (PendingAction, error) {
	if !c.connection.nexus() || !numericIDPattern.MatchString(id) {
		return PendingAction{}, ErrInvalid
	}
	var kind, path string
	switch {
	case strings.HasPrefix(productID, "roblox:robux-login:"):
		kind, path = "verification", "/api/v1/utils/roblox/logpass-order/"+id+"/verification"
	case strings.HasPrefix(productID, "roblox:passes:"):
		kind, path = "join_game", "/api/v1/utils/roblox/superpass-order/"+id+"/employee"
	default:
		return PendingAction{Kind: "none"}, nil
	}
	raw, err := c.request(ctx, http.MethodGet, path, nil, 8192)
	if err != nil {
		return PendingAction{}, err
	}
	defer clear(raw)
	var wire struct {
		Verification struct {
			URL string `json:"url"`
		} `json:"verification"`
		Employee struct {
			Username   string `json:"username"`
			ProfileURL string `json:"profileUrl"`
		} `json:"employee"`
	}
	if decode(raw, &wire) != nil {
		return PendingAction{}, ErrEvidence
	}
	out := PendingAction{Kind: kind}
	if kind == "verification" {
		if !c.verificationURL(wire.Verification.URL) {
			return PendingAction{}, ErrEvidence
		}
		out.URL = wire.Verification.URL
	} else {
		profile, e := url.Parse(wire.Employee.ProfileURL)
		if !plain(wire.Employee.Username, 1, 40) || e != nil || profile.Scheme != "https" || profile.Host != "www.roblox.com" || profile.User != nil || profile.RawQuery != "" || profile.Fragment != "" || !robloxProfilePath.MatchString(profile.Path) {
			return PendingAction{}, ErrEvidence
		}
		out.Employee, out.ProfileURL = wire.Employee.Username, wire.Employee.ProfileURL
	}
	return out, nil
}
