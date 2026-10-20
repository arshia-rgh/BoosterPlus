package shop

import (
	"encoding/json"
	"slices"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// Purchase is the immutable public commercial snapshot, never recipient values.
type Purchase struct {
	ProductID        string     `json:"product_id"`
	ReleaseID        string     `json:"release_id"`
	Product          Definition `json:"product"`
	Variant          Variant    `json:"variant"`
	Quantity         int        `json:"quantity"`
	AmountMinor      string     `json:"amount_minor"`
	SupplierQuantity string     `json:"supplier_quantity,omitempty"`
}

func purchaseSnapshot(row *ent.Order) (Purchase, error) {
	var out Purchase
	raw, err := json.Marshal(row.ShopSnapshot)
	if err != nil {
		return out, err
	}
	if err = json.Unmarshal(raw, &out); err != nil {
		return out, err
	}
	if !validID(out.ProductID) || !validID(out.ReleaseID) || out.ProductID != row.ShopProductID || out.Variant.Key != row.VariantKey || len(Validate(out.Product, true)) != 0 {
		return Purchase{}, ErrConflict
	}
	if out.Product.Supplier != nil {
		base := out.Product.Variants[0]
		base.UnitAmountMinor = out.AmountMinor
		if out.Quantity != 1 || base != out.Variant || !amountPattern.MatchString(out.AmountMinor) || suppliers.ValidateQuantity(out.Product.Supplier.Quantity, suppliers.Decimal(out.SupplierQuantity)) != nil {
			return Purchase{}, ErrConflict
		}
		return out, nil
	}
	if out.SupplierQuantity != "" || !slices.Contains(out.Product.Variants, out.Variant) {
		return Purchase{}, ErrConflict
	}
	total, err := Total(out.Variant, out.Quantity)
	if err != nil || total != out.AmountMinor {
		return Purchase{}, ErrConflict
	}
	return out, nil
}
