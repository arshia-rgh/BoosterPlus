package shop

import (
	"encoding/json"
	"reflect"
	"strings"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/suppliers"
)

// SupplierProduct exposes only reviewed delivery requirements and quantity units.
// Provider identities, costs, tokens and recipient values stay in private records.
type SupplierProduct struct {
	Method   string             `json:"method"`
	Quantity suppliers.Quantity `json:"quantity"`
	Fields   []suppliers.Field  `json:"fields"`
	Region   suppliers.Region   `json:"eligibility"`
	Testing  bool               `json:"testing"`
}

func supplierDefinition(product suppliers.Product, offer suppliers.Offer, method string, testing bool) *SupplierProduct {
	fields := make([]suppliers.Field, 0, len(offer.Fields))
	for _, field := range offer.Fields {
		// Optional transient secrets belong on the supplier verification page.
		// They must never enter PLAYORA storage or its customer form.
		if field.Transient {
			continue
		}
		field.Pattern = "" // Provider regex is evaluated on the backend only.
		fields = append(fields, field)
	}
	return &SupplierProduct{Method: method, Quantity: offer.Quantity, Fields: fields, Region: product.Region, Testing: testing}
}

func supplierMethod(product suppliers.Product, offer suppliers.Offer, method string) bool {
	if method != "id" && method != "account" && method != "code" {
		return false
	}
	if product.Kind == "cdkey" || product.Kind == "gift_card" {
		return method == "code"
	}
	if strings.HasPrefix(product.ID, "roblox:robux-login:") {
		return method == "account"
	}
	for _, field := range offer.Fields {
		if field.Secret && method != "account" {
			return false
		}
	}
	// A reviewed source hint may be refined, but credential collection cannot
	// be relabeled as an ID-only product.
	return method != "code"
}

func supplierOffer(binding *suppliers.ListingBinding) (suppliers.Offer, error) {
	if binding == nil || (binding.Connection != suppliers.NexusSandbox && binding.Connection != suppliers.NexusProduction) || len(binding.Product.ReviewIssues) != 0 {
		return suppliers.Offer{}, ErrConflict
	}
	for _, offer := range binding.Product.Offers {
		if offer.ID == binding.OfferID && offer.Available && len(offer.ReviewIssues) == 0 {
			for _, field := range offer.Fields {
				if field.Kind == "image" || field.Transient && field.Required {
					return suppliers.Offer{}, ErrConflict
				}
			}
			return offer, nil
		}
	}
	return suppliers.Offer{}, ErrConflict
}

func supplierMatches(value Definition, binding *suppliers.ListingBinding) bool {
	offer, err := supplierOffer(binding)
	if err != nil || value.Supplier == nil || !supplierMethod(binding.Product, offer, value.Supplier.Method) {
		return false
	}
	return reflect.DeepEqual(value.Supplier, supplierDefinition(binding.Product, offer, value.Supplier.Method, binding.Connection.Testing()))
}

func sameSupplier(a, b *SupplierProduct) bool {
	x, e1 := json.Marshal(a)
	y, e2 := json.Marshal(b)
	return e1 == nil && e2 == nil && string(x) == string(y)
}
