package catalog

// DeliveryBasis pins the start condition in new commercial agreements. Older
// documents without it retain their original wording and interpretation.
const DeliveryBasis = "payment_and_access_v1"

// DeliveryRequest explicitly identifies customer timing preferences. Labels and
// field names never infer a contractual promise or a clock for older releases.
type DeliveryRequest struct {
	Minimum string `json:"minimum"`
	Maximum string `json:"maximum"`
	Basis   string `json:"basis"`
}

func validateDeliveryRequest(service ServiceDefinition, path string, add func(string, string)) {
	r := service.DeliveryRequest
	if r == nil {
		return
	}
	fields := fieldMap(service.Fields)
	lo, lok := fields[r.Minimum]
	hi, hik := fields[r.Maximum]
	if !lok || !hik || r.Minimum == r.Maximum || lo.Type != "integer" || hi.Type != "integer" || lo.Stage != hi.Stage || lo.Stage == "fulfillment" || r.Basis != DeliveryBasis {
		add(path, "Choose two distinct integer fields in the same estimate/order stage, using the payment-and-access delivery clock.")
		return
	}
	for _, f := range []Field{lo, hi} {
		lower, a := decimal(f.Min)
		upper, b := decimal(f.Max)
		limit, _ := decimal("8760")
		if !a || !b || lower.Sign() <= 0 || upper.Cmp(limit) > 0 {
			add(path, "Requested delivery hours must be positive and bounded to at most 8,760 hours.")
		}
	}
}
