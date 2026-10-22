package nowpayments

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"
)

type currencyEntry struct {
	done   chan struct{}
	routes map[string]string
	until  time.Time
	err    error
}
type currencyCache struct {
	mu    sync.Mutex
	entry *currencyEntry
}

// PaymentNetwork resolves an exact provider asset code for financial evidence.
// It does not check merchant selections, availability, rates or payment minimums.
// One bounded coalesced directory cache is shared for an hour; failures are
// cached for one minute and never replaced by a guessed ticker/network mapping.
func (c *Client) PaymentNetwork(ctx context.Context, code string) (string, error) {
	if !coinPattern.MatchString(code) {
		return "", ErrInvalid
	}
	cache := &c.currencies
	cache.mu.Lock()
	if entry := cache.entry; entry != nil {
		if entry.done != nil {
			done := entry.done
			cache.mu.Unlock()
			select {
			case <-done:
				return c.PaymentNetwork(ctx, code)
			case <-ctx.Done():
				return "", ctx.Err()
			}
		}
		if time.Now().Before(entry.until) {
			network, err := entry.routes[code], entry.err
			cache.mu.Unlock()
			if err == nil && network == "" {
				err = ErrEvidence
			}
			return network, err
		}
	}
	entry := &currencyEntry{done: make(chan struct{})}
	cache.entry = entry
	cache.mu.Unlock()
	readCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	routes, err := c.readCurrencyNetworks(readCtx)
	cancel()
	cache.mu.Lock()
	entry.routes, entry.err, entry.until = routes, err, time.Now().Add(time.Hour)
	if err != nil {
		entry.until = time.Now().Add(time.Minute)
	}
	close(entry.done)
	entry.done = nil
	cache.mu.Unlock()
	if err == nil && routes[code] == "" {
		err = ErrEvidence
	}
	return routes[code], err
}

func (c *Client) readCurrencyNetworks(ctx context.Context) (map[string]string, error) {
	full, err := c.request(ctx, http.MethodGet, "/full-currencies", nil)
	if err != nil {
		return nil, ErrUnavailable
	}
	entries, ok := full["currencies"].([]any)
	if !ok || len(entries) > 2000 {
		return nil, ErrEvidence
	}
	routes, seen := map[string]string{}, map[string]bool{}
	for _, raw := range entries {
		row, valid := raw.(map[string]any)
		if !valid {
			return nil, ErrEvidence
		}
		code, codeOK := currencyCode(row["code"])
		network, networkOK := currencyCode(row["network"])
		if !codeOK || seen[code] {
			return nil, ErrEvidence
		}
		seen[code] = true
		if networkOK {
			routes[code] = network
		}
	}
	return routes, nil
}

func currencyCode(raw any) (string, bool) {
	code, ok := raw.(string)
	code = strings.ToLower(code)
	return code, ok && coinPattern.MatchString(code)
}
