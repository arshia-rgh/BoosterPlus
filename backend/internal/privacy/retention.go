package privacy

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

// effectiveRetention never shortens a customer's originally accepted minimum periods.
func effectiveRetention(ctx context.Context, client *ent.Client, id string, current sitecontent.Retention) (sitecontent.Retention, error) {
	release, e := client.SiteRelease.Get(ctx, id)
	if e != nil {
		return current, e
	}
	if release.Kind != "retention" {
		return current, ErrConflict
	}
	original, e := sitecontent.DecodeRetention(release.Data)
	if e != nil {
		return current, e
	}
	combine := func(a, b *int) *int { v := max(*a, *b); return &v }
	current.FinancialDays = combine(current.FinancialDays, original.FinancialDays)
	current.DisputeDays = combine(current.DisputeDays, original.DisputeDays)
	current.AuditDays = combine(current.AuditDays, original.AuditDays)
	current.SupportDays = combine(current.SupportDays, original.SupportDays)
	current.GraceDays = combine(current.GraceDays, original.GraceDays)
	return current, nil
}
