//go:build integration

package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/santhosh-tekuri/jsonschema/v6"

	"github.com/arshia-rgh/BoosterPlus/backend/api"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/publicmetrics"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

func TestDiscoveryPublishedContentPolicyAndHTTPContract(t *testing.T) {
	f := orderDB(t)
	ctx := t.Context()
	now := time.Now().UTC()
	store := sitecontent.New(f.auth.client, f.auth.service, func() time.Time { return now })
	home := sitecontent.Home{Headline: "PLAYORA", Accent: "Choose your game", Description: "Reviewed multi-game services.", StartRank: "Original", EndRank: "Target", SceneDescription: "Original artwork", Artwork: "ascension", FAQs: []sitecontent.FAQ{}, Featured: []sitecontent.Featured{}, Metrics: &publicmetrics.Policy{WindowDays: 30, MinimumSample: 5, MaximumAgeSecs: 300}}
	for _, kind := range []string{"boost", "accounts", "shop", "payment", "news"} {
		home.Introductions = append(home.Introductions, sitecontent.Introduction{Kind: kind, Title: "Reviewed title", Description: "Reviewed section copy"})
	}
	draft, err := store.Save(ctx, f.admin, "home", sitecontent.Input{Data: discoveryDocument(t, home)})
	if err != nil {
		t.Fatal(err)
	}
	metrics, err := store.Metrics(ctx)
	if err != nil || metrics[0].State != "unconfigured" {
		t.Fatal("draft metrics leaked", err)
	}
	published, err := store.Save(ctx, f.admin, "home", sitecontent.Input{Version: draft.Version, Label: "discovery-home", Publish: true, Data: draft.Data})
	if err != nil {
		t.Fatal(err)
	}
	metrics, err = store.Metrics(ctx)
	if err != nil || metrics[0].State != "insufficient_sample" || metrics[0].Value != nil {
		t.Fatal("published policy missing", err)
	}
	if _, err = store.Save(ctx, f.admin, "home", sitecontent.Input{Version: draft.Version, Label: "stale-home", Publish: true, Data: draft.Data}); err == nil {
		t.Fatal("stale publication accepted")
	}
	current, err := store.Public(ctx, "home")
	if err != nil || current.ReleaseID != published.ReleaseID {
		t.Fatal("current publication changed", err)
	}
	mux := http.NewServeMux()
	f.auth.service.Register(mux)
	store.Register(mux)
	f.catalog.Register(mux)
	var document any
	if err = json.Unmarshal(api.Contract, &document); err != nil {
		t.Fatal(err)
	}
	compiler := jsonschema.NewCompiler()
	if err = compiler.AddResource("contract.json", document); err != nil {
		t.Fatal(err)
	}
	for path, name := range map[string]string{"/api/v1/site/metrics": "PublicMetrics", "/api/v1/catalog/games/" + f.game.Slug + "/discovery": "CatalogDiscoveryView"} {
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, httptest.NewRequestWithContext(ctx, http.MethodGet, path, nil))
		if w.Code != http.StatusOK || w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("public projection HTTP", path, w.Code)
		}
		var body any
		if err = json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		schema, e := compiler.Compile("contract.json#/components/schemas/" + name)
		if e != nil {
			t.Fatal(e)
		}
		if e = schema.Validate(body); e != nil {
			t.Fatal(e)
		}
	}
	owner := privacyOwner(t, f)
	legal := map[string]any{"text": "Complete approved synthetic terms for this isolated fixture.", "sections": []sitecontent.PolicySection{{Kind: "privacy", Title: "Privacy", Text: "Original approved synthetic privacy section."}}}
	first, err := store.Save(ctx, owner, "legal", sitecontent.Input{Data: legal, Label: "sections-v1", Publish: true})
	if err != nil {
		t.Fatal(err)
	}
	legal["sections"] = []sitecontent.PolicySection{{Kind: "privacy", Title: "Privacy", Text: "Revised approved synthetic privacy section."}}
	if _, err = store.Save(ctx, owner, "legal", sitecontent.Input{Version: first.Version, Data: legal, Label: "sections-v2", Publish: true}); err != nil {
		t.Fatal(err)
	}
	old, err := store.Version(ctx, "legal", first.Label)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(old.Data)
	if err != nil {
		t.Fatal(err)
	}
	var oldLegal sitecontent.Legal
	if err = json.Unmarshal(raw, &oldLegal); err != nil {
		t.Fatal(err)
	}
	if oldLegal.Sections[0].Text != "Original approved synthetic privacy section." {
		t.Fatal("historical policy rewritten")
	}
}

func discoveryDocument(t *testing.T, value any) map[string]any {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	var data map[string]any
	if err = json.Unmarshal(raw, &data); err != nil {
		t.Fatal(err)
	}
	return data
}
