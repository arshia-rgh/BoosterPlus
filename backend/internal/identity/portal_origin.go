package identity

import (
	"crypto/hmac"
	"net/http"
	"net/url"
	"strings"
)

func (c Config) splitPortals() bool {
	return c.AdminPublicOrigin != "" || c.BoosterPublicOrigin != ""
}

func (c Config) portalOrigin(portal Portal) string {
	switch portal {
	case PortalAdmin:
		if c.AdminPublicOrigin != "" {
			return c.AdminPublicOrigin
		}
	case PortalBooster:
		if c.BoosterPublicOrigin != "" {
			return c.BoosterPublicOrigin
		}
	case PortalCustomer:
	default:
		return ""
	}
	return c.PublicOrigin
}

func (c Config) portalHomeURL(portal Portal) string {
	if c.splitPortals() && portal != PortalCustomer {
		return c.portalOrigin(portal) + "/"
	}
	return c.portalOrigin(portal) + portal.home()
}

func (c Config) portalLoginURL(portal Portal) string {
	if c.splitPortals() && portal != PortalCustomer {
		return c.portalOrigin(portal) + "/login"
	}
	return c.portalOrigin(portal) + portal.login()
}

// requestOriginMatches binds the audience to the external host chosen by our
// authenticated same-origin proxy. Host/Forwarded/browser-controlled headers are
// deliberately not authority. Public read handlers alone may serve all portals.
func (c Config) requestOriginMatches(r *http.Request, portal Portal, publicRead bool) bool {
	if !c.splitPortals() {
		return true
	}
	origins := r.Header.Values("X-Playora-Request-Origin")
	keys := r.Header.Values("X-Booster-Proxy-Key")
	if len(origins) != 1 || len(keys) != 1 || len(c.ProxyKey) < 32 || !hmac.Equal([]byte(keys[0]), []byte(c.ProxyKey)) {
		return false
	}
	if origins[0] == c.portalOrigin(portal) {
		return true
	}
	return publicRead && (r.Method == http.MethodGet || r.Method == http.MethodHead) && (origins[0] == c.PublicOrigin || origins[0] == c.AdminPublicOrigin || origins[0] == c.BoosterPublicOrigin)
}

func (c Config) mutationOriginMatches(origin string, portal Portal) bool {
	if origin == "" {
		return false
	}
	if origin == c.portalOrigin(portal) {
		return true
	}
	if !c.splitPortals() {
		for _, allowed := range c.AllowedOrigins {
			if origin == allowed {
				return true
			}
		}
	}
	return false
}

// PortalLink turns an internal staff/customer route into its configured absolute
// destination. It accepts only local routes belonging to the named audience;
// callers cannot supply another host, portal, or protocol-relative destination.
func (s *Service) PortalLink(portal Portal, path string) (string, error) {
	parsed, err := url.Parse(path)
	if err != nil || !portal.valid() || !strings.HasPrefix(path, "/") || strings.HasPrefix(path, "//") || strings.ContainsAny(path, "\\\r\n") || parsed.IsAbs() || parsed.Host != "" || parsed.Opaque != "" {
		return "", ErrInvalid
	}
	decoded := parsed.Path
	if strings.HasPrefix(decoded, "//") || strings.ContainsAny(decoded, "\\\r\n") {
		return "", ErrInvalid
	}
	for _, part := range strings.Split(decoded, "/") {
		if part == "." || part == ".." {
			return "", ErrInvalid
		}
	}
	prefix := ""
	switch portal {
	case PortalAdmin, PortalBooster:
		prefix = "/" + string(portal)
		if decoded != prefix && !strings.HasPrefix(decoded, prefix+"/") {
			return "", ErrInvalid
		}
	case PortalCustomer:
		for _, staffPrefix := range []string{"/admin", "/booster"} {
			if decoded == staffPrefix || strings.HasPrefix(decoded, staffPrefix+"/") {
				return "", ErrInvalid
			}
		}
	}
	if prefix != "" && s.config.splitPortals() {
		// Internal routes have literal prefixes. Reject encoded aliases instead of
		// interpreting them differently from the frontend route adapter.
		if path != prefix && !strings.HasPrefix(path, prefix+"/") && !strings.HasPrefix(path, prefix+"?") && !strings.HasPrefix(path, prefix+"#") {
			return "", ErrInvalid
		}
		path = strings.TrimPrefix(path, prefix)
		if path == "" || path[0] == '?' || path[0] == '#' {
			path = "/" + path
		}
		if strings.HasPrefix(path, "//") {
			return "", ErrInvalid
		}
	}
	return s.config.portalOrigin(portal) + path, nil
}
