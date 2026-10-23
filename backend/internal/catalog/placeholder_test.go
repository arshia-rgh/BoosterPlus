package catalog

import "testing"

func placeholderConfiguration() Configuration {
	c := Configuration{SchemaVersion: 1, Name: "Future game", Reviewed: true}
	c.Discovery = &Discovery{}
	for _, service := range []string{"boost", "accounts", "shop", "news"} {
		c.Discovery.Capabilities = append(c.Discovery.Capabilities, CapabilityPolicy{Service: service, State: "off"})
	}
	return c
}

func TestReviewedPlaceholderPublication(t *testing.T) {
	t.Parallel()
	c := placeholderConfiguration()
	if issues := ValidateConfiguration(c, true); len(issues) != 0 {
		t.Fatal(issues)
	}
	for _, service := range []string{"boost", "accounts", "shop", "news"} {
		if Available(c, false, service) || Available(c, true, service) {
			t.Fatalf("placeholder activated %s", service)
		}
	}
}

func TestPlaceholderPublicationFailsClosed(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name   string
		change func(*Configuration)
	}{
		{"unreviewed", func(c *Configuration) { c.Reviewed = false }},
		{"legacy absence", func(c *Configuration) { c.Discovery = nil }},
		{"missing policies", func(c *Configuration) { c.Discovery.Capabilities = nil }},
		{"missing service", func(c *Configuration) { c.Discovery.Capabilities = c.Discovery.Capabilities[:3] }},
		{"duplicate service", func(c *Configuration) { c.Discovery.Capabilities[1].Service = "boost" }},
		{"unknown service", func(c *Configuration) { c.Discovery.Capabilities[1].Service = "wallet" }},
		{"invalid state", func(c *Configuration) { c.Discovery.Capabilities[1].State = "disabled" }},
		{"paused only", func(c *Configuration) {
			c.Discovery.Capabilities[1].State = "paused"
			c.Discovery.Capabilities[1].Reason = "Not available"
		}},
		{"boost enabled without form", func(c *Configuration) { c.Discovery.Capabilities[0].State = "active" }},
		{"accounts enabled without configuration", func(c *Configuration) { c.Discovery.Capabilities[1].State = "active" }},
		{"shop enabled without configuration", func(c *Configuration) { c.Discovery.Capabilities[2].State = "active" }},
		{"news enabled without configuration", func(c *Configuration) { c.Discovery.Capabilities[3].State = "active" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			c := placeholderConfiguration()
			tc.change(&c)
			if len(ValidateConfiguration(c, true)) == 0 {
				t.Fatal("invalid placeholder published")
			}
		})
	}
}
