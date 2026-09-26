package availability

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"unicode/utf8"

	"entgo.io/ent/dialect/sql"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlistingrelease"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

// AccountCriteria is an explicit public inventory filter; it never contains seller data.
type AccountCriteria struct {
	ListingID string `json:"listing_id"`
	Region    string `json:"region"`
	Rank      string `json:"rank"`
	Currency  string `json:"currency"`
	MaxAmount int64  `json:"max_amount_minor"`
}

func (c AccountCriteria) valid() bool {
	return (c.ListingID == "" || validID(c.ListingID)) && utf8.ValidString(c.Region) && utf8.ValidString(c.Rank) && len(c.Region) <= 80 && len(c.Rank) <= 80 && !strings.ContainsRune(c.Region+c.Rank, 0) && c.MaxAmount >= 0 && c.MaxAmount <= 999999999999 && (c.Currency == "" && c.MaxAmount == 0 || len(c.Currency) == 3 && c.Currency[0] >= 'A' && c.Currency[0] <= 'Z' && c.Currency[1] >= 'A' && c.Currency[1] <= 'Z' && c.Currency[2] >= 'A' && c.Currency[2] <= 'Z')
}
func criteriaData(c *AccountCriteria) (map[string]any, string, error) {
	if c == nil || !c.valid() {
		return nil, "", ErrInvalid
	}
	raw, err := json.Marshal(c)
	if err != nil {
		return nil, "", err
	}
	hash := sha256.Sum256(raw)
	var data map[string]any
	err = json.Unmarshal(raw, &data)
	return data, hex.EncodeToString(hash[:20]), err
}
func readTarget(ctx context.Context, client *ent.Client, t *ent.AvailabilityTarget) (offering, error) {
	if t.Criteria == nil {
		return readOffering(ctx, client, t.Slug, t.PackageKey, t.VariantKey)
	}
	raw, err := json.Marshal(t.Criteria)
	if err != nil {
		return offering{}, err
	}
	var criteria AccountCriteria
	if err = json.Unmarshal(raw, &criteria); err != nil {
		return offering{}, err
	}
	if !criteria.valid() {
		return offering{}, ErrInvalid
	}
	return readAccounts(ctx, client, t.Slug, criteria)
}
func readAccounts(ctx context.Context, client *ent.Client, slug string, c AccountCriteria) (offering, error) {
	result := offering{label: slug + " account inventory", limited: true}
	g, err := client.Game.Query().Where(game.SlugEQ(slug)).Only(ctx)
	if ent.IsNotFound(err) {
		return result, nil
	}
	if err != nil {
		return result, err
	}
	result.gameID = g.ID
	result.exists = g.Published && !g.Archived
	available, err := catalog.GameAvailable(ctx, client, g, "accounts")
	if err != nil {
		return result, err
	}
	if !available {
		return result, nil
	}
	table := sql.Table(accountlisting.Table)
	q := sql.Select(table.C(accountlisting.FieldCurrentRelease)).From(table).Where(sql.And(sql.EQ(table.C(accountlisting.FieldGameID), g.ID), sql.EQ(table.C(accountlisting.FieldState), "published")))
	if c.ListingID != "" {
		q.Where(sql.EQ(table.C(accountlisting.FieldID), c.ListingID))
		result.label += " / saved listing"
	}
	if c.Region != "" {
		q.Where(sql.EQ(table.C(accountlisting.FieldPublicRegion), c.Region))
		result.label += " / " + c.Region
	}
	if c.Rank != "" {
		q.Where(sql.EQ(table.C(accountlisting.FieldPublicRank), c.Rank))
		result.label += " / " + c.Rank
	}
	if c.Currency != "" {
		q.Where(sql.EQ(table.C(accountlisting.FieldPublicCurrency), c.Currency))
	}
	if c.MaxAmount > 0 {
		q.Where(sql.LTE(table.C(accountlisting.FieldPublicAmountMinor), c.MaxAmount))
	}
	// Select one immutable release using a subquery; never load all inventory IDs.
	latest, err := client.AccountListingRelease.Query().Where(func(selector *sql.Selector) { selector.Where(sql.In(selector.C(accountlistingrelease.FieldID), q)) }).Order(ent.Desc(accountlistingrelease.FieldCreatedAt), ent.Desc(accountlistingrelease.FieldID)).First(ctx)
	if ent.IsNotFound(err) {
		return result, nil
	}
	if err != nil {
		return result, err
	}
	if c.Currency != "" {
		result.label += " / " + c.Currency
	}
	if c.MaxAmount > 0 {
		result.label += " up to " + strconv.FormatInt(c.MaxAmount/100, 10) + "." + fmt.Sprintf("%02d", c.MaxAmount%100)
	}
	result.available = true
	result.marker = latest.CreatedAt.UTC().Format("2006-01-02T15:04:05.000000000Z") + latest.ID
	return result, nil
}
func targetHref(origin string, t *ent.AvailabilityTarget) string {
	if t.Criteria != nil {
		return origin + "/accounts?slug=" + url.QueryEscape(t.Slug)
	}
	return origin + "/games/" + t.Slug + "/packages/" + t.PackageKey + "?variant=" + t.VariantKey
}
