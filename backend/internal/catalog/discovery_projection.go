package catalog

import (
	"context"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/publicmetrics"
)

// DiscoveryView keeps mutable public evidence separate from immutable purchase
// snapshots. A price/capacity indication is never a reservation or payment.
type DiscoveryView struct {
	GameID       string                 `json:"game_id"`
	ReleaseID    string                 `json:"release_id"`
	Capabilities []CapabilityPolicy     `json:"capabilities"`
	Promotions   []PromotionView        `json:"promotions"`
	Metrics      []publicmetrics.Metric `json:"metrics"`
}

// DiscoveryProjection binds presentation to one published catalog release.
// Purchases independently revalidate that release and current availability.
func (s *Store) DiscoveryProjection(ctx context.Context, slug string, now time.Time) (DiscoveryView, error) {
	ctx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	release, err := s.publishedRelease(ctx, slug)
	if err != nil {
		return DiscoveryView{}, err
	}
	offers, err := promotionViews(ctx, s.client, release, now)
	if err != nil {
		return DiscoveryView{}, err
	}
	var policy *publicmetrics.Policy
	if release.Configuration.Discovery != nil {
		policy = release.Configuration.Discovery.Metrics
	}
	return DiscoveryView{
		GameID: release.GameID, ReleaseID: release.ID,
		Capabilities: Capabilities(release.Configuration, release.Paused),
		Promotions:   offers, Metrics: publicmetrics.Read(ctx, s.client, policy, release.GameID, now),
	}, nil
}
