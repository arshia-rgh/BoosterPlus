package resale

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
)

// BrowseFilters selects published account metadata, with an explicit currency for price comparisons.
type BrowseFilters struct{ After, Slug, Region, Rank, Search, Currency, MaxMinor, Sort string }

type listingCursor struct {
	Version   int       `json:"v"`
	Filters   string    `json:"f"`
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"t"`
	Amount    int64     `json:"p"`
}

func (f BrowseFilters) validate() error {
	if !text(f.Slug, 0, 80) || !text(f.Region, 0, 80) || !text(f.Rank, 0, 80) || !text(f.Search, 0, 120) || len(f.After) > 1024 {
		return ErrInvalid
	}
	if f.Currency != "" && !currencyCode.MatchString(f.Currency) {
		return ErrInvalid
	}
	if f.MaxMinor != "" && (!minorAmount.MatchString(f.MaxMinor) || f.Currency == "") {
		return ErrInvalid
	}
	switch f.Sort {
	case "", "newest":
	case "price_asc", "price_desc":
		if f.Currency == "" {
			return ErrInvalid
		}
	default:
		return ErrInvalid
	}
	return nil
}
func (f BrowseFilters) fingerprint() string {
	sum := sha256.Sum256([]byte(strings.Join([]string{f.Slug, f.Region, f.Rank, f.Search, f.Currency, f.MaxMinor, f.Sort}, "\x00")))
	return hex.EncodeToString(sum[:])
}
func (f BrowseFilters) cursor() (listingCursor, error) {
	var c listingCursor
	if f.After == "" {
		return c, nil
	}
	if f.Sort == "" {
		if !validID(f.After) {
			return c, ErrInvalid
		}
		c.ID = f.After
		return c, nil
	}
	raw, err := base64.RawURLEncoding.DecodeString(f.After)
	if err != nil {
		return c, ErrInvalid
	}
	if err = json.Unmarshal(raw, &c); err != nil || c.Version != 1 || c.Filters != f.fingerprint() || !validID(c.ID) {
		return c, ErrInvalid
	}
	if f.Sort == "newest" && c.CreatedAt.IsZero() {
		return c, ErrInvalid
	}
	if f.Sort != "newest" && (c.Amount < 1 || c.Amount > 999999999999) {
		return c, ErrInvalid
	}
	return c, nil
}
func (f BrowseFilters) next(row *ent.AccountListing) (string, error) {
	if f.Sort == "" {
		return row.ID, nil
	}
	raw, err := json.Marshal(listingCursor{Version: 1, Filters: f.fingerprint(), ID: row.ID, CreatedAt: row.CreatedAt, Amount: row.PublicAmountMinor})
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}
func (f BrowseFilters) constrain(q *ent.AccountListingQuery, c listingCursor) error {
	if f.Slug != "" {
		q.Where(accountlisting.SlugEQ(f.Slug))
	}
	if f.Region != "" {
		q.Where(accountlisting.PublicRegionEQ(f.Region))
	}
	if f.Rank != "" {
		q.Where(accountlisting.PublicRankEQ(f.Rank))
	}
	if f.Search != "" {
		q.Where(accountlisting.PublicTitleContains(f.Search))
	}
	if f.Currency != "" {
		q.Where(accountlisting.PublicCurrencyEQ(f.Currency))
	}
	if f.MaxMinor != "" {
		amount, err := strconv.ParseInt(f.MaxMinor, 10, 64)
		if err != nil {
			return ErrInvalid
		}
		q.Where(accountlisting.PublicAmountMinorLTE(amount))
	}
	switch f.Sort {
	case "newest":
		q.Order(ent.Desc(accountlisting.FieldCreatedAt), ent.Asc(accountlisting.FieldID))
		if c.ID != "" {
			q.Where(accountlisting.Or(accountlisting.CreatedAtLT(c.CreatedAt), accountlisting.And(accountlisting.CreatedAtEQ(c.CreatedAt), accountlisting.IDGT(c.ID))))
		}
	case "price_asc", "price_desc":
		if f.Sort == "price_asc" {
			q.Order(ent.Asc(accountlisting.FieldPublicAmountMinor), ent.Asc(accountlisting.FieldID))
			if c.ID != "" {
				q.Where(accountlisting.Or(accountlisting.PublicAmountMinorGT(c.Amount), accountlisting.And(accountlisting.PublicAmountMinorEQ(c.Amount), accountlisting.IDGT(c.ID))))
			}
		} else {
			q.Order(ent.Desc(accountlisting.FieldPublicAmountMinor), ent.Asc(accountlisting.FieldID))
			if c.ID != "" {
				q.Where(accountlisting.Or(accountlisting.PublicAmountMinorLT(c.Amount), accountlisting.And(accountlisting.PublicAmountMinorEQ(c.Amount), accountlisting.IDGT(c.ID))))
			}
		}
	default:
		q.Order(ent.Asc(accountlisting.FieldID))
		if c.ID != "" {
			q.Where(accountlisting.IDGT(c.ID))
		}
	}
	return nil
}

// BrowseFiltered applies all price and metadata filters before stable keyset pagination.
// Cursors are public reading positions, not authority or a snapshot reservation.
func (s *Store) BrowseFiltered(ctx context.Context, f BrowseFilters) ([]PublicListing, string, error) {
	result := []PublicListing{}
	if err := f.validate(); err != nil {
		return result, "", err
	}
	cursor, err := f.cursor()
	if err != nil {
		return result, "", err
	}
	q := s.client.AccountListing.Query().Where(accountlisting.StateEQ("published")).Limit(25)
	if err = f.constrain(q, cursor); err != nil {
		return result, "", err
	}
	rows, err := q.All(ctx)
	if err != nil {
		return result, "", err
	}
	next := ""
	if len(rows) > 24 {
		next, err = f.next(rows[23])
		if err != nil {
			return result, "", err
		}
		rows = rows[:24]
	}
	for _, row := range rows {
		value, e := publicListing(ctx, s.client, row)
		if e != nil {
			return result, next, e
		}
		if value.State == "published" {
			result = append(result, value)
		}
	}
	return result, next, nil
}
