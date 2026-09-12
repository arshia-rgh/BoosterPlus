package config

import (
	"errors"
	"strings"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

// Crypto separates merchant credentials from the explicit checkout activation switch.
type Crypto struct {
	Provider *nowpayments.Config
	Account  string
	Enabled  bool
}

func crypto(getenv func(string) string, origin string) (Crypto, error) {
	cfg := Crypto{}
	enabled := getenv("PAYMENTS_ENABLED")
	if enabled != "" && enabled != "false" && enabled != "true" {
		return cfg, errors.New("PAYMENTS_ENABLED must be true or false")
	}
	mode := getenv("NOWPAYMENTS_MODE")
	if mode == "" {
		for _, key := range []string{"NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET", "NOWPAYMENTS_ACCOUNT_ID", "NOWPAYMENTS_EMAIL", "NOWPAYMENTS_PASSWORD"} {
			if getenv(key) != "" {
				return cfg, errors.New("incomplete crypto provider configuration")
			}
		}
		if enabled == "true" {
			return cfg, errors.New("checkout requires configured provider credentials")
		}
		return cfg, nil
	}
	id, err := uuid.Parse(getenv("NOWPAYMENTS_ACCOUNT_ID"))
	if err != nil || id.String() != getenv("NOWPAYMENTS_ACCOUNT_ID") {
		return cfg, errors.New("configure a stable merchant account UUID")
	}
	provider := nowpayments.Config{Mode: mode, APIKey: getenv("NOWPAYMENTS_API_KEY"), IPNSecret: getenv("NOWPAYMENTS_IPN_SECRET"), PublicOrigin: origin, ReadOnly: enabled != "true", Email: getenv("NOWPAYMENTS_EMAIL"), Password: getenv("NOWPAYMENTS_PASSWORD")}
	if provider.Email == "" || !strings.Contains(provider.Email, "@") || provider.Password == "" {
		return cfg, errors.New("merchant discovery requires protected dashboard credentials")
	}
	if _, err = nowpayments.New(provider); err != nil {
		return cfg, errors.New("invalid crypto provider configuration")
	}
	cfg.Provider = &provider
	cfg.Account = mode + ":" + id.String()
	cfg.Enabled = enabled == "true"
	return cfg, nil
}
