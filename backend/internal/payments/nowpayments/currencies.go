package nowpayments

import (
	"context"
	"maps"
	"net/http"
	"strings"
	"sync"
	"time"
)

// CurrencyAvailability carries an expiry separate from daily minimum estimates.
type CurrencyAvailability struct {
	Routes     map[string]string
	ValidUntil time.Time
}

type currencyEntry struct {
	done   chan struct{}
	routes map[string]string
	until  time.Time
	err    error
}
type currencyCache struct {
	mu      sync.Mutex
	entries map[bool]*currencyEntry
}

// PaymentCurrencies intersects merchant selections with current provider payment
// availability and the selected rate mode. It never enables a policy route itself.
// Five-minute freshness is separate from the daily minimum cache; failed refreshes
// fail closed and coalesce for one minute. Only two bounded cache keys exist.
func (c *Client) PaymentCurrencies(ctx context.Context, fixed bool) (CurrencyAvailability, error) {
	cache := &c.currencies
	cache.mu.Lock()
	if cache.entries == nil {
		cache.entries = make(map[bool]*currencyEntry)
	}
	if entry := cache.entries[fixed]; entry != nil {
		if entry.done != nil {
			done := entry.done
			cache.mu.Unlock()
			select {
			case <-done:
				return c.PaymentCurrencies(ctx, fixed)
			case <-ctx.Done():
				return CurrencyAvailability{}, ctx.Err()
			}
		}
		if time.Now().Before(entry.until) {
			result, err := CurrencyAvailability{Routes: maps.Clone(entry.routes), ValidUntil: entry.until}, entry.err
			cache.mu.Unlock()
			return result, err
		}
	}
	entry := &currencyEntry{done: make(chan struct{})}
	cache.entries[fixed] = entry
	cache.mu.Unlock()
	readCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	routes, err := c.readPaymentCurrencies(readCtx, fixed)
	cancel()
	cache.mu.Lock()
	entry.routes, entry.err, entry.until = routes, err, time.Now().Add(5*time.Minute)
	if err != nil {
		entry.until = time.Now().Add(time.Minute)
	}
	close(entry.done)
	entry.done = nil
	until := entry.until
	cache.mu.Unlock()
	return CurrencyAvailability{Routes: maps.Clone(routes), ValidUntil: until}, err
}

func (c *Client) readPaymentCurrencies(ctx context.Context, fixed bool) (map[string]string, error) {
	full, err := c.request(ctx, http.MethodGet, "/full-currencies", nil)
	if err != nil {
		return nil, ErrUnavailable
	}
	merchant, err := c.request(ctx, http.MethodGet, "/merchant/coins", nil)
	if err != nil {
		return nil, ErrUnavailable
	}
	selected, err := currencyCodes(merchant["selectedCurrencies"], false)
	if err != nil {
		return nil, err
	}
	if fixed {
		quote, readErr := c.request(ctx, http.MethodGet, "/currencies?fixed_rate=true", nil)
		if readErr != nil {
			return nil, ErrUnavailable
		}
		fixedCodes, parseErr := currencyCodes(quote["currencies"], true)
		if parseErr != nil {
			return nil, parseErr
		}
		for code := range selected {
			if !fixedCodes[code] {
				delete(selected, code)
			}
		}
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
		if selected[code] && networkOK && row["enable"] == true && row["available_for_payment"] == true {
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
func currencyCodes(raw any, quotes bool) (map[string]bool, error) {
	entries, ok := raw.([]any)
	if !ok || len(entries) > 2000 {
		return nil, ErrEvidence
	}
	result := map[string]bool{}
	for _, item := range entries {
		if quotes {
			if row, valid := item.(map[string]any); valid {
				item = row["currency"]
			}
		}
		code, valid := currencyCode(item)
		if !valid || result[code] {
			return nil, ErrEvidence
		}
		result[code] = true
	}
	return result, nil
}
