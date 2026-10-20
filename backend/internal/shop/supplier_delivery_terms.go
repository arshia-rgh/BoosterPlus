package shop

// validateCurrentPublication adds current authoring rules without invalidating
// immutable publications and accepted snapshots checked by Validate.
func validateCurrentPublication(value Definition) []Issue {
	issues := Validate(value, true)
	if value.Supplier != nil && (value.Supplier.Method == "id" || value.Supplier.Method == "code") && (value.Policy.DeliveryMinHours != 0 || value.Policy.DeliveryMaxHours != 0) {
		issues = append(issues, Issue{Path: "supplier", Message: "Open Supplier offer, then Open supplier library and Refresh draft from supplier settings to apply the fixed delivery category. Review and save its terms afterward."})
	}
	return issues
}

// setSupplierDelivery changes only an explicitly saved/refreshed draft. Immutable
// publications and accepted purchase snapshots retain their original terms.
func setSupplierDelivery(value *Definition) {
	if value.Supplier == nil {
		return
	}
	minimum, maximum := 0, 0
	if value.Supplier.Method == "account" {
		minimum, maximum = 24, 72
	}
	if value.Policy.DeliveryMinHours != minimum || value.Policy.DeliveryMaxHours != maximum {
		value.Reviewed = false
	}
	value.Policy.DeliveryMinHours, value.Policy.DeliveryMaxHours = minimum, maximum
}

// supplierDeliveryBasis freezes the category in a newly accepted contract.
// Positive legacy hour ranges remain legacy estimates, never relabeled instant.
func supplierDeliveryBasis(value Definition) string {
	if value.Supplier == nil {
		return ""
	}
	if value.Policy.DeliveryMinHours == 0 && value.Policy.DeliveryMaxHours == 0 {
		switch value.Supplier.Method {
		case "id":
			return "supplier_instant_id_v1"
		case "code":
			return "supplier_instant_code_v1"
		}
	}
	if value.Supplier.Method == "account" && value.Policy.DeliveryMinHours == 24 && value.Policy.DeliveryMaxHours == 72 {
		return "supplier_account_24_72_v1"
	}
	return ""
}
