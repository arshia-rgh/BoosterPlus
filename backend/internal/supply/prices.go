package supply

import (
	"context"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplieritem"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierprice"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// PriceInput edits a private offer; empty mapping values leave it needing review.
type PriceInput struct {
	ImportID       string `json:"import_id"`
	Version        int    `json:"version"`
	MarkupBPS      *int   `json:"markup_bps"`
	OverrideMinor  string `json:"override_minor"`
	GameID         string `json:"game_id"`
	Region         string `json:"region"`
	DeliveryMethod string `json:"delivery_method"`
}

// Pricing keeps unit costs and quantity previews separate and exact in JSON.
type Pricing struct {
	Version            int      `json:"version"`
	MarkupBPS          *int     `json:"markup_bps"`
	EffectiveMarkupBPS int      `json:"effective_markup_bps"`
	OverrideMinor      string   `json:"override_minor"`
	CostUSD            string   `json:"cost_usd"`
	PreviewQuantity    string   `json:"preview_quantity"`
	PreviewAmountMinor string   `json:"preview_amount_minor"`
	GameID             string   `json:"game_id"`
	Region             string   `json:"region"`
	DeliveryMethod     string   `json:"delivery_method"`
	ShopProductID      string   `json:"shop_product_id"`
	Issues             []string `json:"issues"`
}

var minor = regexp.MustCompile(`^[1-9][0-9]{0,11}$`)

func boundedText(value string, maximum int) bool {
	return utf8.ValidString(value) && len(value) <= maximum && !strings.ContainsAny(value, "\x00\r\n")
}
func sourceKey(value string) bool { return boundedText(value, 240) && strings.TrimSpace(value) != "" }

func validatePrice(input PriceInput) error {
	if !validID(input.ImportID) || input.Version < 0 || input.Version >= 2147483645 || input.MarkupBPS != nil && !validMarkup(*input.MarkupBPS) || input.OverrideMinor != "" && !minor.MatchString(input.OverrideMinor) || input.GameID != "" && !validID(input.GameID) || !boundedText(input.Region, 80) {
		return ErrInvalid
	}
	switch input.DeliveryMethod {
	case "", "id", "account", "code":
		return nil
	default:
		return ErrInvalid
	}
}

func pricing(offer suppliers.Offer, base int, row *ent.SupplierPrice) Pricing {
	out := Pricing{CostUSD: string(offer.Cost), EffectiveMarkupBPS: base, Issues: append([]string{}, offer.ReviewIssues...)}
	if row != nil {
		out.Version, out.MarkupBPS, out.OverrideMinor = row.Version, row.MarkupBps, row.OverrideMinor
		out.GameID, out.Region, out.DeliveryMethod = row.GameID, row.Region, row.DeliveryMethod
		if row.ShopProductID != nil {
			out.ShopProductID = *row.ShopProductID
		}
		if row.MarkupBps != nil {
			out.EffectiveMarkupBPS = *row.MarkupBps
		}
	}
	if !offer.Available {
		out.Issues = append(out.Issues, "supplier_unavailable")
	}
	if out.GameID == "" {
		out.Issues = append(out.Issues, "game_mapping_required")
	}
	if strings.TrimSpace(out.Region) == "" {
		out.Issues = append(out.Issues, "region_review_required")
	}
	if out.DeliveryMethod == "" {
		out.Issues = append(out.Issues, "delivery_review_required")
	}
	quantity := suppliers.Decimal("1")
	if offer.Quantity.Kind == "multiple" {
		if value, err := offer.Quantity.Min.Rational(); err == nil && value.Sign() > 0 {
			quantity = offer.Quantity.Min
		}
	}
	if suppliers.ValidateQuantity(offer.Quantity, quantity) != nil {
		out.Issues = append(out.Issues, "quantity_needs_review")
		return out
	}
	out.PreviewQuantity = string(quantity)
	amount, err := suppliers.Price(offer.Cost, quantity, out.EffectiveMarkupBPS, out.OverrideMinor)
	if err != nil {
		out.Issues = append(out.Issues, "price_unavailable")
	} else {
		out.PreviewAmountMinor = amount
	}
	return out
}

// SetPrice preserves authored prices independently of subsequent supplier imports.
// A stale snapshot or revision cannot replace another administrator's settings.
func (s *Store) SetPrice(ctx context.Context, p *identity.Principal, id suppliers.Connection, productID, offerID string, input PriceInput) (out Pricing, err error) {
	if !validConnection(id) || !sourceKey(productID) || !sourceKey(offerID) || validatePrice(input) != nil {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		conn, e := tx.SupplierConnection.Get(ctx, string(id))
		if e != nil {
			return e
		}
		if conn.CurrentImport != input.ImportID {
			return ErrConflict
		}
		item, e := tx.SupplierItem.Query().Where(supplieritem.ImportIDEQ(input.ImportID), supplieritem.ProductIDEQ(productID)).Only(ctx)
		if e != nil {
			return e
		}
		if item.Data == nil || item.ConnectionID != string(id) {
			return ErrConflict
		}
		var offer *suppliers.Offer
		for _, candidate := range item.Data.Offers {
			if candidate.ID == offerID {
				offer = &candidate
				break
			}
		}
		if offer == nil {
			return ErrInvalid
		}
		if input.GameID != "" {
			game, gameErr := tx.Game.Get(ctx, input.GameID)
			if gameErr != nil {
				return gameErr
			}
			if game.Archived {
				return ErrConflict
			}
		}
		row, e := tx.SupplierPrice.Query().Where(supplierprice.ConnectionIDEQ(string(id)), supplierprice.ProductIDEQ(productID), supplierprice.OfferIDEQ(offerID)).Only(ctx)
		if ent.IsNotFound(e) {
			if input.Version != 0 {
				return ErrConflict
			}
			row, e = tx.SupplierPrice.Create().SetID(uuid.NewString()).SetConnectionID(string(id)).SetProductID(productID).SetOfferID(offerID).
				SetNillableMarkupBps(input.MarkupBPS).SetOverrideMinor(input.OverrideMinor).SetGameID(input.GameID).SetRegion(strings.TrimSpace(input.Region)).SetDeliveryMethod(input.DeliveryMethod).
				SetUpdatedBy(current.User.ID).SetUpdatedAt(s.now()).Save(ctx)
		} else if e == nil {
			if row.Version != input.Version {
				return ErrConflict
			}
			update := tx.SupplierPrice.UpdateOne(row).SetOverrideMinor(input.OverrideMinor).SetGameID(input.GameID).SetRegion(strings.TrimSpace(input.Region)).SetDeliveryMethod(input.DeliveryMethod).
				SetUpdatedBy(current.User.ID).SetUpdatedAt(s.now()).AddVersion(1)
			if input.MarkupBPS == nil {
				update.ClearMarkupBps()
			} else {
				update.SetMarkupBps(*input.MarkupBPS)
			}
			row, e = update.Save(ctx)
		}
		if e != nil {
			return e
		}
		if e = audit(ctx, tx, current.User.ID, row.ID, "price_changed", row.Version, s.now()); e != nil {
			return e
		}
		out = pricing(*offer, conn.MarkupBps, row)
		return nil
	})
	return out, err
}
