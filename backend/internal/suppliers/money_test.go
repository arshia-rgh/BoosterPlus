package suppliers

import (
	"encoding/json"
	"testing"
)

func TestPriceUsesSupplierPrecisionAndOneFinalRounding(t *testing.T) {
	for _, tc := range []struct {
		cost, quantity Decimal
		bps            int
		override, want string
	}{
		{"0.515", "1", 1500, "", "59"}, {"10", "1", 1500, "", "1150"}, {"1.005", "1", 0, "", "101"},
		{"0.1", "3", 1500, "", "35"}, {"0.01", "1", 0, "", "1"}, {"999", "3", 1500, "101", "303"},
		{"2.5", "1.2", 1500, "", "345"}, {"1e-2", "3", 1500, "", "3"},
	} {
		t.Run(string(tc.cost)+"_"+string(tc.quantity)+"_"+tc.override, func(t *testing.T) {
			got, err := Price(tc.cost, tc.quantity, tc.bps, tc.override)
			if err != nil || got != tc.want {
				t.Fatalf("got %q, %v; want %s", got, err, tc.want)
			}
		})
	}
}
func TestPriceRejectsMalformedAndOutOfRangeValues(t *testing.T) {
	for _, value := range []Decimal{"", "-1", "+1", "01", "NaN", "Infinity", "1/2", "1e99", "1e-99", "1.1234567890123456789", "1000000000000", "1\n"} {
		if _, err := value.Rational(); err == nil {
			t.Fatalf("accepted %q", value)
		}
	}
	for _, tc := range []struct {
		cost, quantity Decimal
		bps            int
		override       string
	}{
		{"0", "1", 1500, ""}, {"1", "0", 1500, ""}, {"1", "1", -1, ""}, {"1", "1", 100001, ""}, {"1", "1", 1500, "0"}, {"1", "1", 1500, "1.5"}, {"999999999999", "999999999999", 0, ""},
	} {
		if _, err := Price(tc.cost, tc.quantity, tc.bps, tc.override); err == nil {
			t.Fatal("accepted invalid price")
		}
	}
}
func TestDecimalJSONPreservesExactValues(t *testing.T) {
	for _, raw := range []string{`0.515`, `"0.515"`, `1e-8`, `0.123456789123456789`} {
		var d Decimal
		if err := json.Unmarshal([]byte(raw), &d); err != nil {
			t.Fatal(err)
		}
		out, err := json.Marshal(d)
		if err != nil || !json.Valid(out) {
			t.Fatalf("invalid round trip %v", err)
		}
		var stored string
		if json.Unmarshal(out, &stored) != nil || stored != string(d) {
			t.Fatal("database JSON must contain exact strings")
		}
	}
	for _, raw := range []string{`null`, `true`, `{}`, `"NaN"`} {
		var d Decimal
		if json.Unmarshal([]byte(raw), &d) == nil {
			t.Fatal("accepted invalid decimal")
		}
	}
}
