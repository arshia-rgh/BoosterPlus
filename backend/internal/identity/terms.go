package identity

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

// TermsVersion reads the current immutable legal release within the caller's transaction.
// Runtime bootstrap terms apply only until the first operator publication.
func (s *Service) TermsVersion(ctx context.Context, client *ent.Client) (string, error) {
	row, e := client.SiteSetting.Get(ctx, "legal")
	if ent.IsNotFound(e) {
		return s.config.TermsVersion, nil
	}
	if e != nil {
		return "", e
	}
	if row.CurrentRelease == "" {
		return s.config.TermsVersion, nil
	}
	release, e := client.SiteRelease.Get(ctx, row.CurrentRelease)
	if e != nil {
		return "", e
	}
	text, ok := release.Data["text"].(string)
	if release.Kind != "legal" || release.Label == "" || !ok || text == "" {
		return "", ErrTerms
	}
	return release.Label, nil
}
func (s *Service) acceptedTerms(ctx context.Context, client *ent.Client, version string) (string, error) {
	current, e := s.TermsVersion(ctx, client)
	if e != nil {
		return "", e
	}
	if version != current {
		// Preserve bootstrap compatibility for internal fixtures and clients before any published policy exists.
		row, readErr := client.SiteSetting.Get(ctx, "legal")
		if readErr != nil && !ent.IsNotFound(readErr) {
			return "", readErr
		}
		if version != "" || row != nil && row.CurrentRelease != "" {
			return "", ErrTerms
		}
	}
	return current, nil
}

// BootstrapTermsVersion reserves the deployment's original legal label against later content replacement.
func (s *Service) BootstrapTermsVersion() string { return s.config.TermsVersion }
