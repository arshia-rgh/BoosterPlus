package payments

// Remedies are operator-approved service terms, snapshotted at checkout. They
// authorize a review process, never an automatic fee or a staff-paid toggle.
type Remedies struct {
	Cancellation string `json:"cancellation"`
	PartialWork  string `json:"partial_work"`
	NoShow       string `json:"no_show"`
	MissedTarget string `json:"missed_target"`
	RefundBasis  string `json:"refund_basis"`
	RefundFees   string `json:"refund_fees"`
	DisputeHours int    `json:"dispute_hours"`
	AppealHours  int    `json:"appeal_hours"`
	MaxAppeals   int    `json:"max_appeals"`
}

func validateRemedies(value *Remedies) error {
	if value == nil {
		return ErrInvalid
	}
	for _, text := range []string{value.Cancellation, value.PartialWork, value.NoShow, value.MissedTarget, value.RefundBasis, value.RefundFees} {
		if !validText(text, 20, 2000) {
			return ErrInvalid
		}
	}
	if value.DisputeHours < 1 || value.DisputeHours > 8760 || value.AppealHours < 0 || value.AppealHours > 720 || value.MaxAppeals < 0 || value.MaxAppeals > 3 || (value.MaxAppeals > 0 && value.AppealHours == 0) {
		return ErrInvalid
	}
	return nil
}
