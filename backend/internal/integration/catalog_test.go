//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/game"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func catalogConfig() catalog.Configuration {
	return catalog.Configuration{SchemaVersion: 1, Name: "Synthetic game", Reviewed: true, References: []catalog.Reference{}, Services: []catalog.ServiceDefinition{{Key: "boost", Name: "Synthetic boost", Evaluator: "manual-review-v1", Fields: []catalog.Field{{Key: "mode", Label: "Mode", Type: "select", Stage: "estimate", Required: true, Options: []catalog.Option{{Key: "solo", Label: "Solo"}, {Key: "duo", Label: "Duo"}}}}, Rules: []catalog.Rule{}}}, Packages: []catalog.Package{{Key: "pack", Name: "Synthetic package", Service: "boost", Variants: []catalog.Variant{{Key: "basic", Name: "Synthetic variant", Currency: "USD", AmountMinor: "1234", DeliveryMinHours: 1, DeliveryMaxHours: 2, RequiredFields: []string{"mode"}}}}}, FAQs: []catalog.FAQ{}}
}
func catalogAdmin(t *testing.T, f *authFixture) *identity.Principal {
	t.Helper()
	_, p := f.staffLogin(t, "catalog@example.test", identity.RoleAdmin)
	_, _, p = f.enroll(t, p)
	return p
}
func (f *authFixture) principalFromSession(t *testing.T, p *identity.Principal) *identity.Principal {
	t.Helper()
	account, err := f.client.User.Get(t.Context(), p.User.ID)
	if err != nil {
		t.Fatal(err)
	}
	return &identity.Principal{User: account, Session: p.Session}
}
func TestCatalogPublicationAndConcurrency(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	p := catalogAdmin(t, f)
	store := catalog.New(f.client, f.service)
	seeded, err := f.client.Game.Query().Where(game.SlugEQ("mobile-legends")).Only(ctx)
	if err != nil {
		t.Fatal(err)
	}
	seed, err := store.Draft(ctx, p, seeded.ID)
	if err != nil || seed.Published || seed.Configuration.Reviewed || len(seed.Configuration.Services[0].Fields) < 20 {
		t.Fatal("draft seed missing", err)
	}
	if _, err = store.Mutate(ctx, p, seed.ID, "publish", catalog.Change{Revision: seed.Revision}); err == nil {
		t.Fatal("unverified seed published")
	}
	list, err := store.List(ctx, nil, false, "")
	if err != nil || len(list.Games) != 0 {
		t.Fatal("draft leaked", err)
	}
	c := catalogConfig()
	c.HeroLayout = &catalog.HeroLayout{DesktopX: 18, DesktopY: 30, MobileX: 25, MobileY: 20, CopySide: "right"}
	draft, err := store.Create(ctx, p, "synthetic", c)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.Create(ctx, p, "synthetic", c); !errors.Is(err, catalog.ErrConflict) {
		t.Fatal("duplicate slug", err)
	}
	var wins atomic.Int64
	var wg sync.WaitGroup
	for range 6 {
		wg.Go(func() {
			_, mutationErr := store.Mutate(ctx, p, draft.ID, "publish", catalog.Change{Revision: draft.Revision})
			if mutationErr == nil {
				wins.Add(1)
			} else if !errors.Is(mutationErr, catalog.ErrConflict) {
				t.Error(mutationErr)
			}
		})
	}
	wg.Wait()
	if wins.Load() != 1 {
		t.Fatal("publication winners", wins.Load())
	}
	published, err := store.Published(ctx, "synthetic")
	if err != nil || published.Configuration.Name != c.Name {
		t.Fatal(err)
	}
	if published.Configuration.HeroLayout == nil || published.Configuration.HeroLayout.DesktopX != 18 {
		t.Fatal("published artwork framing missing")
	}
	current, err := store.Draft(ctx, p, draft.ID)
	if err != nil {
		t.Fatal(err)
	}
	c.HeroLayout = &catalog.HeroLayout{DesktopX: 70, DesktopY: 20, MobileX: 80, MobileY: 25, CopySide: "left"}
	c.Name = "Unpublished name"
	c.Packages[0].Variants[0].AmountMinor = "9999"
	current, err = store.Mutate(ctx, p, draft.ID, "save", catalog.Change{Revision: current.Revision, Configuration: c})
	if err != nil {
		t.Fatal(err)
	}
	view, err := store.Published(ctx, "synthetic")
	if err != nil || view.ID != published.ID || view.Configuration.Name == c.Name || view.Configuration.Packages[0].Variants[0].AmountMinor != "1234" {
		t.Fatal("draft changed release", err)
	}
	if view.Configuration.HeroLayout == nil || view.Configuration.HeroLayout.DesktopX != 18 || view.Configuration.HeroLayout.CopySide != "right" {
		t.Fatal("draft framing changed immutable release")
	}
	if _, err = store.Mutate(ctx, p, draft.ID, "save", catalog.Change{Revision: 1, Configuration: c}); !errors.Is(err, catalog.ErrConflict) {
		t.Fatal("stale save accepted", err)
	}
	current, err = store.Mutate(ctx, p, draft.ID, "publish", catalog.Change{Revision: current.Revision})
	if err != nil {
		t.Fatal(err)
	}
	history, err := store.History(ctx, p, draft.ID, 0)
	if err != nil || len(history) != 2 || history[1].ID != published.ID || history[1].Configuration.Name != published.Configuration.Name {
		t.Fatal("history changed", err)
	}
	for _, action := range []string{"pause", "archive", "restore", "resume"} {
		current, err = store.Mutate(ctx, p, draft.ID, action, catalog.Change{Revision: current.Revision})
		if err != nil {
			t.Fatal(action, err)
		}
		if action == "archive" {
			if _, err = store.Published(ctx, "synthetic"); !ent.IsNotFound(err) {
				t.Fatal("archive visible", err)
			}
		} else {
			release, readErr := store.Published(ctx, "synthetic")
			if readErr != nil || release.Paused != (action != "resume") {
				t.Fatal(action, readErr)
			}
		}
	}
	if _, err = store.Mutate(ctx, p, draft.ID, "delete", catalog.Change{Revision: current.Revision}); !errors.Is(err, catalog.ErrConflict) {
		t.Fatal("historical game deleted", err)
	}
	temporary, err := store.Create(ctx, p, "temporary", catalogConfig())
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.Mutate(ctx, p, temporary.ID, "delete", catalog.Change{Revision: temporary.Revision}); err != nil {
		t.Fatal(err)
	}
	count, err := f.client.AuthAudit.Query().Where(authaudit.ActorIDEQ(p.User.ID), authaudit.ActionEQ("catalog.publish")).Count(ctx)
	if err != nil || count != 2 {
		t.Fatal("publication audit", count, err)
	}
	if err = database.Ready(ctx, f.db); err != nil {
		t.Fatal(err)
	}
	if _, err = f.db.ExecContext(ctx, "ALTER TABLE catalog_releases DROP INDEX catalog_release_revision"); err != nil {
		t.Fatal(err)
	}
	if err = database.Ready(ctx, f.db); err == nil {
		t.Fatal("missing release constraint was ready")
	}
}

func TestCatalogHistoricalRollbackPreservesDraft(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	ctx := t.Context()
	// Catalog rollback remains supported in historical schemas. It must not
	// attempt to merge the independent identities introduced by migration 41.
	if err := r.Apply(ctx, 40); err != nil {
		t.Fatal(err)
	}
	configuration, err := json.Marshal(catalogConfig())
	if err != nil {
		t.Fatal(err)
	}
	executeSQL(t, db, "INSERT INTO games(id,slug,name,configuration,version,published,current_release,created_at) VALUES ('rollback-game','rollback-fixture','Synthetic game',?,2,TRUE,'rollback-release',UTC_TIMESTAMP(6))", string(configuration))
	executeSQL(t, db, "INSERT INTO catalog_releases(id,game_id,version,configuration,created_by,created_at) VALUES ('rollback-release','rollback-game',2,?,'historic-staff',UTC_TIMESTAMP(6))", string(configuration))
	// An explicitly destructive development rollback removes history, but must
	// never leave a visible game pointing to a release that no longer exists.
	if err = r.Down(ctx, 40-4); err != nil {
		t.Fatal(err)
	}
	if err = r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	var published bool
	var currentRelease, name string
	if err = db.QueryRowContext(ctx, "SELECT published,current_release,JSON_UNQUOTE(JSON_EXTRACT(configuration,'$.name')) FROM games WHERE id='rollback-game'").Scan(&published, &currentRelease, &name); err != nil {
		t.Fatal(err)
	}
	if published || currentRelease != "" || name != catalogConfig().Name {
		t.Fatal("rollback lost draft or exposed missing release")
	}
	if err = database.Ready(ctx, db); err != nil {
		t.Fatal(err)
	}
}

func TestCatalogStaffAuthorizationAndHTTP(t *testing.T) {
	f := authDB(t, nil)
	ctx := t.Context()
	p := catalogAdmin(t, f)
	store := catalog.New(f.client, f.service)
	_, customer := f.login(t, "buyer@example.test")
	for _, principal := range []*identity.Principal{nil, customer, {User: p.User, Session: customer.Session}} {
		if _, err := store.Create(ctx, principal, "forbidden", catalogConfig()); err == nil {
			t.Fatal("unauthorized creation")
		}
	}
	draft, err := store.Create(ctx, p, "http-game", catalogConfig())
	if err != nil {
		t.Fatal(err)
	}
	draft, err = store.Mutate(ctx, p, draft.ID, "publish", catalog.Change{Revision: draft.Revision})
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	f.service.Register(mux)
	store.Register(mux)
	bootstrap := httptest.NewRecorder()
	mux.ServeHTTP(bootstrap, httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/v1/auth/session", nil))
	var session struct {
		CSRF string `json:"csrf_token"`
	}
	if err = json.Unmarshal(bootstrap.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	response := bootstrap.Result()
	cookies := response.Cookies()
	if err = response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	call := func(path, body, origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequestWithContext(ctx, http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", origin)
		req.Header.Set("X-Csrf-Token", session.CSRF)
		for _, cookie := range cookies {
			req.AddCookie(cookie)
		}
		res := httptest.NewRecorder()
		mux.ServeHTTP(res, req)
		return res
	}
	body := `{"release_id":"` + draft.CurrentRelease + `","service":"boost","stage":"estimate","answers":{"mode":"solo"}}`
	if res := call("/api/v1/catalog/games/http-game/validate", body, "http://localhost"); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"issues":[]`) {
		t.Fatal(res.Code, res.Body.String())
	}
	if res := call("/api/v1/catalog/games/http-game/validate", body, "https://evil.test"); res.Code != http.StatusForbidden {
		t.Fatal("CSRF", res.Code)
	}
	if res := call("/api/v1/admin/catalog/games", `{}`, "http://localhost"); res.Code != http.StatusForbidden {
		t.Fatal("admin boundary", res.Code)
	}
	for _, bad := range []string{strings.Replace(body, draft.CurrentRelease, "stale", 1), strings.Replace(body, `"estimate"`, `"fulfillment"`, 1), strings.Replace(body, `"service"`, `"unexpected"`, 1), strings.Repeat("x", 262145)} {
		res := call("/api/v1/catalog/games/http-game/validate", bad, "http://localhost")
		if res.Code != http.StatusConflict && res.Code != http.StatusUnprocessableEntity {
			t.Fatal("invalid body accepted", res.Code)
		}
	}
	f.clock.Add(601)
	if _, err = store.Mutate(ctx, p, draft.ID, "publish", catalog.Change{Revision: draft.Revision}); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("old factor published", err)
	}
	if _, err = f.client.User.UpdateOneID(p.User.ID).SetSuspended(true).Save(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Mutate(ctx, p, draft.ID, "archive", catalog.Change{Revision: draft.Revision}); !errors.Is(err, identity.ErrUnauthenticated) {
		t.Fatal("stale staff authority accepted", err)
	}
}

func TestCatalogPublicationRollsBackWithAuditFailure(t *testing.T) {
	f := authDB(t, nil)
	p := catalogAdmin(t, f)
	store := catalog.New(f.client, f.service)
	ctx := t.Context()
	draft, err := store.Create(ctx, p, "atomic-test", catalogConfig())
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.db.ExecContext(ctx, "DROP TABLE auth_audits"); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Mutate(ctx, p, draft.ID, "publish", catalog.Change{Revision: draft.Revision}); err == nil {
		t.Fatal("publication succeeded without its audit")
	}
	after, err := store.Draft(ctx, p, draft.ID)
	if err != nil || after.Published || after.Revision != draft.Revision || after.CurrentRelease != "" {
		t.Fatal("publication partially committed", err)
	}
	history, err := store.History(ctx, p, draft.ID, 0)
	if err != nil || len(history) != 0 {
		t.Fatal("orphan release survived rollback", err)
	}
}

func TestCatalogVisibilityForwardGuard(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	ctx := t.Context()
	if err := r.Apply(ctx, 5); err != nil {
		t.Fatal(err)
	}
	// Simulate a legacy visible row with no publication snapshot.
	if _, err := db.ExecContext(ctx, "UPDATE games SET published=TRUE WHERE slug='mobile-legends'"); err != nil {
		t.Fatal(err)
	}
	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	var visible bool
	if err := db.QueryRowContext(ctx, "SELECT published FROM games WHERE slug='mobile-legends'").Scan(&visible); err != nil {
		t.Fatal(err)
	}
	if visible {
		t.Fatal("legacy game without a release remained public")
	}
	if err := database.Ready(ctx, db); err != nil {
		t.Fatal(err)
	}
}
