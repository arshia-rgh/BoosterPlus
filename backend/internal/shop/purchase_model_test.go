package shop

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
)

func TestPurchaseSnapshotRejectsMismatchedContractTerms(t *testing.T) {
	for _, mode := range []string{"valid", "product", "variant", "total", "quantity", "unreviewed", "disabled", "missing"} {
		t.Run(mode, func(t *testing.T) {
			definition := product()
			purchase := Purchase{ProductID: uuid.NewString(), ReleaseID: uuid.NewString(), Product: definition, Variant: definition.Variants[0], Quantity: 2, AmountMinor: "2468"}
			row := &ent.Order{ShopProductID: purchase.ProductID, VariantKey: purchase.Variant.Key}
			switch mode {
			case "product":
				purchase.ProductID = uuid.NewString()
			case "variant":
				purchase.Variant.Server = "Different server"
			case "total":
				purchase.AmountMinor = "1234"
			case "quantity":
				purchase.Quantity = 0
			case "unreviewed":
				purchase.Product.Reviewed = false
			case "disabled":
				purchase.Variant.Enabled = false
			case "missing":
				purchase.ReleaseID = ""
			}
			raw, err := json.Marshal(purchase)
			if err != nil {
				t.Fatal(err)
			}
			if err = json.Unmarshal(raw, &row.ShopSnapshot); err != nil {
				t.Fatal(err)
			}
			_, err = purchaseSnapshot(row)
			if mode == "valid" && err != nil || mode != "valid" && err == nil {
				t.Fatal("snapshot boundary", mode, err)
			}
		})
	}
}
