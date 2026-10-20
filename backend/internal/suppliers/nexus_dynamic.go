package suppliers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// nexusDynamic includes the explicitly documented SuperPass catalog omitted by
// ordinary category lists. An incomplete read fails the whole replacement import.
func (c *Client) nexusDynamic(ctx context.Context, catalog Catalog) (Catalog, error) {
	hasCategory := false
	for _, category := range catalog.Categories {
		if category.ID == "roblox:passes" {
			hasCategory = true
		}
	}
	if !hasCategory {
		return catalog, nil
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()
	raw, err := c.request(ctx, http.MethodGet, "/api/v1/utils/roblox/super-games", nil, maxResponse)
	if err != nil {
		return Catalog{}, err
	}
	var games []struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		English string `json:"name_en"`
		Enabled bool   `json:"superpass_enabled"`
	}
	if decode(raw, &games) != nil || len(games) > 5000 {
		return Catalog{}, ErrEvidence
	}
	known := map[string]bool{}
	for _, p := range catalog.Products {
		known[p.ID] = true
	}
	seenGames := map[string]bool{}
	for _, game := range games {
		if !sourceID(game.ID) || seenGames[game.ID] {
			return Catalog{}, ErrEvidence
		}
		seenGames[game.ID] = true
		if !game.Enabled {
			continue
		}
		raw, err = c.request(ctx, http.MethodGet, "/api/v1/utils/roblox/super-games/"+url.PathEscape(game.ID)+"/passes", nil, maxResponse)
		if err != nil {
			return Catalog{}, err
		}
		var passes []struct {
			ID string `json:"id"`
		}
		if decode(raw, &passes) != nil || len(passes) > 10000 {
			return Catalog{}, ErrEvidence
		}
		for _, pass := range passes {
			if !sourceID(pass.ID) || !strings.HasPrefix(pass.ID, "roblox:passes:") {
				return Catalog{}, ErrEvidence
			}
			if known[pass.ID] {
				continue
			}
			known[pass.ID] = true
			if len(catalog.Products) >= 100000 {
				return Catalog{}, ErrEvidence
			}
			// The detail endpoint supplies full requirements/eligibility, rather than
			// inferring compatibility from the short dynamic listing.
			detail, e := c.request(ctx, http.MethodGet, "/api/v1/products/"+url.PathEscape(pass.ID)+"?include=metadata", nil, maxResponse)
			if e != nil {
				return Catalog{}, e
			}
			envelope, e := json.Marshal(map[string]any{"games": []Game{{ID: "roblox", Name: "Roblox"}}, "categories": []Category{{ID: "roblox:passes", Name: "SuperPasses"}}, "products": []json.RawMessage{detail}})
			if e != nil {
				return Catalog{}, ErrEvidence
			}
			page, e := normalizeNexus(c.connection, envelope)
			if e != nil || len(page.Products) != 1 || page.Products[0].ID != pass.ID {
				return Catalog{}, ErrEvidence
			}
			product := page.Products[0]
			name := game.English
			if name == "" {
				name = game.Name
			}
			if plain(name, 1, 200) && len(name)+len(product.Name) < 495 {
				product.Name = name + " · " + product.Name
			}
			catalog.Products = append(catalog.Products, product)
		}
	}
	return catalog, nil
}
