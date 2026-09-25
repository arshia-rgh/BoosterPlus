package identity

import (
	"net/http"
	"net/url"
	"strings"
)

// Portal is the selected authentication audience, independent of an account's role.
type Portal string

// Supported portal audiences are explicit and independent of staff roles.
const (
	PortalCustomer Portal = "customer"
	PortalBooster  Portal = "booster"
	PortalAdmin    Portal = "admin"
)

func (s *Service) sessionDigest(portal Portal, token string) string {
	return s.digest("session.portal", string(portal), token)
}

func (s *Service) browserDigest(portal Portal, browser string) string {
	return s.digest("browser.portal", string(portal), browser)
}

func portalMatches(principal *Principal, portal Portal) error {
	if principal == nil {
		return nil
	}
	if principal.User == nil || principal.Session == nil {
		return ErrUnauthenticated
	}
	if principal.Session.Portal != string(portal) {
		return ErrForbidden
	}
	return nil
}

func (p Portal) valid() bool { return p == PortalCustomer || p == PortalBooster || p == PortalAdmin }
func (p Portal) permitsRole(role string) bool {
	switch p {
	case PortalCustomer:
		return validateRole(role) == nil
	case PortalBooster:
		return role == RoleBooster || role == RoleAdmin || role == RoleOwner
	case PortalAdmin:
		return role == RoleAdmin || role == RoleOwner
	default:
		return false
	}
}
func (p Portal) home() string {
	switch p {
	case PortalAdmin:
		return "/admin"
	case PortalBooster:
		return "/booster"
	case PortalCustomer:
		return "/account"
	default:
		return ""
	}
}
func (p Portal) login() string {
	switch p {
	case PortalAdmin:
		return "/admin/login"
	case PortalBooster:
		return "/booster/login"
	case PortalCustomer:
		return "/login"
	default:
		return ""
	}
}

// requestPortal selects only an endpoint-authorized audience; it never searches
// cookies or infers authority from the caller's role. Stored session audience,
// current role, MFA and resource permissions are validated separately.
func requestPortal(r *http.Request) (Portal, error) {
	path := r.URL.Path
	portal := PortalCustomer
	shared := false
	switch {
	case strings.HasPrefix(path, "/api/v1/auth/portals/"):
		rest := strings.TrimPrefix(path, "/api/v1/auth/portals/")
		name, _, ok := strings.Cut(rest, "/")
		portal = Portal(name)
		if !ok || !portal.valid() {
			return "", ErrInvalid
		}
	case path == "/api/v1/admin" || strings.HasPrefix(path, "/api/v1/admin/") || path == "/api/v1/portal/admin":
		portal = PortalAdmin
	case path == "/api/v1/booster" || strings.HasPrefix(path, "/api/v1/booster/") || path == "/api/v1/portal/booster":
		portal = PortalBooster
	default:
		// Deliberately not all /me routes: overview and favorites are customer commerce.
		shared = path == "/api/v1/me" || path == "/api/v1/me/profile" || path == "/api/v1/me/sessions" || path == "/api/v1/me/google/unlink" || path == "/api/v1/me/notifications" || strings.HasPrefix(path, "/api/v1/me/notifications/") || path == "/api/v1/media" || strings.HasPrefix(path, "/api/v1/media/") || path == "/api/v1/conversations" || strings.HasPrefix(path, "/api/v1/conversations/")
	}
	headers := r.Header.Values("X-Playora-Portal")
	values, queryErr := url.ParseQuery(r.URL.RawQuery)
	if queryErr != nil {
		return "", ErrInvalid
	}
	query := values["portal"]
	if len(headers) > 1 || len(query) > 1 {
		return "", ErrInvalid
	}
	selected := ""
	if len(headers) == 1 {
		selected = headers[0]
	}
	if len(query) == 1 {
		// Query selection exists only for native read-only streams/downloads; no CSRF
		// credential ever appears in this URL. Mutations must use the header.
		nativeRead := strings.HasPrefix(path, "/api/v1/conversations/") && strings.HasSuffix(path, "/stream") || strings.HasPrefix(path, "/api/v1/media/") && strings.HasSuffix(path, "/content")
		if r.Method != http.MethodGet || !nativeRead {
			return "", ErrInvalid
		}
		if selected != "" && selected != query[0] {
			return "", ErrInvalid
		}
		selected = query[0]
	}
	if len(headers)+len(query) > 0 {
		choice := Portal(selected)
		if !choice.valid() {
			return "", ErrInvalid
		}
		if shared {
			portal = choice
		} else if choice != portal {
			return "", ErrForbidden
		}
	}
	return portal, nil
}
