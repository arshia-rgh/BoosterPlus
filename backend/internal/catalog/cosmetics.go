package catalog

import (
	"bytes"
	"encoding/json"
	"fmt"
	"slices"
	"strconv"
	"strings"
)

// CosmeticCollection is ordinary seller intake, private until explicitly reviewed.
type CosmeticCollection struct {
	Groups []CosmeticGroup `json:"groups"`
}

// CosmeticGroup identifies a category and the individual cosmetics/associated heroes.
type CosmeticGroup struct {
	Category string   `json:"category"`
	Count    string   `json:"count"`
	Names    []string `json:"names"`
}

func validateCosmetics(field Field, raw json.RawMessage, refs map[string]Reference, required bool) []Issue {
	issues := []Issue{}
	add := func(path, message string) { issues = append(issues, Issue{Path: field.Key + path, Message: message}) }
	var value CosmeticCollection
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&value); err != nil || value.Groups == nil || len(value.Groups) > 20 {
		add("", "Use up to 20 skin groups with category, quantity and names.")
		return issues
	}
	if required && len(value.Groups) == 0 {
		add("", "Add at least one skin group.")
	}
	categories := map[string]bool{}
	total := 0
	for i, g := range value.Groups {
		path := fmt.Sprintf(".groups.%d", i)
		if categories[g.Category] || !slices.ContainsFunc(optionsFor(field, refs), func(o Option) bool { return o.Key == g.Category }) {
			add(path+".category", "Choose a different available skin category for each group.")
		}
		categories[g.Category] = true
		count, err := strconv.Atoi(g.Count)
		if err != nil || count < 1 || count > 100 || strconv.Itoa(count) != g.Count {
			add(path+".count", "Enter a whole quantity from 1 to 100.")
		} else if count != len(g.Names) {
			add(path+".count", "Quantity must match the number of named skins or associated heroes.")
		}
		names := map[string]bool{}
		if len(g.Names) == 0 || len(g.Names) > 100 {
			add(path+".names", "Name each skin or its associated hero; use up to 100 entries per category.")
		}
		for _, name := range g.Names {
			if !validText(name, 1, 120) || name != strings.TrimSpace(name) || names[name] {
				add(path+".names", "Use unique names of 1–120 characters without surrounding spaces.")
				break
			}
			names[name] = true
		}
		total += len(g.Names)
	}
	if total > 200 {
		add("", "Keep the collection within 200 named items across all groups.")
	}
	return issues
}
