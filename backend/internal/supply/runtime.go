package supply

import (
	"context"
	"log/slog"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/vault"
)

// PurchaserFromConfig binds fixed-host adapters to the same vault as the API.
// Only an explicit isolated Sandbox configuration may enable new purchases.
// Production remains read-only during qualification.
func PurchaserFromConfig(client *ent.Client, keys *vault.Keyring, configs []suppliers.Config) (*Purchaser, error) {
	providers := make([]PurchaseProvider, 0, len(configs))
	enabled := false
	for i, config := range configs {
		if i > 0 && enabled != config.TestOrdersEnabled {
			return nil, ErrInvalid
		}
		enabled = config.TestOrdersEnabled
		provider, err := suppliers.New(config)
		if err != nil {
			return nil, err
		}
		providers = append(providers, provider)
	}
	return NewPurchaser(client, keys, providers, enabled, nil)
}

// RunMaintenance reconciles with GETs and wakes eligible unclaimed paid jobs.
// It never issues a create POST itself. Pausing new purchases
// must not suppress delivery updates for an already accepted supplier order.
func (s *Purchaser) RunMaintenance(ctx context.Context, logger *slog.Logger) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		if len(s.providers) > 0 {
			if err := s.Maintain(ctx); err != nil && ctx.Err() == nil {
				logger.ErrorContext(ctx, "supplier delivery reconciliation requires attention")
			}
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
