package config

import (
	"errors"
	"strings"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// Crypto separates merchant credentials from the explicit checkout activation switch.
type Crypto struct {
	Provider        *nowpayments.Config
	Account         string
	Enabled         bool
	OutgoingEnabled bool
}

func crypto(getenv func(string) string, origin string) (Crypto, error) {
	cfg := Crypto{}
	enabled := getenv("PAYMENTS_ENABLED")
	if enabled != "" && enabled != "false" && enabled != "true" {
		return cfg, errors.New("PAYMENTS_ENABLED must be true or false")
	}
	outgoing := getenv("PAYOUTS_ENABLED")
	if outgoing != "" && outgoing != "false" && outgoing != "true" {
		return cfg, errors.New("PAYOUTS_ENABLED must be true or false")
	}
	// Reject stale environment selection instead of ever sending live keys to a retired API.
	if legacy := getenv("NOWPAYMENTS_MODE"); legacy != "" && legacy != "live" {
		return cfg, errors.New("NOWPayments supports only the live API; remove NOWPAYMENTS_MODE")
	}
	configured := false
	for _, key := range []string{"NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET", "NOWPAYMENTS_ACCOUNT_ID", "NOWPAYMENTS_EMAIL", "NOWPAYMENTS_PASSWORD"} {
		configured = configured || getenv(key) != ""
	}
	if !configured {
		if enabled == "true" || outgoing == "true" {
			return cfg, errors.New("enabled payments require configured provider credentials")
		}
		return cfg, nil
	}
	id, err := uuid.Parse(getenv("NOWPAYMENTS_ACCOUNT_ID"))
	if err != nil || id.String() != getenv("NOWPAYMENTS_ACCOUNT_ID") {
		return cfg, errors.New("configure a stable merchant account UUID")
	}
	provider := nowpayments.Config{PayoutsEnabled: outgoing == "true", APIKey: getenv("NOWPAYMENTS_API_KEY"), IPNSecret: getenv("NOWPAYMENTS_IPN_SECRET"), PublicOrigin: origin, ReadOnly: enabled != "true", Email: getenv("NOWPAYMENTS_EMAIL"), Password: getenv("NOWPAYMENTS_PASSWORD")}
	if provider.Email == "" || !strings.Contains(provider.Email, "@") || provider.Password == "" {
		return cfg, errors.New("merchant discovery requires protected dashboard credentials")
	}
	if _, err = nowpayments.New(provider); err != nil {
		return cfg, errors.New("invalid crypto provider configuration")
	}
	cfg.Provider = &provider
	cfg.Account = "live:" + id.String()
	cfg.Enabled = enabled == "true"
	cfg.OutgoingEnabled = outgoing == "true"
	return cfg, nil
}
