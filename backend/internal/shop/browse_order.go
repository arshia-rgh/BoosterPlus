package shop

import (
	"cmp"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproduct"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/shopproductrelease"
)

const shopPageSize = 50

// A bounded published-data scan avoids schema changes or interpreting a pass's
// duration as its diamond quantity. Only one batch and the best page are held.
// All visibility/search filters apply before ordering and pagination.
func (s *Store) orderedShopRows(ctx context.Context, query *ent.ShopProductQuery, input BrowseInput) ([]*ent.ShopProduct, string, error) {
	anchor, err := input.orderCursor()
	if err != nil {
		return nil, "", err
	}
	// Preserve older bookmarked UUID cursors by resolving their public position.
	if validID(input.After) {
		row, e := query.Clone().Where(shopproduct.IDEQ(input.After)).Only(ctx)
		if e != nil {
			return nil, "", ErrInvalid
		}
		keys, e := s.shopOrderKeys(ctx, []*ent.ShopProduct{row})
		if e != nil {
			return nil, "", e
		}
		anchor = keys[row.ID]
	}
	page := []orderedShopRow{}
	after := ""
	for {
		batch := query.Clone().Select(shopproduct.FieldID, shopproduct.FieldCurrentRelease).Limit(200)
		if after != "" {
			batch.Where(shopproduct.IDGT(after))
		}
		rows, e := batch.All(ctx)
		if e != nil {
			return nil, "", e
		}
		keys, e := s.shopOrderKeys(ctx, rows)
		if e != nil {
			return nil, "", e
		}
		for _, row := range rows {
			key := keys[row.ID]
			if anchor.ID != "" && compareShopKey(key, anchor, input.Sort) <= 0 {
				continue
			}
			page = insertShopRow(page, orderedShopRow{row: row, key: key}, input.Sort)
		}
		if len(rows) < 200 {
			break
		}
		after = rows[len(rows)-1].ID
	}
	next := ""
	if len(page) > shopPageSize {
		next, err = input.encodeOrderCursor(page[shopPageSize-1].key)
		if err != nil {
			return nil, "", err
		}
		page = page[:shopPageSize]
	}
	rows := make([]*ent.ShopProduct, len(page))
	for i, item := range page {
		rows[i] = item.row
	}
	return rows, next, nil
}

func (s *Store) shopOrderKeys(ctx context.Context, rows []*ent.ShopProduct) (map[string]shopOrderKey, error) {
	keys := make(map[string]shopOrderKey, len(rows))
	if len(rows) == 0 {
		return keys, nil
	}
	ids := make([]string, len(rows))
	for i, row := range rows {
		ids[i] = row.CurrentRelease
	}
	releases, err := s.client.ShopProductRelease.Query().Where(shopproductrelease.IDIn(ids...)).All(ctx)
	if err != nil {
		return nil, err
	}
	byID := make(map[string]*ent.ShopProductRelease, len(releases))
	for _, release := range releases {
		byID[release.ID] = release
	}
	for _, row := range rows {
		release := byID[row.CurrentRelease]
		if release == nil || release.ProductID != row.ID {
			return nil, ErrConflict
		}
		value, e := definition(release.Data)
		if e != nil {
			return nil, e
		}
		key, e := newShopOrderKey(row.ID, value)
		if e != nil {
			return nil, e
		}
		keys[row.ID] = key
	}
	return keys, nil
}

type shopOrderKey struct {
	ID       string `json:"id"`
	Kind     int    `json:"k"`
	Region   string `json:"r"`
	Diamonds int64  `json:"d"`
	Currency string `json:"c"`
	Amount   int64  `json:"a"`
}

type orderedShopRow struct {
	row *ent.ShopProduct
	key shopOrderKey
}

func insertShopRow(page []orderedShopRow, item orderedShopRow, order string) []orderedShopRow {
	index, _ := slices.BinarySearchFunc(page, item, func(a, b orderedShopRow) int {
		return compareShopKey(a.key, b.key, order)
	})
	if index > shopPageSize {
		return page
	}
	page = slices.Insert(page, index, item)
	if len(page) > shopPageSize+1 {
		page = page[:shopPageSize+1]
	}
	return page
}

// Only quantities explicitly adjacent to "Diamonds" in the published title
// count. 50 + 5 Diamonds is 55; 1000 Diamonds (500 + 500) stays 1000.
var diamondTitle = regexp.MustCompile(`(?i)(?:^|[^0-9.,])([0-9]+(?:,[0-9]{3})*(?:\s*\+\s*[0-9]+(?:,[0-9]{3})*)*)\s+diamonds?\b`)
var passTitle = regexp.MustCompile(`(?i)\bpass(?:es)?\b`)

func productDiamonds(value Definition) (int, int64) {
	if strings.EqualFold(strings.TrimSpace(value.Category), "passes") || passTitle.MatchString(value.Title) {
		return 1, 0
	}
	match := diamondTitle.FindStringSubmatch(strings.Split(value.Title, "·")[0])
	if len(match) == 0 {
		return 2, 0
	}
	total := int64(0)
	for _, part := range strings.Split(match[1], "+") {
		n, err := strconv.ParseInt(strings.ReplaceAll(strings.TrimSpace(part), ",", ""), 10, 64)
		if err != nil || n < 1 || n > 1000000000 || total > 1000000000-n {
			return 2, 0
		}
		total += n
	}
	return 0, total
}

func newShopOrderKey(id string, value Definition) (shopOrderKey, error) {
	kind, diamonds := productDiamonds(value)
	key := shopOrderKey{ID: id, Kind: kind, Diamonds: diamonds}
	for _, variant := range value.Variants {
		if !variant.Enabled {
			continue
		}
		region := strings.ToLower(strings.TrimSpace(variant.Region))
		if key.Region == "" || compareShopRegion(region, key.Region) < 0 {
			key.Region = region
		}
		price, err := Total(variant, max(1, variant.MinQuantity))
		if err != nil {
			return key, ErrConflict
		}
		amount, err := strconv.ParseInt(price, 10, 64)
		if err != nil || amount < 1 {
			return key, ErrConflict
		}
		// Never compare nominal amounts across currencies as if converted. USD
		// products lead; other currencies form deterministic separate groups.
		if key.Currency == "" || compareShopCurrency(variant.Currency, key.Currency) < 0 || variant.Currency == key.Currency && amount < key.Amount {
			key.Currency, key.Amount = variant.Currency, amount
		}
	}
	if key.Currency == "" {
		return key, ErrConflict
	}
	return key, nil
}

func compareShopRegion(a, b string) int {
	a, b = strings.ToLower(strings.TrimSpace(a)), strings.ToLower(strings.TrimSpace(b))
	rank := func(v string) int {
		if v == "global" {
			return 0
		}
		if v == "" {
			return 2
		}
		return 1
	}
	if c := cmp.Compare(rank(a), rank(b)); c != 0 {
		return c
	}
	return cmp.Compare(a, b)
}

func compareShopCurrency(a, b string) int {
	if a == "USD" && b != "USD" {
		return -1
	}
	if b == "USD" && a != "USD" {
		return 1
	}
	return cmp.Compare(a, b)
}

func compareShopKey(a, b shopOrderKey, order string) int {
	if order == "price_asc" || order == "price_desc" {
		if c := compareShopCurrency(a.Currency, b.Currency); c != 0 {
			return c
		}
		if c := cmp.Compare(a.Amount, b.Amount); c != 0 {
			if order == "price_desc" {
				return -c
			}
			return c
		}
	}
	if c := cmp.Compare(a.Kind, b.Kind); c != 0 {
		return c
	}
	if c := compareShopRegion(a.Region, b.Region); c != 0 {
		return c
	}
	if c := cmp.Compare(a.Diamonds, b.Diamonds); c != 0 {
		if order == "diamonds_desc" {
			return -c
		}
		return c
	}
	return cmp.Compare(a.ID, b.ID)
}

type shopOrderCursor struct {
	Version int          `json:"v"`
	Filters string       `json:"f"`
	Key     shopOrderKey `json:"key"`
}

func (input BrowseInput) validSort() bool {
	return input.Sort == "" || input.Sort == "diamonds_asc" || input.Sort == "diamonds_desc" || input.Sort == "price_asc" || input.Sort == "price_desc"
}

func (input BrowseInput) orderFingerprint() string {
	order := input.Sort
	if order == "" {
		order = "diamonds_asc"
	}
	sum := sha256.Sum256([]byte(strings.Join([]string{input.Slug, strings.TrimSpace(input.Search), input.Region, input.Category, input.Method, order}, "\x00")))
	return hex.EncodeToString(sum[:])
}

func (input BrowseInput) orderCursor() (shopOrderKey, error) {
	if input.After == "" || validID(input.After) {
		return shopOrderKey{}, nil
	}
	var cursor shopOrderCursor
	raw, err := base64.RawURLEncoding.DecodeString(input.After)
	if err != nil {
		return shopOrderKey{}, ErrInvalid
	}
	if err = json.Unmarshal(raw, &cursor); err != nil || cursor.Version != 1 || cursor.Filters != input.orderFingerprint() {
		return shopOrderKey{}, ErrInvalid
	}
	k := cursor.Key
	if !validID(k.ID) || k.Kind < 0 || k.Kind > 2 || !text(k.Region, 0, 80) || k.Diamonds < 0 || k.Diamonds > 1000000000 || k.Amount < 1 || k.Amount > 9999999999990000 || (k.Currency != "USD" && k.Currency != "EUR" && k.Currency != "GBP") {
		return shopOrderKey{}, ErrInvalid
	}
	return k, nil
}

func (input BrowseInput) encodeOrderCursor(key shopOrderKey) (string, error) {
	raw, err := json.Marshal(shopOrderCursor{Version: 1, Filters: input.orderFingerprint(), Key: key})
	return base64.RawURLEncoding.EncodeToString(raw), err
}
