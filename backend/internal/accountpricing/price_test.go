package accountpricing

import (
	"testing"
	"time"
)

func TestIndependentCommissions(t *testing.T) {
	t.Parallel()
	for _, tc := range []struct{ base, buyerFee, total, sellerFee, net string }{
		{"10000", "500", "10500", "1000", "9000"},
		{"4999", "250", "5249", "500", "4499"},
		{"10", "1", "11", "1", "9"},
		{"5", "0", "5", "1", "4"},
		{"1", "0", "1", "0", "1"},
	} {
		t.Run(tc.base, func(t *testing.T) {
			buyer, err := BuyerPrice(tc.base)
			if err != nil || buyer.FeeMinor != tc.buyerFee || buyer.TotalMinor != tc.total || !buyer.Valid("USD", tc.total) {
				t.Fatalf("buyer: %+v, %v", buyer, err)
			}
			seller, err := SellerPrice(tc.base, "1.001", "synthetic quote", time.Unix(100, 0))
			if err != nil || seller.FeeMinor != tc.sellerFee || seller.NetMinor != tc.net || !seller.Valid(seller.NetAmount) {
				t.Fatalf("seller: %+v, %v", seller, err)
			}
		})
	}
}

func TestQuotedNetAndTampering(t *testing.T) {
	t.Parallel()
	s, err := SellerPrice("4999", "1.000000001", "synthetic quotation", time.Unix(100, 0))
	if err != nil || s.NetAmount != "44.990001" {
		t.Fatalf("round upward at crypto precision: %+v %v", s, err)
	}
	if s.Valid("44.99") {
		t.Fatal("accepted an amount outside the fixed quote")
	}
	s.FeeMinor = "499"
	if s.Valid(s.NetAmount) {
		t.Fatal("accepted a modified seller fee")
	}
	b, err := BuyerPrice("4999")
	if err != nil {
		t.Fatal(err)
	}
	b.TotalMinor = "4999"
	if b.Valid("USD", "4999") || b.Valid("EUR", "5249") {
		t.Fatal("accepted a missing fee or unsupported price currency")
	}
}

func TestBoundedInputs(t *testing.T) {
	t.Parallel()
	for _, value := range []string{"", "0", "01", "-1", "1.1", "1e3", "999999999999", "1000000000000"} {
		if _, err := BuyerPrice(value); err == nil {
			t.Errorf("accepted invalid/overflowing price %q", value)
		}
	}
	for _, rate := range []string{"", "0", "-1", "1e999", "NaN", "1/2", "1000000000000"} {
		if _, err := SellerPrice("100", rate, "synthetic", time.Unix(100, 0)); err == nil {
			t.Errorf("accepted invalid rate %q", rate)
		}
	}
}
