package config

import (
	"encoding/hex"
	"errors"
	"net"
	"net/url"
	"strconv"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Identity validates provider/cryptographic configuration without contacting external services.
func Identity(getenv func(string) string, environment string) (identity.Config, error) {
	local := environment == "development" || environment == "test"
	key, keyErr := hex.DecodeString(getenv("AUTH_KEY"))
	if keyErr != nil || len(key) != 32 {
		return identity.Config{}, errors.New("AUTH_KEY must be a 32-byte hex secret")
	}
	proxy := getenv("PROXY_SHARED_KEY")
	proxyBytes, proxyErr := hex.DecodeString(proxy)
	if proxyErr != nil || len(proxyBytes) != 32 {
		return identity.Config{}, errors.New("PROXY_SHARED_KEY must be a separate 32-byte hex secret")
	}
	if proxy == getenv("AUTH_KEY") {
		return identity.Config{}, errors.New("authentication and proxy secrets must differ")
	}
	origin, originErr := parseOrigin(getenv("PUBLIC_ORIGIN"), local)
	if originErr != nil {
		return identity.Config{}, originErr
	}
	cfg := identity.Config{Key: key, ProxyKey: proxy, PublicOrigin: origin, SecureCookies: !local, TermsVersion: getenv("TERMS_VERSION"), TermsURL: origin + "/terms", GoogleClientID: getenv("GOOGLE_CLIENT_ID"), GoogleClientSecret: getenv("GOOGLE_CLIENT_SECRET"), SMTPHost: getenv("SMTP_HOST"), SMTPUsername: getenv("SMTP_USERNAME"), SMTPPassword: getenv("SMTP_PASSWORD"), SMTPFrom: getenv("SMTP_FROM")}
	if len(cfg.TermsVersion) == 0 || len(cfg.TermsVersion) > 64 || (!local && strings.HasPrefix(cfg.TermsVersion, "development-")) {
		return identity.Config{}, errors.New("TERMS_VERSION must identify approved account terms")
	}
	if (cfg.GoogleClientID == "") != (cfg.GoogleClientSecret == "") {
		return identity.Config{}, errors.New("google client ID and secret must be configured together")
	}
	if raw := getenv("ALLOWED_ORIGINS"); raw != "" {
		if !local {
			return identity.Config{}, errors.New("extra origins are restricted to development/test")
		}
		for _, value := range strings.Split(raw, ",") {
			allowed, allowedErr := parseOrigin(strings.TrimSpace(value), true)
			if allowedErr != nil {
				return identity.Config{}, allowedErr
			}
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, allowed)
		}
	}
	port, portErr := strconv.Atoi(getenv("SMTP_PORT"))
	if portErr != nil || port < 1 || port > 65535 || cfg.SMTPHost == "" || strings.ContainsAny(cfg.SMTPHost, "/\\\r\n") {
		return identity.Config{}, errors.New("SMTP_HOST/SMTP_PORT are invalid")
	}
	cfg.SMTPPort = port
	if _, mailErr := identity.NormalizeEmail(cfg.SMTPFrom); mailErr != nil {
		return identity.Config{}, errors.New("SMTP_FROM must be a mailbox address")
	}
	switch getenv("SMTP_TLS") {
	case "required":
	case "disabled":
		if !local || cfg.SMTPUsername != "" || cfg.SMTPPassword != "" || (cfg.SMTPHost != "mailpit" && cfg.SMTPHost != "127.0.0.1" && cfg.SMTPHost != "localhost") {
			return identity.Config{}, errors.New("plaintext SMTP is restricted to the unauthenticated local mail catcher")
		}
		cfg.SMTPPlaintext = true
	default:
		return identity.Config{}, errors.New("SMTP_TLS must be required or disabled")
	}
	if (cfg.SMTPUsername == "") != (cfg.SMTPPassword == "") {
		return identity.Config{}, errors.New("SMTP username and password must be configured together")
	}
	return cfg, nil
}
func parseOrigin(value string, local bool) (string, error) {
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || (parsed.Path != "" && parsed.Path != "/") {
		return "", errors.New("PUBLIC_ORIGIN must be a single origin")
	}
	if parsed.Scheme != "https" {
		host := parsed.Hostname()
		if !local || parsed.Scheme != "http" || (host != "localhost" && (net.ParseIP(host) == nil || !net.ParseIP(host).IsLoopback())) {
			return "", errors.New("HTTPS is required for public origins")
		}
	}
	return parsed.Scheme + "://" + parsed.Host, nil
}
