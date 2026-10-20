package suppliers

// ListingBinding is private reviewed source evidence. It is never an HTTP view.
// Copy it on publication so later imports/pricing changes cannot rewrite terms.
type ListingBinding struct {
	Connection    Connection `json:"connection"`
	MerchantID    string     `json:"merchant_id"`
	ImportID      string     `json:"import_id"`
	Product       Product    `json:"product"`
	OfferID       string     `json:"offer_id"`
	MarkupBPS     int        `json:"markup_bps"`
	OverrideMinor string     `json:"override_minor"`
}
