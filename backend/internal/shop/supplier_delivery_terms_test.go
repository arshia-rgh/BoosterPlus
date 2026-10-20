package shop

import (
	"reflect"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

func TestSupplierTimingPublicationPreservesLegacyAndManualTerms(t *testing.T) {
	for _, method := range []string{"id", "code", "account"} {
		t.Run(method, func(t *testing.T) {
			value := product()
			value.Supplier = &SupplierProduct{Method: method}
			value.Recipient = nil
			if method == "account" {
				value.Policy.DeliveryMinHours, value.Policy.DeliveryMaxHours = 24, 72
			}
			legacy := value
			if issues := Validate(legacy, true); len(issues) != 0 {
				t.Fatal("legacy accepted contract rejected", issues)
			}
			if method != "account" && len(validateCurrentPublication(legacy)) == 0 {
				t.Fatal("new publication accepted a legacy supplier estimate")
			}
			setSupplierDelivery(&value)
			if method != "account" && value.Reviewed {
				t.Fatal("changed delivery was left reviewed")
			}
			value.Reviewed = true
			if issues := validateCurrentPublication(value); len(issues) != 0 {
				t.Fatal("reviewed delivery category rejected", issues)
			}
			if supplierDeliveryBasis(value) == "" {
				t.Fatal("new contract lost its delivery category")
			}
			if method != "account" && supplierDeliveryBasis(legacy) != "" {
				t.Fatal("legacy hours relabeled instant")
			}
			value.Policy.DeliveryMinHours, value.Policy.DeliveryMaxHours = 0, 0
			if method == "account" && len(validateCurrentPublication(value)) == 0 {
				t.Fatal("account sign-in accepted as instant")
			}
		})
	}
	manual := product()
	setSupplierDelivery(&manual)
	if manual.Policy.DeliveryMinHours != 1 || manual.Policy.DeliveryMaxHours != 24 || !manual.Reviewed {
		t.Fatal("manual product changed")
	}
	if issues := validateCurrentPublication(manual); len(issues) != 0 {
		t.Fatal("manual publication rejected", issues)
	}
	manual.Policy.DeliveryMinHours, manual.Policy.DeliveryMaxHours = 0, 0
	if len(validateCurrentPublication(manual)) == 0 {
		t.Fatal("manual product lost explicit timing validation")
	}
}

func TestSupplierDeliveryDoesNotRelaxReviewAndRefundRequirements(t *testing.T) {
	value := product()
	value.Supplier = &SupplierProduct{Method: "id"}
	value.Recipient = nil
	setSupplierDelivery(&value)
	if len(validateCurrentPublication(value)) == 0 {
		t.Fatal("unreviewed instant offer accepted")
	}
	value.Reviewed = true
	value.Policy.RefundTerms = ""
	if len(validateCurrentPublication(value)) == 0 {
		t.Fatal("instant label bypassed commercial protections")
	}
}

func TestSupplierHistoricalPurchaseSnapshotRemainsReadable(t *testing.T) {
	for _, method := range []string{"id", "code", "account"} {
		t.Run(method, func(t *testing.T) {
			legacy := product()
			legacy.Supplier = &SupplierProduct{Method: method, Quantity: suppliers.Quantity{Kind: "one", Min: "1", Max: "1", Step: "1"}}
			legacy.Recipient = nil
			if method == "account" {
				legacy.Policy.DeliveryMinHours, legacy.Policy.DeliveryMaxHours = 24, 72
			}
			purchase := Purchase{ProductID: "11111111-1111-4111-8111-111111111111", ReleaseID: "22222222-2222-4222-8222-222222222222", Product: legacy, Variant: legacy.Variants[0], Quantity: 1, AmountMinor: "1234", SupplierQuantity: "1"}
			data, err := snapshot(purchase)
			if err != nil {
				t.Fatal(err)
			}
			row := &ent.Order{ShopProductID: purchase.ProductID, VariantKey: purchase.Variant.Key, ShopSnapshot: data}
			updatedDraft := legacy
			setSupplierDelivery(&updatedDraft)
			got, err := purchaseSnapshot(row)
			if err != nil {
				t.Fatal("historical purchase became unreadable", err)
			}
			if !reflect.DeepEqual(got.Product, legacy) {
				t.Fatal("historical purchase terms changed")
			}
		})
	}
}
