package catalog

import (
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/publicmetrics"
)

func discoveryFixture() Configuration {
	c := fixture()
	c.Discovery = &Discovery{Capabilities: Capabilities(c, false)}
	return c
}

func TestCapabilityCompatibilityAndPauses(t *testing.T) {
	t.Parallel()
	c := fixture()
	if !Available(c, false, "accounts") || !Available(c, false, "boost") {
		t.Fatal("legacy published checkout support must survive without intake")
	}
	for _, key := range []string{"shop", "news", "unknown", ""} {
		if Available(c, false, key) {
			t.Fatalf("unimplemented capability %q became available", key)
		}
	}
	c = discoveryFixture()
	for _, key := range []string{"boost", "accounts"} {
		if Available(c, true, key) {
			t.Fatalf("whole-game pause did not stop %s", key)
		}
	}
	c.Discovery.Capabilities[0].State = "paused"
	c.Discovery.Capabilities[0].Reason = "Scheduling is temporarily unavailable."
	if Available(c, false, "boost") || !Available(c, false, "accounts") {
		t.Fatal("a boost pause must not remove the independent accounts service")
	}
	c.Discovery.Capabilities[1].State = "off"
	if Available(c, false, "accounts") {
		t.Fatal("explicit off did not override legacy support")
	}
}

func TestDiscoveryPublicationValidation(t *testing.T) {
	t.Parallel()
	c := discoveryFixture()
	c.Discovery.Metrics = &publicmetrics.Policy{WindowDays: 30, MinimumSample: 20, MaximumAgeSecs: 300}
	if issues := ValidateConfiguration(c, true); len(issues) > 0 {
		t.Fatal(issues)
	}
	cases := []struct {
		name   string
		change func(*Configuration)
	}{
		{"missing capability", func(c *Configuration) { c.Discovery.Capabilities = c.Discovery.Capabilities[:3] }},
		{"duplicate capability", func(c *Configuration) { c.Discovery.Capabilities[1].Service = "boost" }},
		{"unknown service", func(c *Configuration) { c.Discovery.Capabilities[0].Service = "wallet" }},
		{"unknown state", func(c *Configuration) { c.Discovery.Capabilities[0].State = "success" }},
		{"pause without reason", func(c *Configuration) { c.Discovery.Capabilities[0].State = "paused" }},
		{"unimplemented shop", func(c *Configuration) { c.Discovery.Capabilities[2].State = "active" }},
		{"unimplemented news", func(c *Configuration) { c.Discovery.Capabilities[3].State = "active" }},
		{"unsafe small sample", func(c *Configuration) { c.Discovery.Metrics.MinimumSample = 1 }},
		{"unbounded period", func(c *Configuration) { c.Discovery.Metrics.WindowDays = 367 }},
		{"invalid freshness", func(c *Configuration) { c.Discovery.Metrics.MaximumAgeSecs = 0 }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			next := clone(c)
			tc.change(&next)
			if len(ValidateConfiguration(next, true)) == 0 {
				t.Fatal("invalid publication accepted")
			}
		})
	}
}
