package payments

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

const minimumLifetime = 24 * time.Hour
const minimumRetry = time.Minute
const minimumCapacity = 128

// MinimumProvider is a read-only capability. Missing support fails closed.
type MinimumProvider interface {
	MinimumInvoice(context.Context, nowpayments.InvoiceRequest) (nowpayments.Minimum, error)
}

type minimumKey struct {
	policy, currency, route string
	fixed, customerFee      bool
}
type minimumEntry struct {
	done           chan struct{}
	value          nowpayments.Minimum
	checked, until time.Time
	err            error
}
type minimumCache struct {
	mu      sync.Mutex
	entries map[minimumKey]*minimumEntry
}

// get coalesces reads, bounds memory and never returns expired success evidence.
// The short failure cache prevents a provider outage becoming a request storm.
func (c *minimumCache) get(ctx context.Context, provider MinimumProvider, key minimumKey, now func() time.Time) minimumEntry {
	c.mu.Lock()
	if c.entries == nil {
		c.entries = make(map[minimumKey]*minimumEntry)
	}
	if entry := c.entries[key]; entry != nil {
		if entry.done != nil {
			done := entry.done
			c.mu.Unlock()
			select {
			case <-done:
				return c.get(ctx, provider, key, now)
			case <-ctx.Done():
				return minimumEntry{err: ctx.Err()}
			}
		}
		if now().Before(entry.until) {
			result := *entry
			c.mu.Unlock()
			return result
		}
		delete(c.entries, key)
	}
	if len(c.entries) >= minimumCapacity {
		var oldest minimumKey
		var found *minimumEntry
		for k, entry := range c.entries {
			if entry.done == nil && (found == nil || entry.checked.Before(found.checked)) {
				oldest, found = k, entry
			}
		}
		if found == nil {
			c.mu.Unlock()
			return minimumEntry{err: ErrUnavailable}
		}
		delete(c.entries, oldest)
	}
	entry := &minimumEntry{done: make(chan struct{})}
	c.entries[key] = entry
	c.mu.Unlock()
	readCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	value, err := provider.MinimumInvoice(readCtx, nowpayments.InvoiceRequest{Currency: key.currency, PayCurrency: key.route, FixedRate: key.fixed, FeePaidByUser: key.customerFee})
	cancel()
	// Also validate injected/alternate implementations at the cache boundary.
	if err == nil {
		err = value.Check("999999999999")
		if errors.Is(err, nowpayments.ErrBelowMinimum) {
			err = nil
		}
	}
	c.mu.Lock()
	entry.value, entry.err, entry.checked = value, err, now()
	lifetime := minimumLifetime
	if err != nil {
		lifetime = minimumRetry
	}
	entry.until = entry.checked.Add(lifetime)
	close(entry.done)
	entry.done = nil
	result := *entry
	c.mu.Unlock()
	return result
}

func (c *minimumCache) invalidate(key minimumKey) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if entry := c.entries[key]; entry != nil && entry.done == nil {
		delete(c.entries, key)
	}
}

func routeMinimumKey(policy *PolicyView, currency, route string) minimumKey {
	return minimumKey{policy: policy.ID, currency: currency, route: route, fixed: policy.Data.RateMode == "fixed", customerFee: policy.Data.FeeMode == "customer"}
}

// RunMinimumRefresh maintains this API process's cache, not a worker's separate
// memory. Startup/policy changes warm on the next minute; each success lasts one
// day. Cold customer reads coalesce with the same work. Shutdown cancels all IO.
func (s *Store) RunMinimumRefresh(ctx context.Context) {
	provider, ok := s.provider.(MinimumProvider)
	if !ok || !s.enabled {
		return
	}
	timer := time.NewTicker(time.Minute)
	defer timer.Stop()
	for {
		policy, err := published(ctx, s.client)
		if err == nil && policy != nil && validatePolicy(policy.Data) == nil {
			availability, availableErr := s.currencies(ctx, policy)
			for _, currency := range policy.Data.Currencies {
				for _, route := range policy.Data.Routes {
					if ctx.Err() != nil {
						return
					}
					if availableErr != nil || availability.Routes[route.Code] != route.Network {
						continue
					}
					s.minimums.get(ctx, provider, routeMinimumKey(policy, currency, route.Code), s.instant)
				}
			}
		}
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
		}
	}
}
