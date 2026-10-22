//go:build integration

package integration

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/httpapi"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/wanted"
)

func TestWantedAccountMigrationStartupReadiness(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	if err := r.Apply(t.Context(), 47); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err == nil {
		t.Fatal("schema47 must not start a schema48 application")
	}
	if err := r.Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err != nil {
		t.Fatal("migrated wanted accounts must pass actual API/worker startup readiness:", err)
	}
	// The CLI may step back over 48: it removes only staff-authored notices.
	if err := r.Down(t.Context(), 1); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err == nil {
		t.Fatal("schema47 after rollback must not start a schema48 application")
	}
	if err := r.Apply(t.Context(), 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err != nil {
		t.Fatal("reapplied migration must pass readiness:", err)
	}
	if _, err := db.ExecContext(t.Context(), "ALTER TABLE wanted_accounts MODIFY COLUMN visible VARCHAR(5) NOT NULL DEFAULT 'false'"); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(t.Context(), db); err == nil || !strings.Contains(err.Error(), "wanted_accounts.visible") {
		t.Fatal("readiness must still reject schema drift:", err)
	}
}

func wantedStore(f *orderFixture) *wanted.Store {
	return wanted.New(f.auth.client, f.auth.service, func() time.Time { return time.Unix(f.auth.clock.Load(), 0) })
}

func wantedInput(game, title string, visible bool) wanted.CreateInput {
	return wanted.CreateInput{RequestKey: uuid.NewString(), GameID: game, Input: wanted.Input{Title: title, Description: "Synthetic wanted account.\nPlain <b>text</b> only.", Visible: visible}}
}

func TestWantedAccountsAuthorityLimitsOrderAndVisibility(t *testing.T) {
	f := submissionDB(t)
	ctx := t.Context()
	s := wantedStore(f.orderFixture)
	gameID := f.game.ID

	// Customers and boosters cannot read or change staff entries.
	_, booster := f.auth.staffLogin(t, "wanted-booster@example.test", identity.RoleBooster)
	for _, p := range []*identity.Principal{nil, f.buyer, booster} {
		if _, err := s.List(ctx, p, gameID); err == nil {
			t.Fatal("non-admin listed wanted accounts")
		}
		if _, err := s.Create(ctx, p, wantedInput(gameID, "Forbidden", true)); err == nil {
			t.Fatal("non-admin created a wanted account")
		}
	}

	// Concurrent retries of one request key create exactly one entry.
	input := wantedInput(gameID, "Mythical Glory account", true)
	var wg sync.WaitGroup
	ids := sync.Map{}
	for range 4 {
		wg.Go(func() {
			entry, err := s.Create(ctx, f.admin, input)
			if err != nil {
				t.Error(err)
				return
			}
			ids.Store(entry.ID, true)
		})
	}
	wg.Wait()
	count := 0
	ids.Range(func(_, _ any) bool { count++; return true })
	if count != 1 {
		t.Fatal("duplicate request created entries", count)
	}
	changed := input
	changed.Title = "A different title"
	if _, err := s.Create(ctx, f.admin, changed); !errors.Is(err, wanted.ErrConflict) {
		t.Fatal("reused request key with different content", err)
	}
	var invalid *catalog.Invalid
	if _, err := s.Create(ctx, f.admin, wantedInput(gameID, strings.Repeat("x", 81), true)); !errors.As(err, &invalid) {
		t.Fatal("overlong title accepted", err)
	}

	// Up to six entries may be shown; hidden entries count towards the total of twenty.
	for i := 1; i < wanted.MaxShown; i++ {
		if _, err := s.Create(ctx, f.admin, wantedInput(gameID, "Shown "+string(rune('A'+i)), true)); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := s.Create(ctx, f.admin, wantedInput(gameID, "Seventh shown", true)); !errors.As(err, &invalid) || invalid.Issues[0].Path != "visible" {
		t.Fatal("seventh shown entry accepted", err)
	}
	hidden, err := s.Create(ctx, f.admin, wantedInput(gameID, "Hidden request", false))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.Update(ctx, f.admin, hidden.ID, wanted.UpdateInput{Version: hidden.Version, Input: wanted.Input{Title: hidden.Title, Visible: true}}); !errors.As(err, &invalid) {
		t.Fatal("showing a seventh entry accepted", err)
	}
	for i := 2; i < wanted.MaxPerGame-wanted.MaxShown; i++ {
		if _, err = s.Create(ctx, f.admin, wantedInput(gameID, "Hidden filler", false)); err != nil {
			t.Fatal(err)
		}
	}
	list, err := s.List(ctx, f.admin, gameID)
	if err != nil || len(list.Items) != wanted.MaxPerGame-1 || !list.Open || list.GameSlug != f.game.Slug {
		t.Fatal("staff list", len(list.Items), list.Open, err)
	}
	if _, err = s.Create(ctx, f.admin, wantedInput(gameID, "Twentieth", false)); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Create(ctx, f.admin, wantedInput(gameID, "Twenty-first", false)); !errors.Is(err, wanted.ErrConflict) {
		t.Fatal("more than twenty entries accepted", err)
	}

	// Public reads expose only shown entries in staff order, without staff fields.
	public, err := s.Public(ctx, f.game.Slug)
	if err != nil || len(public.Items) != wanted.MaxShown || public.Items[0].Title != "Mythical Glory account" {
		t.Fatal("public list", public, err)
	}
	for _, item := range public.Items {
		if item.Title == "Hidden request" || item.Title == "Hidden filler" {
			t.Fatal("hidden entry leaked")
		}
	}
	raw, err := json.Marshal(public)
	if err != nil {
		t.Fatal(err)
	}
	for _, private := range []string{"visible", "position", "version", "game_id", "created_by", "updated", "request"} {
		if strings.Contains(string(raw), private) {
			t.Fatal("public response contains", private, string(raw))
		}
	}

	// Moving swaps neighbours; stale versions and moves past the ends conflict.
	list, err = s.List(ctx, f.admin, gameID)
	if err != nil {
		t.Fatal(err)
	}
	first, second := list.Items[0], list.Items[1]
	if _, err = s.Move(ctx, f.admin, first.ID, wanted.MoveInput{Version: first.Version, Direction: "up"}); !errors.Is(err, wanted.ErrConflict) {
		t.Fatal("moved past the top", err)
	}
	moved, err := s.Move(ctx, f.admin, second.ID, wanted.MoveInput{Version: second.Version, Direction: "up"})
	if err != nil || moved.Items[0].ID != second.ID || moved.Items[1].ID != first.ID || moved.Items[0].Version != second.Version+1 {
		t.Fatal("move up", err)
	}
	if _, err = s.Move(ctx, f.admin, second.ID, wanted.MoveInput{Version: second.Version, Direction: "down"}); !errors.Is(err, wanted.ErrConflict) {
		t.Fatal("stale move accepted", err)
	}
	public, err = s.Public(ctx, f.game.Slug)
	if err != nil || public.Items[0].ID != second.ID {
		t.Fatal("public order did not follow staff order", err)
	}

	// Hiding, stale edits and deletion are versioned and audited.
	current := moved.Items[0]
	updated, err := s.Update(ctx, f.admin, current.ID, wanted.UpdateInput{Version: current.Version, Input: wanted.Input{Title: current.Title, Description: current.Description, Visible: false}})
	if err != nil || updated.Visible {
		t.Fatal("hide", err)
	}
	if _, err = s.Update(ctx, f.admin, current.ID, wanted.UpdateInput{Version: current.Version, Input: wanted.Input{Title: "Stale", Visible: false}}); !errors.Is(err, wanted.ErrConflict) {
		t.Fatal("stale edit accepted", err)
	}
	if err = s.Delete(ctx, f.admin, current.ID, wanted.VersionInput{Version: current.Version}); !errors.Is(err, wanted.ErrConflict) {
		t.Fatal("stale delete accepted", err)
	}
	if err = s.Delete(ctx, f.admin, current.ID, wanted.VersionInput{Version: updated.Version}); err != nil {
		t.Fatal(err)
	}
	for _, action := range []string{"wanted_account_created", "wanted_account_moved_up", "wanted_account_hidden", "wanted_account_deleted"} {
		exists, auditErr := f.auth.client.AuthAudit.Query().Where(authaudit.ActionEQ(action), authaudit.ActorIDEQ(f.admin.User.ID)).Exist(ctx)
		if auditErr != nil || !exists {
			t.Fatal("missing audit", action, auditErr)
		}
	}

	// Changes require one recent verification factor; reads do not.
	f.auth.clock.Add(int64(identity.RecentTTL/time.Second) + 1)
	if _, err = s.Create(ctx, f.admin, wantedInput(gameID, "Needs verification", false)); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("change accepted without recent verification", err)
	}
	if _, err = s.List(ctx, f.admin, gameID); err != nil {
		t.Fatal("staff read required recent verification", err)
	}

	// A paused game or one without account intake publishes nothing.
	if _, err = s.Public(ctx, "orders-game"); !errors.Is(err, wanted.ErrUnavailable) {
		t.Fatal("game without account intake exposed wanted accounts", err)
	}
	if _, err = s.Public(ctx, "unknown-game"); !errors.Is(err, wanted.ErrUnavailable) {
		t.Fatal("unknown game", err)
	}
	draft, err := f.catalog.Draft(ctx, f.admin, gameID)
	if err != nil {
		t.Fatal(err)
	}
	f.auth.clock.Add(-int64(identity.RecentTTL/time.Second) - 1)
	if _, err = f.catalog.Mutate(ctx, f.admin, gameID, "pause", catalog.Change{Revision: draft.Revision}); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Public(ctx, f.game.Slug); !errors.Is(err, wanted.ErrUnavailable) {
		t.Fatal("paused game exposed wanted accounts", err)
	}
	if list, err = s.List(ctx, f.admin, gameID); err != nil || list.Open {
		t.Fatal("staff list must report closed sales", err)
	}
}

func TestWantedAccountsHTTPPublicBoundary(t *testing.T) {
	f := submissionDB(t)
	s := wantedStore(f.orderFixture)
	if _, err := s.Create(t.Context(), f.admin, wantedInput(f.game.ID, "Shown <script>x</script>", true)); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Create(t.Context(), f.admin, wantedInput(f.game.ID, "Private hidden", false)); err != nil {
		t.Fatal(err)
	}
	handler := httpapi.New(f.auth.db.PingContext, slog.New(slog.DiscardHandler), false, f.auth.service.Register, s.Register)
	call := func(method, path, body string) *httptest.ResponseRecorder {
		r := httptest.NewRequestWithContext(t.Context(), method, path, strings.NewReader(body))
		r.Header.Set("Origin", "http://localhost")
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	got := call(http.MethodGet, "/api/v1/games/"+f.game.Slug+"/wanted-accounts", "")
	var decoded wanted.PublicList
	if err := json.Unmarshal(got.Body.Bytes(), &decoded); err != nil {
		t.Fatal(err)
	}
	// Markup stays data: decoded text is literal and the wire form escapes '<'.
	if got.Code != http.StatusOK || got.Header().Get("Cache-Control") != "no-store" || len(decoded.Items) != 1 || decoded.Items[0].Title != "Shown <script>x</script>" || strings.Contains(got.Body.String(), "<") || strings.Contains(got.Body.String(), "Private hidden") {
		t.Fatal("public response", got.Code, got.Body.String())
	}
	for _, path := range []string{"/api/v1/games/unknown-game/wanted-accounts", "/api/v1/games/orders-game/wanted-accounts", "/api/v1/games/Bad%20Slug/wanted-accounts"} {
		if res := call(http.MethodGet, path, ""); res.Code != http.StatusNotFound || !strings.Contains(res.Body.String(), "wanted_accounts_unavailable") {
			t.Fatal("unavailable game", path, res.Code, res.Body.String())
		}
	}
	if res := call(http.MethodGet, "/api/v1/admin/wanted-accounts?game="+f.game.ID, ""); res.Code != http.StatusUnauthorized && res.Code != http.StatusForbidden {
		t.Fatal("anonymous staff read", res.Code)
	}
	if res := call(http.MethodPost, "/api/v1/admin/wanted-accounts", `{}`); res.Code != http.StatusUnauthorized && res.Code != http.StatusForbidden {
		t.Fatal("anonymous staff write", res.Code)
	}
}
