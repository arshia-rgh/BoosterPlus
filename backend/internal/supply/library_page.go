package supply

import (
	"context"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplieritem"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/supplierprice"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func validListingFilter(value string) bool {
	return value == "" || value == "not_added" || value == "added"
}

// Filter current offers, not whole product IDs: one product can have several
// delivery offers and an import can add or remove offers independently.
func filterListingOffers(product ProductView, listing string) ProductView {
	if listing == "" {
		return product
	}
	offers := make([]OfferView, 0, len(product.Offers))
	for _, offer := range product.Offers {
		if (offer.Pricing.ShopProductID != "") == (listing == "added") {
			offers = append(offers, offer)
		}
	}
	product.Offers = offers
	return product
}

// Walk bounded batches from the pinned import until a full matching page is
// found. Filtering only the first 25 rows would hide later unprepared offers.
// The cursor is the last returned product, never the last scanned batch row.
func libraryPage(ctx context.Context, tx *ent.Tx, id suppliers.Connection, importID string, markup int, filter Filters) ([]ProductView, string, error) {
	out := []ProductView{}
	query := tx.SupplierItem.Query().Where(supplieritem.ImportIDEQ(importID)).Order(ent.Asc(supplieritem.FieldID))
	if filter.GameID != "" {
		query.Where(supplieritem.GameIDEQ(filter.GameID))
	}
	if filter.CategoryID != "" {
		query.Where(supplieritem.CategoryIDEQ(filter.CategoryID))
	}
	if search := strings.TrimSpace(filter.Search); search != "" {
		query.Where(supplieritem.Or(supplieritem.TitleContainsFold(search), supplieritem.ProductIDEQ(search)))
	}
	batchSize := 26
	if filter.Listing != "" {
		batchSize = 100
	}
	after, lastMatch := filter.After, ""
	for {
		batch := query.Clone().Limit(batchSize)
		if after != "" {
			batch.Where(supplieritem.IDGT(after))
		}
		rows, err := batch.All(ctx)
		if err != nil {
			return nil, "", err
		}
		if len(rows) == 0 {
			return out, "", nil
		}
		ids := make([]string, len(rows))
		for i, row := range rows {
			ids[i] = row.ProductID
		}
		prices, err := tx.SupplierPrice.Query().Where(supplierprice.ConnectionIDEQ(string(id)), supplierprice.ProductIDIn(ids...)).All(ctx)
		if err != nil {
			return nil, "", err
		}
		index := map[string]map[string]*ent.SupplierPrice{}
		for _, price := range prices {
			if index[price.ProductID] == nil {
				index[price.ProductID] = map[string]*ent.SupplierPrice{}
			}
			index[price.ProductID][price.OfferID] = price
		}
		for _, row := range rows {
			if row.Data == nil || row.ConnectionID != string(id) || row.Data.ID != row.ProductID {
				return nil, "", ErrConflict
			}
			view := filterListingOffers(productView(row.Data, markup, index[row.ProductID]), filter.Listing)
			if filter.Listing != "" && len(view.Offers) == 0 {
				continue
			}
			if len(out) == 25 {
				return out, lastMatch, nil
			}
			out = append(out, view)
			lastMatch = row.ID
		}
		if len(rows) < batchSize {
			return out, "", nil
		}
		after = rows[len(rows)-1].ID
	}
}
