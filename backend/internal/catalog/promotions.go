package catalog

import (
	"fmt"
	"regexp"
	"slices"
	"time"

	"github.com/google/uuid"
)

var articleSlugPattern = regexp.MustCompile(`^[a-z][a-z0-9-]{0,99}$`)
var shopVariantKey = regexp.MustCompile(`^[a-z][a-z0-9_-]{0,47}$`)

// Promotion selects an existing released offering, never a second price source.
// Catalog publication is its review/publication history. Inactive definitions
// remain available to staff without becoming public offers.
type Promotion struct {
	Key           string    `json:"key"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	Enabled       bool      `json:"enabled"`
	Target        string    `json:"target"`
	Package       string    `json:"package"`
	Variant       string    `json:"variant"`
	ListingID     string    `json:"listing_id"`
	ArticleID     string    `json:"article_id,omitempty"`
	ArticleSlug   string    `json:"article_slug,omitempty"`
	ProductID     string    `json:"product_id,omitempty"`
	ReleaseID     string    `json:"release_id"`
	CouponCode    string    `json:"coupon_code"`
	CouponVersion int       `json:"coupon_version"`
	StartsAt      time.Time `json:"starts_at"`
	EndsAt        time.Time `json:"ends_at"`
	Priority      int       `json:"priority"`
	ShowQuantity  bool      `json:"show_quantity"`
}

// PromotionView is indicative anonymous discovery. Customer eligibility and
// capacity are checked again in the existing purchase transaction.
type PromotionView struct {
	Key           string    `json:"key"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	Service       string    `json:"service"`
	Target        string    `json:"target"`
	Package       string    `json:"package,omitempty"`
	Variant       string    `json:"variant,omitempty"`
	ListingID     string    `json:"listing_id,omitempty"`
	ArticleID     string    `json:"article_id,omitempty"`
	ArticleSlug   string    `json:"article_slug,omitempty"`
	ProductID     string    `json:"product_id,omitempty"`
	Quantity      int       `json:"quantity,omitempty"`
	ReleaseID     string    `json:"release_id"`
	Currency      string    `json:"currency"`
	AmountMinor   string    `json:"amount_minor"`
	OriginalMinor string    `json:"original_minor,omitempty"`
	CouponCode    string    `json:"coupon_code,omitempty"`
	CouponVersion int       `json:"coupon_version,omitempty"`
	StartsAt      time.Time `json:"starts_at"`
	EndsAt        time.Time `json:"ends_at"`
	Priority      int       `json:"priority"`
	Remaining     *int      `json:"remaining,omitempty"`
	Indicative    bool      `json:"indicative"`
}

func validPublicID(value string) bool {
	parsed, err := uuid.Parse(value)
	return err == nil && parsed.String() == value
}

func validatePromotions(c Configuration, publish bool, add func(string, string)) {
	if c.Discovery == nil {
		return
	}
	definitions := c.Discovery.Promotions
	if len(definitions) > 12 {
		add("discovery.promotions", "At most 12 promotions may belong to a catalog release.")
		return
	}
	seen := map[string]bool{}
	for i, p := range definitions {
		path := fmt.Sprintf("discovery.promotions.%d", i)
		if !keyPattern.MatchString(p.Key) || seen[p.Key] || !validText(p.Title, 1, 100) || !validText(p.Description, 0, 400) {
			add(path, "Use a unique stable key, a title and a bounded description.")
		}
		seen[p.Key] = true
		if p.Priority < 0 || p.Priority > 100 {
			add(path+".priority", "Priority must be from 0 through 100.")
		}
		if !slices.Contains([]string{"package", "account", "shop", "news"}, p.Target) {
			add(path+".target", "Choose a published package, account listing, shop product or article.")
		}
		if p.CouponCode == "" && p.CouponVersion != 0 || p.CouponCode != "" && (!couponCodePattern.MatchString(p.CouponCode) || p.CouponVersion < 1) {
			add(path+".coupon_code", "Bind a reviewed coupon code to its current version, or leave both empty.")
		}
		if p.StartsAt.Year() < 2020 || p.EndsAt.Year() > 9999 || !p.EndsAt.After(p.StartsAt) {
			add(path+".ends_at", "Set a start and end with explicit timezone offsets. The end is exclusive.")
		}
		if p.Target != "news" && (p.ArticleID != "" || p.ArticleSlug != "") {
			add(path, "Article references are only allowed for editorial promotions.")
		}
		switch p.Target {
		case "package":
			if !keyPattern.MatchString(p.Package) || !keyPattern.MatchString(p.Variant) || p.ListingID != "" || p.ProductID != "" || p.ReleaseID != "" {
				add(path, "Choose one package and variant from this catalog release.")
			}
			if publish && p.Enabled {
				var selected *Variant
				for _, pack := range c.Packages {
					if pack.Key != p.Package {
						continue
					}
					for _, variant := range pack.Variants {
						if variant.Key == p.Variant {
							selected = &variant
							break
						}
					}
				}
				if selected == nil || p.ShowQuantity && selected.Capacity == nil {
					add(path, "Choose an existing variant; quantity badges require real finite capacity.")
				}
				if !Available(c, false, "boost") {
					add(path, "Enable the boosting service before publishing this promotion.")
				}
			}
		case "news":
			if !validPublicID(p.ArticleID) || !validPublicID(p.ReleaseID) || !articleSlugPattern.MatchString(p.ArticleSlug) || p.Package != "" || p.Variant != "" || p.ProductID != "" || p.ListingID != "" || p.CouponCode != "" || p.ShowQuantity {
				add(path, "Bind one reviewed article revision and slug; editorial promotions have no purchase price, coupons or stock.")
			}
			if publish && p.Enabled && !Available(c, false, "news") {
				add(path, "Enable News before featuring an article.")
			}
		case "shop":
			if p.Package != "" || p.ListingID != "" || !validPublicID(p.ProductID) || !validPublicID(p.ReleaseID) || !shopVariantKey.MatchString(p.Variant) {
				add(path, "Bind one shop product, reviewed release and variant.")
			}
			if p.CouponCode != "" {
				add(path+".coupon_code", "Shop checkout uses its published product price; coupon promotions are not supported for this target.")
			}
			if publish && p.Enabled && !Available(c, false, "shop") {
				add(path, "Enable Shop before publishing this promotion.")
			}
		case "account":
			if p.CouponCode != "" {
				add(path+".coupon_code", "Account checkout uses its published listing price; coupon promotions are not supported for this target.")
			}
			if p.ProductID != "" || p.Package != "" || p.Variant != "" || !validPublicID(p.ListingID) || !validPublicID(p.ReleaseID) {
				add(path, "Bind one account listing and its reviewed public release.")
			}
			if publish && p.Enabled && !Available(c, false, "accounts") {
				add(path, "Enable Accounts before publishing this promotion.")
			}
		}
	}
}
