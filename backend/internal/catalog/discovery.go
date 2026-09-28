package catalog

import (
	"slices"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/publicmetrics"
)

// Discovery is public presentation and availability attached to one immutable
// catalog release. Absence preserves catalogs published before this contract.
type Discovery struct {
	Capabilities []CapabilityPolicy    `json:"capabilities"`
	Metrics      *publicmetrics.Policy `json:"metrics,omitempty"`
	Promotions   []Promotion           `json:"promotions,omitempty"`
}

// CapabilityPolicy controls new service discovery and transactions. Pausing a
// service never removes a customer's purchased contract or fulfillment record.
type CapabilityPolicy struct {
	Service     string `json:"service"`
	State       string `json:"state"`
	Description string `json:"description"`
	Reason      string `json:"reason"`
}

// Capabilities resolves legacy catalogs and whole-game availability uniformly.
// Unknown and unimplemented services always fail closed, including direct URLs.
func Capabilities(c Configuration, paused bool) []CapabilityPolicy {
	result := make([]CapabilityPolicy, 0, 4)
	for _, name := range []string{"boost", "accounts", "shop", "news"} {
		policy := CapabilityPolicy{Service: name, State: "off"}
		if c.Discovery == nil {
			if name == "boost" && len(c.Services) > 0 || name == "accounts" {
				policy.State = "active"
			}
		} else {
			for _, candidate := range c.Discovery.Capabilities {
				if candidate.Service == name {
					policy = candidate
					break
				}
			}
		}
		if !slices.Contains([]string{"off", "active", "paused"}, policy.State) {
			policy.State = "off"
		}
		if policy.State == "active" && !implementedCapability(name) {
			policy.State = "off"
		}
		if paused && policy.State != "off" {
			policy.State = "paused"
			policy.Reason = "Services for this game are temporarily unavailable."
		}
		result = append(result, policy)
	}
	return result
}

// Available is the same release policy used by public discovery and purchase
// transactions. Call with the current release inside the authorization fence.
func Available(c Configuration, paused bool, service string) bool {
	for _, policy := range Capabilities(c, paused) {
		if policy.Service == service {
			return policy.State == "active"
		}
	}
	return false
}

func implementedCapability(service string) bool {
	// News stays closed until DI12 supplies its complete server and UI paths.
	return service == "boost" || service == "accounts" || service == "shop"
}

func validateDiscovery(c Configuration, publish bool, add func(string, string)) {
	if c.Discovery == nil {
		return
	}
	policies := c.Discovery.Capabilities
	if len(policies) != 4 {
		add("discovery.capabilities", "Declare Boost, Accounts, Shop and News once each.")
	}
	seen := map[string]bool{}
	for _, policy := range policies {
		if !slices.Contains([]string{"boost", "accounts", "shop", "news"}, policy.Service) || seen[policy.Service] {
			add("discovery.capabilities", "Use each supported service once.")
			continue
		}
		seen[policy.Service] = true
		path := "discovery.capabilities." + policy.Service
		if !slices.Contains([]string{"off", "active", "paused"}, policy.State) || !validText(policy.Description, 0, 600) || !validText(policy.Reason, 0, 300) {
			add(path, "Choose off, active or paused with bounded plain-text descriptions.")
		}
		if policy.State == "paused" && !validText(policy.Reason, 1, 300) {
			add(path+".reason", "Explain why this service is temporarily unavailable.")
		}
		if publish && policy.State == "active" && !implementedCapability(policy.Service) {
			add(path+".state", "This service cannot be activated before its implementation is available.")
		}
		if publish && policy.Service == "boost" && policy.State == "active" && len(c.Services) == 0 {
			add(path+".state", "Configure at least one boosting service before activation.")
		}
	}
	if metrics := c.Discovery.Metrics; metrics != nil {
		if !metrics.Valid() {
			add("discovery.metrics", "Set a 1–366 day period, a minimum sample of 5–1,000,000 and freshness of 30–86,400 seconds.")
		}
	}
}
