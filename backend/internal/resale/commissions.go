package resale

import (
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/accountpricing"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
)

func commissionIssue(path, message string) error {
	return &catalog.Invalid{Issues: []catalog.Issue{{Path: path, Message: message}}}
}

func validateNewCommission(terms SellerTerms, expiry, now time.Time) error {
	quote := terms.Commission
	if quote == nil || !quote.Valid(terms.Amount) {
		return commissionIssue("terms.commission.base_minor", "Enter the USD base price and conversion quote. Seller proceeds must equal the base minus the 10% commission.")
	}
	if terms.Model == "consignment" {
		if _, err := accountpricing.BuyerPrice(quote.BaseMinor); err != nil {
			return commissionIssue("terms.commission.base_minor", "Use a base price within the supported buyer-total limit.")
		}
	}
	if quote.QuotedAt.After(now.Add(time.Minute)) || quote.QuotedAt.Before(now.Add(-24*time.Hour)) {
		return commissionIssue("terms.commission.quoted_at", "Use a conversion quote from the past 24 hours. The accepted net is fixed for this offer.")
	}
	if expiry.After(now.Add(7 * 24 * time.Hour)) {
		return commissionIssue("expires_at", "Choose an offer expiry within seven days.")
	}
	if terms.PayoutDelayHours != 0 || terms.PayoutDeadlineHours != 48 {
		return commissionIssue("terms.payout_deadline_hours", "Use the approved 48-hour initiation target and no extra delay after eligibility.")
	}
	return nil
}

func listingCommission(product Product, offerData map[string]any) error {
	if product.Commission == nil || !product.Commission.Valid(product.Currency, product.AmountMinor) {
		return commissionIssue("product.commission.base_minor", "Enter the USD account base price. The buyer total must include its independently rounded 5% commission.")
	}
	// PLAYORA-created inventory (no seller agreement) follows the same published
	// buyer rule as other account sales: base + 5% and the seven-day inspection.
	if offerData == nil {
		if product.DisputeHours != 168 {
			return commissionIssue("product.dispute_hours", "Use the agreed seven-day (168-hour) initial inspection period. Later buyer protection remains available.")
		}
		return nil
	}
	terms, err := decode[SellerTerms](offerData)
	if err != nil {
		return err
	}
	if terms.Commission != nil {
		if !terms.Commission.Valid(terms.Amount) {
			return ErrConflict
		}
		if terms.Model == "consignment" && terms.Commission.BaseMinor != product.Commission.BaseMinor {
			return commissionIssue("product.commission.base_minor", "This consignment base is fixed by the seller's accepted offer. A different base requires a new seller agreement.")
		}
		if product.DisputeHours != 168 {
			return commissionIssue("product.dispute_hours", "Use the agreed seven-day (168-hour) initial inspection period. Later buyer protection remains available.")
		}
	}
	return nil
}

func accountPriceLines(product Product) []catalog.PriceLine {
	if product.Commission == nil {
		return []catalog.PriceLine{}
	}
	return []catalog.PriceLine{
		{Key: "account_base", Label: "Account base price", AmountMinor: product.Commission.BaseMinor},
		{Key: "account_buyer_commission", Label: "Buyer commission (5%)", AmountMinor: product.Commission.FeeMinor},
	}
}

func initialListing(offerData map[string]any) map[string]any {
	terms, err := decode[SellerTerms](offerData)
	if err != nil || terms.Commission == nil {
		return map[string]any{}
	}
	price, err := accountpricing.BuyerPrice(terms.Commission.BaseMinor)
	if err != nil {
		return map[string]any{}
	}
	// Only commercial defaults are supplied. Staff must enter inspected account
	// facts, confirm real delivery capacity and review images before publication.
	product := Product{Commission: &price, Currency: "USD", AmountMinor: price.TotalMinor, DisputeHours: 168,
		SaleTerms: agreementDefaults.Buyer.SaleTerms, TransferRequirements: agreementDefaults.Buyer.TransferRequirements,
		DisputeTerms: agreementDefaults.Buyer.DisputeTerms, AcknowledgementTerms: agreementDefaults.Buyer.AcknowledgementTerms}
	result, err := document(product)
	if err != nil {
		return map[string]any{}
	}
	return result
}
