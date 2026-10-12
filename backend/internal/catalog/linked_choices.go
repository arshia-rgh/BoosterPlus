package catalog

import (
	"encoding/json"
	"slices"
)

func validateChoiceLinks(rule Rule, fields map[string]Field, refs map[string]Reference, path string, used map[string]bool, add func(string, string)) {
	parent, parentOK := fields[rule.From]
	child, childOK := fields[rule.To]
	if !parentOK || !childOK || rule.From == rule.To || used[rule.From] || used[rule.To] ||
		!slices.Contains([]string{"select", "radio"}, parent.Type) ||
		!slices.Contains([]string{"select", "radio", "multiselect"}, child.Type) ||
		parent.Stage != child.Stage || rule.When != nil || rule.FromUnits != "" || rule.ToUnits != "" ||
		!slices.Contains([]string{"single_parent", "shared_parent"}, rule.LinkMode) {
		add(path, "Link two distinct choice fields collected at the same stage. A field may belong to one relationship only; choose single or shared parent mode without a condition or unit fields.")
		return
	}
	used[rule.From], used[rule.To] = true, true
	if rule.LinkMode == "shared_parent" && (parent.Required || parent.RequiredWhen != nil) {
		add(path, "A shared-role parent must be optional so heroes without a common role remain selectable.")
	}
	parents, children := optionsFor(parent, refs), optionsFor(child, refs)
	seen, membership := map[string]bool{}, map[string]int{}
	for _, link := range rule.Links {
		if seen[link.Parent] || !slices.ContainsFunc(parents, func(o Option) bool { return o.Key == link.Parent }) || len(link.Children) == 0 {
			add(path+".links", "Each mapped parent must be an available unique option with at least one child.")
		}
		seen[link.Parent] = true
		row := map[string]bool{}
		for _, key := range link.Children {
			if row[key] || !slices.ContainsFunc(children, func(o Option) bool { return o.Key == key }) {
				add(path+".links", "Map each child only once per parent, using available options.")
			}
			row[key] = true
			membership[key]++
		}
	}
	for _, child := range children {
		if membership[child.Key] == 0 || rule.LinkMode == "single_parent" && membership[child.Key] != 1 {
			add(path+".links", "Map every child to a parent. Single-parent mode requires exactly one parent per child.")
			break
		}
	}
}

func linkedValues(raw json.RawMessage) []string {
	var one string
	if json.Unmarshal(raw, &one) == nil && one != "" {
		return []string{one}
	}
	var many []string
	if json.Unmarshal(raw, &many) == nil {
		return many
	}
	return nil
}

func commonParents(rule Rule, children []string) []string {
	var result []string
	for _, link := range rule.Links {
		if len(children) != 0 && !slices.ContainsFunc(children, func(child string) bool { return !slices.Contains(link.Children, child) }) {
			result = append(result, link.Parent)
		}
	}
	return result
}

func invalidLinkedChoices(rule Rule, answers Answers) bool {
	children, parents := linkedValues(answers[rule.To]), linkedValues(answers[rule.From])
	if len(children) == 0 {
		return false
	}
	allowed := commonParents(rule, children)
	if len(parents) == 1 {
		return !slices.Contains(allowed, parents[0])
	}
	// The interface resolves an unambiguous parent automatically. A missing
	// optional role is allowed only when multiple/no shared roles exist.
	return len(allowed) == 1 || rule.LinkMode == "single_parent"
}
