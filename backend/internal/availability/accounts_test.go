package availability

import "testing"

func TestAccountCriteriaRejectsInvalidAndUnboundedFilters(t *testing.T) {
	for _, c := range []AccountCriteria{{MaxAmount: -1}, {MaxAmount: 100}, {Currency: "usd"}, {Currency: "USD", MaxAmount: 1000000000000}, {Region: "private\x00text"}, {Rank: string([]byte{255})}, {ListingID: "not-an-id"}} {
		if c.valid() {
			t.Fatal("invalid account criteria accepted")
		}
	}
	for _, c := range []AccountCriteria{{}, {Currency: "USD"}, {Currency: "USD", MaxAmount: 100}, {ListingID: "00000000-0000-4000-8000-000000000001"}} {
		if !c.valid() {
			t.Fatal("valid account criteria rejected")
		}
	}
}
