package catalog

import (
	"errors"
	"fmt"
	"slices"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/scheduling"
)

// DeliveryPolicy pins operational forecasts to the purchased catalog release.
// Rules use first match within the explicit fulfillment mode; no match requires review.
type DeliveryPolicy struct {
	Calendar scheduling.Calendar `json:"calendar"`
	Rules    []DeliveryRule      `json:"rules"`
}

// DeliveryRule declares real working minutes, never a commercial delivery promise.
// WorkloadMinutes adds queue time per other active paid assignment, capped at 100.
type DeliveryRule struct {
	Key             string     `json:"key"`
	Mode            string     `json:"mode"`
	When            *Condition `json:"when,omitempty"`
	MinMinutes      int        `json:"min_minutes"`
	MaxMinutes      int        `json:"max_minutes"`
	WaitMinMinutes  int        `json:"wait_min_minutes"`
	WaitMaxMinutes  int        `json:"wait_max_minutes"`
	WorkloadMinutes int        `json:"workload_minutes"`
}

// ErrDeliveryPolicy prevents inventing durations for undeclared or unsupported work.
var ErrDeliveryPolicy = errors.New("delivery rule unavailable")

func validDeliveryRule(rule DeliveryRule) bool {
	return keyPattern.MatchString(rule.Key) && slices.Contains([]string{"account", "together"}, rule.Mode) &&
		rule.MinMinutes >= 1 && rule.MaxMinutes >= rule.MinMinutes && rule.MaxMinutes <= 43200 &&
		rule.WaitMinMinutes >= 0 && rule.WaitMaxMinutes >= rule.WaitMinMinutes && rule.WaitMaxMinutes <= 43200 &&
		rule.WorkloadMinutes >= 0 && rule.WorkloadMinutes <= 720 && validConditionShape(rule.When)
}

func validateDelivery(service ServiceDefinition, refs map[string]Reference, path string, add func(string, string)) {
	p := service.Delivery
	if p == nil {
		return
	}
	if service.Fulfillment == nil {
		add(path, "Configure the explicit fulfillment mode first.")
	}
	if scheduling.ValidateCalendar(p.Calendar) != nil {
		add(path+".calendar", "Declare an IANA zone, 1–28 nonoverlapping weekly windows and at most 180 unique closure dates. Only closing time may be 24:00.")
	}
	if len(p.Rules) < 1 || len(p.Rules) > 40 {
		add(path+".rules", "Declare 1–40 ordered delivery rules.")
		return
	}
	seen, fallback := map[string]bool{}, map[string]bool{}
	for i, rule := range p.Rules {
		rp := fmt.Sprintf("%s.rules.%d", path, i)
		if !validDeliveryRule(rule) || seen[rule.Key] {
			add(rp, "Use a unique key, explicit mode, 1–43,200 work minutes, 0–43,200 queue minutes and 0–720 queue minutes per other paid assignment; ranges must be ordered.")
		}
		seen[rule.Key] = true
		if fallback[rule.Mode] {
			add(rp, "Place an unconditional rule last for its mode; later rules cannot match.")
		}
		fallback[rule.Mode] = fallback[rule.Mode] || rule.When == nil
		if service.Fulfillment != nil && service.Fulfillment.Mode != "selection" && service.Fulfillment.Mode != rule.Mode {
			add(rp, "Rule mode must be supported by this service.")
		}
		validateCondition(rule.When, fieldMap(service.Fields), refs, rp+".when", 1, add)
	}
}

// Delivery selects a bounded rule using only the immutable ordinary purchased answers.
func Delivery(service ServiceDefinition, answers Answers, mode string) (DeliveryRule, error) {
	p := service.Delivery
	if p == nil || len(p.Rules) > 40 || scheduling.ValidateCalendar(p.Calendar) != nil {
		return DeliveryRule{}, ErrDeliveryPolicy
	}
	for _, rule := range p.Rules {
		if !validDeliveryRule(rule) {
			return DeliveryRule{}, ErrDeliveryPolicy
		}
		if rule.Mode == mode && matches(rule.When, answers, fieldMap(service.Fields)) {
			return rule, nil
		}
	}
	return DeliveryRule{}, ErrDeliveryPolicy
}
