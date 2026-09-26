package publicmetrics

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestUnconfiguredMetricsNeverInventEvidence(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 9, 26, 12, 0, 0, 0, time.FixedZone("test", 3600))
	for _, policy := range []*Policy{nil, {}, {WindowDays: 30, MinimumSample: 1, MaximumAgeSecs: 300}} {
		values := Read(t.Context(), nil, policy, "", now)
		if len(values) != 3 || values[0].State != "unconfigured" || values[2].State != "unavailable" {
			t.Fatal(values)
		}
		for _, value := range values {
			if value.Value != nil || value.SampleSize != nil || value.PeriodEnd.Location() != time.UTC {
				t.Fatal("invented evidence or non-UTC timestamp", value)
			}
		}
		raw, err := json.Marshal(values)
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(string(raw), `"value":`) || strings.Contains(string(raw), `"sample_size":`) {
			t.Fatal("suppressed fields serialized")
		}
	}
}

func TestMetricPolicyBounds(t *testing.T) {
	t.Parallel()
	for _, p := range []Policy{{1, 5, 30}, {366, 1000000, 86400}} {
		if !p.Valid() {
			t.Fatal("valid boundary rejected", p)
		}
	}
	for _, p := range []Policy{{0, 5, 30}, {367, 5, 30}, {30, 4, 30}, {30, 1000001, 30}, {30, 5, 29}, {30, 5, 86401}} {
		if p.Valid() {
			t.Fatal("unsafe policy accepted", p)
		}
	}
}
