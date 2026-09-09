package catalog

import (
	"encoding/json"
	"math/big"
	"slices"
)

func conditionShape(c *Condition, depth int, nodes *int) bool {
	if c == nil {
		return true
	}
	*nodes++
	if depth > 4 || *nodes > 32 || len(c.Values) > 30 {
		return false
	}
	for _, value := range c.Values {
		if !validText(value, 1, 4000) {
			return false
		}
	}
	if c.Op == "all" || c.Op == "any" {
		if c.Field != "" || len(c.Values) != 0 || len(c.Children) < 1 || len(c.Children) > 8 {
			return false
		}
		for i := range c.Children {
			if !conditionShape(&c.Children[i], depth+1, nodes) {
				return false
			}
		}
		return true
	}
	return slices.Contains([]string{"eq", "in", "gt", "gte", "lt", "lte"}, c.Op) && keyPattern.MatchString(c.Field) && len(c.Children) == 0 && len(c.Values) > 0 && (c.Op == "in" || len(c.Values) == 1)
}
func validConditionShape(c *Condition) bool { nodes := 0; return conditionShape(c, 0, &nodes) }
func conditionFields(c *Condition) []string {
	if c == nil || !validConditionShape(c) {
		return nil
	}
	if c.Field != "" {
		return []string{c.Field}
	}
	result := []string{}
	for i := range c.Children {
		result = append(result, conditionFields(&c.Children[i])...)
	}
	return result
}

func validateCondition(c *Condition, fields map[string]Field, refs map[string]Reference, path string, maxStage int, add func(string, string)) {
	if c == nil {
		return
	}
	if !validConditionShape(c) {
		add(path, "Conditions require bounded typed leaves or all/any groups (depth 4, 32 nodes). ")
		return
	}
	valid := true
	var visit func(*Condition)
	visit = func(node *Condition) {
		if node.Field == "" {
			for i := range node.Children {
				visit(&node.Children[i])
			}
			return
		}
		field, ok := fields[node.Field]
		if !ok || stage(field.Stage) > maxStage || field.Type == "attachment" {
			add(path, "Condition references an unknown, later-stage or unsupported field.")
			valid = false
			return
		}
		numeric := field.Type == "integer" || field.Type == "decimal"
		if node.Op != "eq" && node.Op != "in" && !numeric {
			add(path, "Ordered comparisons require numeric fields.")
			valid = false
		}
		if field.Type == "multiselect" && node.Op != "in" {
			add(path, "Multiselect conditions use membership (in).")
			valid = false
		}
		for _, value := range node.Values {
			var raw json.RawMessage
			if field.Type == "boolean" {
				raw = json.RawMessage(value)
			} else {
				encoded, err := json.Marshal(value)
				if err != nil {
					valid = false
					continue
				}
				raw = encoded
			}
			switch {
			case field.Type == "multiselect":
				if !slices.ContainsFunc(optionsFor(field, refs), func(o Option) bool { return o.Key == value }) {
					valid = false
					add(path, "Membership references an unknown option.")
				}
			case numeric && node.Op != "eq" && node.Op != "in":
				if _, parsed := decimal(value); !parsed {
					valid = false
					add(path, "Use bounded exact decimal comparison values.")
				}
			case validateValue(field, raw, refs) != "":
				valid = false
				add(path, "Condition value is incompatible with its referenced field.")
			}
		}
	}
	visit(c)
	if valid && !possible(c, fields, refs) {
		add(path, "Condition is impossible or exceeds the 64-branch logical limit.")
	}
}

// DNF bounds make contradictory all-groups detectable without executing arbitrary
// expressions or enumerating an unbounded Cartesian product of field values.
func alternatives(c *Condition) ([][]Condition, bool) {
	if c.Field != "" {
		return [][]Condition{{*c}}, true
	}
	result := [][]Condition{}
	if c.Op == "all" {
		result = [][]Condition{{}}
	}
	for i := range c.Children {
		child, ok := alternatives(&c.Children[i])
		if !ok {
			return nil, false
		}
		if c.Op == "any" {
			result = append(result, child...)
		} else {
			next := [][]Condition{}
			for _, left := range result {
				for _, right := range child {
					combined := append(slices.Clone(left), right...)
					next = append(next, combined)
					if len(next) > 64 {
						return nil, false
					}
				}
			}
			result = next
		}
		if len(result) > 64 {
			return nil, false
		}
	}
	return result, true
}
func possible(c *Condition, fields map[string]Field, refs map[string]Reference) bool {
	nodes := 0
	expanded, expandedOK := expandPresence(c, fields, map[string]bool{}, &nodes)
	if !expandedOK {
		return false
	}
	branches, ok := alternatives(expanded)
	if !ok {
		return false
	}
	for _, branch := range branches {
		good := true
		byField := map[string][]Condition{}
		for _, leaf := range branch {
			byField[leaf.Field] = append(byField[leaf.Field], leaf)
		}
		for key, leaves := range byField {
			if !possibleField(fields[key], leaves, refs) {
				good = false
				break
			}
		}
		if good {
			return true
		}
	}
	return false
}
func possibleField(field Field, leaves []Condition, refs map[string]Reference) bool {
	if field.Type == "multiselect" {
		// At most eight membership leaves per conjunction; enumerate option-set
		// representatives to prove bounds without the 2^300 full option powerset.
		sets := [][]string{{}}
		for _, leaf := range leaves {
			next := [][]string{}
			for _, set := range sets {
				if slices.ContainsFunc(set, func(value string) bool { return slices.Contains(leaf.Values, value) }) {
					next = append(next, set)
					continue
				}
				for _, value := range leaf.Values {
					if len(set) < field.MaxSelections {
						next = append(next, append(slices.Clone(set), value))
						if len(next) > 4096 {
							return false
						}
					}
				}
			}
			sets = next
		}
		return len(sets) > 0
	}
	candidates := []string{}
	numeric := field.Type == "integer" || field.Type == "decimal"
	if numeric {
		lower, minOK := decimal(field.Min)
		upper, maxOK := decimal(field.Max)
		stepValue, stepOK := decimal(field.Step)
		if !minOK || !maxOK || !stepOK || stepValue.Sign() <= 0 || lower.Cmp(upper) > 0 {
			return false
		}
		candidates = append(candidates, field.Min, field.Max)
		for _, leaf := range leaves {
			for _, value := range leaf.Values {
				bound, parsed := decimal(value)
				if !parsed {
					return false
				}
				// The nearest legal grid values on both sides cover every interval boundary.
				index := new(big.Rat).Quo(new(big.Rat).Sub(bound, lower), stepValue)
				floor := new(big.Int).Quo(index.Num(), index.Denom())
				for _, offset := range []int64{-1, 0, 1} {
					n := new(big.Int).Add(floor, big.NewInt(offset))
					v := new(big.Rat).Add(lower, new(big.Rat).Mul(new(big.Rat).SetInt(n), stepValue))
					candidates = append(candidates, v.FloatString(6))
				}
			}
		}
	} else {
		for _, option := range optionsFor(field, refs) {
			candidates = append(candidates, option.Key)
		}
		if field.Type == "boolean" {
			candidates = []string{"true", "false"}
		}
		for _, leaf := range leaves {
			candidates = append(candidates, leaf.Values...)
		}
	}
	for _, value := range candidates {
		raw, err := json.Marshal(value)
		if err != nil {
			continue
		}
		if field.Type == "boolean" {
			raw = json.RawMessage(value)
		}
		if validateValue(field, raw, refs) != "" {
			continue
		}
		all := true
		for i := range leaves {
			if !matches(&leaves[i], Answers{field.Key: raw}, map[string]Field{field.Key: field}) {
				all = false
				break
			}
		}
		if all {
			return true
		}
	}
	return false
}

func matches(c *Condition, answers Answers, fields map[string]Field) bool {
	if c == nil {
		return true
	}
	if !validConditionShape(c) {
		return false
	}
	if c.Op == "all" {
		for i := range c.Children {
			if !matches(&c.Children[i], answers, fields) {
				return false
			}
		}
		return true
	}
	if c.Op == "any" {
		for i := range c.Children {
			if matches(&c.Children[i], answers, fields) {
				return true
			}
		}
		return false
	}
	raw, exists := answers[c.Field]
	if !exists {
		return false
	}
	var scalar string
	if err := json.Unmarshal(raw, &scalar); err != nil {
		var values []string
		if listErr := json.Unmarshal(raw, &values); listErr == nil && c.Op == "in" {
			return slices.ContainsFunc(values, func(value string) bool { return slices.Contains(c.Values, value) })
		}
		var boolean bool
		if boolErr := json.Unmarshal(raw, &boolean); boolErr != nil {
			return false
		}
		if boolean {
			scalar = "true"
		} else {
			scalar = "false"
		}
	}
	if c.Op == "eq" || c.Op == "in" {
		if field := fields[c.Field]; field.Type == "integer" || field.Type == "decimal" {
			left, ok := decimal(scalar)
			if !ok {
				return false
			}
			return slices.ContainsFunc(c.Values, func(value string) bool { right, valid := decimal(value); return valid && left.Cmp(right) == 0 })
		}
		return slices.Contains(c.Values, scalar)
	}
	left, a := decimal(scalar)
	right, b := decimal(c.Values[0])
	if !a || !b {
		return false
	}
	cmp := left.Cmp(right)
	switch c.Op {
	case "gt":
		return cmp > 0
	case "gte":
		return cmp >= 0
	case "lt":
		return cmp < 0
	case "lte":
		return cmp <= 0
	default:
		return false
	}
}

// expandPresence includes the visibility prerequisites of referenced fields.
// A condition cannot match a value from a field that must simultaneously be hidden.
func expandPresence(c *Condition, fields map[string]Field, visiting map[string]bool, nodes *int) (*Condition, bool) {
	if c == nil {
		return nil, true
	}
	*nodes++
	if *nodes > 256 {
		return nil, false
	}
	if c.Field != "" {
		dependency := fields[c.Field].VisibleWhen
		if dependency == nil {
			return c, true
		}
		if visiting[c.Field] || !validConditionShape(dependency) {
			return nil, false
		}
		visiting[c.Field] = true
		expanded, ok := expandPresence(dependency, fields, visiting, nodes)
		delete(visiting, c.Field)
		if !ok {
			return nil, false
		}
		return &Condition{Op: "all", Children: []Condition{*c, *expanded}}, true
	}
	expanded := &Condition{Op: c.Op}
	for i := range c.Children {
		child, ok := expandPresence(&c.Children[i], fields, visiting, nodes)
		if !ok {
			return nil, false
		}
		expanded.Children = append(expanded.Children, *child)
	}
	return expanded, true
}
