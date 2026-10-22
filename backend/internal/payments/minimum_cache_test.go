package payments

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/payments/nowpayments"
)

type minimumFixture struct {
	entered chan struct{}
	calls   atomic.Int64
	fail    atomic.Bool
	block   <-chan struct{}
}

func (f *minimumFixture) MinimumInvoice(ctx context.Context, _ nowpayments.InvoiceRequest) (nowpayments.Minimum, error) {
	f.calls.Add(1)
	if f.entered != nil {
		close(f.entered)
	}
	if f.block != nil {
		select {
		case <-ctx.Done():
			return nowpayments.Minimum{}, ctx.Err()
		case <-f.block:
		}
	}
	if f.fail.Load() {
		return nowpayments.Minimum{}, nowpayments.ErrUnavailable
	}
	return nowpayments.Minimum{Crypto: "1.00001", Fiat: "1.001"}, nil
}

func TestMinimumCacheDailyExpiryFailureAndRecovery(t *testing.T) {
	var cache minimumCache
	provider := &minimumFixture{}
	now := time.Date(2026, 10, 22, 0, 0, 0, 0, time.UTC)
	clock := func() time.Time { return now }
	key := minimumKey{policy: "p", currency: "USD", route: "usdtbsc"}
	first := cache.get(t.Context(), provider, key, clock)
	if first.err != nil || !errors.Is(first.value.Check("100"), nowpayments.ErrBelowMinimum) || first.value.Check("101") != nil {
		t.Fatal("exact minimum comparison", first.err)
	}
	now = now.Add(24*time.Hour - time.Second)
	if cache.get(t.Context(), provider, key, clock).err != nil || provider.calls.Load() != 1 {
		t.Fatal("fresh cache missed")
	}
	now = now.Add(time.Second)
	provider.fail.Store(true)
	if cache.get(t.Context(), provider, key, clock).err == nil {
		t.Fatal("expired success used during outage")
	}
	provider.fail.Store(false)
	if cache.get(t.Context(), provider, key, clock).err == nil || provider.calls.Load() != 2 {
		t.Fatal("failure backoff missed")
	}
	now = now.Add(time.Minute)
	if cache.get(t.Context(), provider, key, clock).err != nil || provider.calls.Load() != 3 {
		t.Fatal("cache failed to recover")
	}
	cache.invalidate(key)
	if cache.get(t.Context(), provider, key, clock).err != nil || provider.calls.Load() != 4 {
		t.Fatal("fresh checkout rejection did not invalidate")
	}
}

func TestMinimumCacheCoalescesConcurrentReadsAndSeparatesPolicies(t *testing.T) {
	var cache minimumCache
	provider := &minimumFixture{}
	key := minimumKey{policy: "p", currency: "USD", route: "usdtbsc"}
	var group sync.WaitGroup
	for range 40 {
		group.Go(func() {
			if cache.get(t.Context(), provider, key, time.Now).err != nil {
				t.Error("concurrent read failed")
			}
		})
	}
	group.Wait()
	if provider.calls.Load() != 1 {
		t.Fatal("duplicate provider reads")
	}
	for _, k := range []minimumKey{{policy: "q", currency: "USD", route: "usdtbsc"}, {policy: "p", currency: "EUR", route: "usdtbsc"}, {policy: "p", currency: "USD", route: "btc"}, {policy: "p", currency: "USD", route: "usdtbsc", fixed: true}, {policy: "p", currency: "USD", route: "usdtbsc", customerFee: true}} {
		if cache.get(t.Context(), provider, k, time.Now).err != nil {
			t.Fatal("separate key failed")
		}
	}
	if provider.calls.Load() != 6 {
		t.Fatal("different policy inputs shared minimums")
	}
	for range 200 {
		key.policy += "x"
		cache.get(t.Context(), provider, key, time.Now)
	}
	if len(cache.entries) != minimumCapacity {
		t.Fatal("unbounded policy cache")
	}
}

func TestMinimumCacheCancelledReadFailsClosed(t *testing.T) {
	var cache minimumCache
	provider := &minimumFixture{block: make(chan struct{})}
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if cache.get(ctx, provider, minimumKey{}, time.Now).err == nil {
		t.Fatal("cancelled provider read enabled payment")
	}
}

func TestMinimumCacheWaitingCancellationDoesNotCancelLeader(t *testing.T) {
	var cache minimumCache
	block := make(chan struct{})
	provider := &minimumFixture{block: block, entered: make(chan struct{})}
	key := minimumKey{policy: "p", currency: "USD", route: "usdtbsc"}
	result := make(chan minimumEntry, 1)
	go func() { result <- cache.get(t.Context(), provider, key, time.Now) }()
	<-provider.entered
	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	if !errors.Is(cache.get(ctx, provider, key, time.Now).err, context.Canceled) {
		t.Fatal("waiting request ignored cancellation")
	}
	close(block)
	if entry := <-result; entry.err != nil {
		t.Fatal(entry.err)
	}
	if cache.get(t.Context(), provider, key, time.Now).err != nil || provider.calls.Load() != 1 {
		t.Fatal("waiting cancellation lost shared evidence")
	}
}
