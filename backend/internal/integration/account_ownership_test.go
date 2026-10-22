//go:build integration

package integration

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountlisting"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/accountreservation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/moneytransfer"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/artwork"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/orders"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resale"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/resaleevents"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/reviews"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/sitecontent"
)

// seedSchema49Listing inserts one accepted seller offer and its inventory row
// exactly as schema49 stored them, before origin existed.
func seedSchema49Listing(t *testing.T, db *sql.DB, state, model string) string {
	t.Helper()
	offer, submission, seller, listing := uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()
	data := `{"model":"` + model + `","amount":"10.570000"}`
	if model == "" {
		data = `{"amount":"10.570000"}`
	}
	executeSQL(t, db, "INSERT INTO seller_offers(id,submission_id,seller_id,request_hash,data,state,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", offer, submission, seller, strings.Repeat("a", 64), data, state)
	executeSQL(t, db, "INSERT INTO account_listings(id,submission_id,offer_id,seller_id,game_id,game_name,slug,draft,created_at,updated_at) VALUES (?,?,?,?,?,'Synthetic','synthetic','{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", listing, submission, offer, seller, uuid.NewString())
	return listing
}

func listingOrigin(t *testing.T, db *sql.DB, id string) string {
	t.Helper()
	var origin string
	if err := db.QueryRowContext(t.Context(), "SELECT origin FROM account_listings WHERE id=?", id).Scan(&origin); err != nil {
		t.Fatal(err)
	}
	return origin
}

func TestAccountOwnershipMigrationStartupReadiness(t *testing.T) {
	db := testDB(t)
	r := runner(t, db)
	ctx := t.Context()
	if err := r.Apply(ctx, 49); err != nil {
		t.Fatal(err)
	}
	consignment := seedSchema49Listing(t, db, "accepted", "consignment")
	bought := seedSchema49Listing(t, db, "accepted", "buy_first")
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("schema49 must not start a schema50 application")
	}
	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err != nil {
		t.Fatal("migrated ownership must pass actual API/worker startup readiness:", err)
	}
	if listingOrigin(t, db, consignment) != "consignment" || listingOrigin(t, db, bought) != "buy_first" {
		t.Fatal("origin was not derived from each accepted seller offer")
	}
	// Every future insert must state its origin.
	if _, err := db.ExecContext(ctx, "INSERT INTO account_listings(id,game_id,game_name,slug,draft,created_at,updated_at) VALUES (?,?,'Synthetic','synthetic','{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", uuid.NewString(), uuid.NewString()); err == nil {
		t.Fatal("origin must have no default")
	}
	// Without PLAYORA-created inventory the CLI may step back over 50 without deleting rows.
	if err := r.Down(ctx, database.SchemaVersion-49); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("schema49 after rollback must not start a schema50 application")
	}
	var rows int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM account_listings").Scan(&rows); err != nil || rows != 2 {
		t.Fatal("rollback must keep every seller listing", rows, err)
	}
	if err := r.Apply(ctx, 0); err != nil {
		t.Fatal(err)
	}
	if err := database.Ready(ctx, db); err != nil {
		t.Fatal("reapplied migration must pass readiness:", err)
	}
	owned := uuid.NewString()
	executeSQL(t, db, "INSERT INTO account_listings(id,origin,game_id,game_name,slug,draft,created_at,updated_at) VALUES (?,'playora',?,'Synthetic','synthetic','{}',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", owned, uuid.NewString())
	if err := r.Down(ctx, 1); err == nil || !strings.Contains(err.Error(), "forward-only") {
		t.Fatal("rollback must refuse PLAYORA-owned inventory:", err)
	}
	if err := database.Ready(ctx, db); err != nil {
		t.Fatal("a refused rollback must not leave an interrupted journal:", err)
	}
	executeSQL(t, db, "DROP INDEX account_inventory_origin ON account_listings")
	if err := database.Ready(ctx, db); err == nil {
		t.Fatal("readiness must reject a missing origin index")
	}
	executeSQL(t, db, "CREATE INDEX account_inventory_origin ON account_listings (origin,state,id)")
	executeSQL(t, db, "DELETE FROM account_listings WHERE id=?", owned)
	executeSQL(t, db, "ALTER TABLE account_listings MODIFY COLUMN submission_id VARCHAR(36) NOT NULL")
	if err := database.Ready(ctx, db); err == nil || !strings.Contains(err.Error(), "nullability") {
		t.Fatal("readiness must reject provenance that cannot be absent:", err)
	}
}

func TestAccountOwnershipBackfillRefusesUnprovableOrigin(t *testing.T) {
	for name, seed := range map[string]func(*testing.T, *sql.DB){
		"missing offer": func(t *testing.T, db *sql.DB) {
			listing := seedSchema49Listing(t, db, "accepted", "consignment")
			executeSQL(t, db, "DELETE FROM seller_offers WHERE id=(SELECT offer_id FROM account_listings WHERE id=?)", listing)
		},
		"offer not accepted": func(t *testing.T, db *sql.DB) { seedSchema49Listing(t, db, "withdrawn", "consignment") },
		"unknown model":      func(t *testing.T, db *sql.DB) { seedSchema49Listing(t, db, "accepted", "") },
	} {
		t.Run(name, func(t *testing.T) {
			db := testDB(t)
			r := runner(t, db)
			if err := r.Apply(t.Context(), 49); err != nil {
				t.Fatal(err)
			}
			seedSchema49Listing(t, db, "accepted", "buy_first")
			seed(t, db)
			if err := r.Apply(t.Context(), 0); err == nil {
				t.Fatal("ownership must never be guessed")
			}
			var columns int
			if err := db.QueryRowContext(t.Context(), "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='account_listings' AND column_name='origin'").Scan(&columns); err != nil || columns != 0 {
				t.Fatal("the precondition must stop the migration before any DDL", columns, err)
			}
		})
	}
}

// accountArtwork records a ready staff upload for an exact purpose and stores
// its wide rendition in the given in-memory object namespace.
func accountArtwork(t *testing.T, f *resaleFixture, objects *memoryObjects, purpose string) string {
	t.Helper()
	id := uuid.NewString()
	data := []byte("synthetic sanitized rendition " + id)
	sum := sha256.Sum256(data)
	variants := map[string]any{"wide": map[string]any{"width": 1600, "height": 1600, "size": len(data), "checksum": hex.EncodeToString(sum[:]), "content_type": "image/png"}}
	if _, err := f.base.auth.client.Artwork.Create().SetID(id).SetUserID(f.base.admin.User.ID).SetRequestHash(strings.Repeat("b", 64)).SetPurpose(purpose).SetState("ready").SetWidth(1600).SetHeight(1600).SetFocusX(50).SetFocusY(50).SetVariants(variants).Save(t.Context()); err != nil {
		t.Fatal(err)
	}
	objects.data.Store("artwork/"+id+"/wide", data)
	return id
}

type memoryObjects struct{ data sync.Map }

func (m *memoryObjects) Put(_ context.Context, key string, data []byte, _ string) error {
	m.data.Store(key, append([]byte(nil), data...))
	return nil
}
func (m *memoryObjects) Get(_ context.Context, key string) ([]byte, error) {
	value, ok := m.data.Load(key)
	if !ok {
		return nil, errors.New("object missing")
	}
	data, ok := value.([]byte)
	if !ok {
		return nil, errors.New("object is not bytes")
	}
	return append([]byte(nil), data...), nil
}
func (m *memoryObjects) Delete(_ context.Context, key string) error {
	m.data.Delete(key)
	return nil
}

func playoraInput(f *resaleFixture) resale.PlayoraListingInput {
	return resale.PlayoraListingInput{RequestKey: uuid.NewString(), GameID: f.intake.game.ID, Title: "Synthetic PLAYORA account"}
}

// playoraProduct is a complete PLAYORA listing using the published buyer rule.
func playoraProduct(media ...string) resale.Product {
	product := resaleProduct()
	product.Title = "Synthetic PLAYORA account"
	product.MediaIDs = append([]string{}, media...)
	if len(media) > 0 {
		product.CoverMediaID = media[0]
	}
	return product
}

func (f *resaleFixture) playoraListing(t *testing.T, media ...string) resale.ListingView {
	t.Helper()
	ctx := t.Context()
	v, err := f.resale.CreatePlayoraListing(ctx, f.base.admin, playoraInput(f))
	if err != nil {
		t.Fatal(err)
	}
	v, err = f.resale.ChangeListing(ctx, f.base.admin, v.ID, "publish", resale.ListingInput{Version: v.Version, Product: playoraProduct(media...), PublicReviewed: true})
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func TestPlayoraListingAuthorityIdempotencyAndPublication(t *testing.T) {
	f := resaleDraftDB(t, "consignment", false)
	ctx := t.Context()
	objects := &memoryObjects{}
	// The fixture's mail-only drain must not run the seller obligation/notification jobs.
	executeSQL(t, f.base.auth.db, "UPDATE jobs SET state='complete' WHERE kind<>'identity.email'")
	_, booster := f.base.auth.staffLogin(t, "ownership-booster@example.test", identity.RoleBooster)
	for _, p := range []*identity.Principal{f.base.buyer, f.intake.buyer, booster} {
		// Customers are forbidden; a booster is refused before any staff capability check.
		if _, err := f.resale.CreatePlayoraListing(ctx, p, playoraInput(f)); !errors.Is(err, identity.ErrForbidden) && !errors.Is(err, identity.ErrMFA) {
			t.Fatal("only staff administrators may create PLAYORA inventory:", err)
		}
	}
	f.base.auth.clock.Add(int64(identity.RecentTTL/time.Second) + 1)
	if _, err := f.resale.CreatePlayoraListing(ctx, f.base.admin, playoraInput(f)); !errors.Is(err, identity.ErrRecent) {
		t.Fatal("creation requires one recent verification factor:", err)
	}
	f.base.auth.clock.Add(-int64(identity.RecentTTL/time.Second) - 1)
	for name, input := range map[string]resale.PlayoraListingInput{
		"bad key":    {RequestKey: "key", GameID: f.intake.game.ID, Title: "Synthetic"},
		"no title":   {RequestKey: uuid.NewString(), GameID: f.intake.game.ID, Title: " "},
		"long":       {RequestKey: uuid.NewString(), GameID: f.intake.game.ID, Title: strings.Repeat("x", 121)},
		"bad game":   {RequestKey: uuid.NewString(), GameID: "game", Title: "Synthetic"},
		"no game":    {RequestKey: uuid.NewString(), GameID: uuid.NewString(), Title: "Synthetic"},
		"no game ID": {RequestKey: uuid.NewString(), GameID: "", Title: "Synthetic"},
	} {
		if _, err := f.resale.CreatePlayoraListing(ctx, f.base.admin, input); !errors.Is(err, resale.ErrInvalid) && !errors.Is(err, resale.ErrConflict) {
			t.Fatal(name, err)
		}
	}
	input := playoraInput(f)
	draft, err := f.resale.CreatePlayoraListing(ctx, f.base.admin, input)
	if err != nil {
		t.Fatal(err)
	}
	if draft.ID != input.RequestKey || draft.Origin != "playora" || draft.Ownership != "playora" || draft.SubmissionID != "" || draft.OfferID != "" || draft.State != "draft" || draft.Draft.Title != input.Title || draft.Draft.AmountMinor != "" || draft.Draft.DisputeHours != 168 {
		t.Fatalf("unexpected PLAYORA draft: %+v", draft)
	}
	row, err := f.base.auth.client.AccountListing.Get(ctx, draft.ID)
	if err != nil || row.SellerID != nil || row.OfferID != nil || row.SubmissionID != nil || row.GameID != f.intake.game.ID {
		t.Fatal("PLAYORA inventory must carry no seller provenance", err)
	}
	again, err := f.resale.CreatePlayoraListing(ctx, f.base.admin, input)
	if err != nil || again.ID != draft.ID || again.Version != draft.Version {
		t.Fatal("a retried create must return the same draft", err)
	}
	other := input
	other.GameID = f.base.game.ID
	if _, err = f.resale.CreatePlayoraListing(ctx, f.base.admin, other); !errors.Is(err, resale.ErrConflict) {
		t.Fatal("a reused key for another game must conflict:", err)
	}
	// A seller listing ID can never be claimed as PLAYORA inventory.
	seller := input
	seller.RequestKey = f.listing.ID
	if _, err = f.resale.CreatePlayoraListing(ctx, f.base.admin, seller); !errors.Is(err, resale.ErrConflict) {
		t.Fatal("seller inventory must not be reinterpreted:", err)
	}
	concurrent := playoraInput(f)
	var wg sync.WaitGroup
	results := make(chan string, 4)
	for range 4 {
		wg.Go(func() {
			v, e := f.resale.CreatePlayoraListing(ctx, f.base.admin, concurrent)
			if e != nil {
				t.Error("concurrent create", e)
				return
			}
			results <- v.ID
		})
	}
	wg.Wait()
	close(results)
	for id := range results {
		if id != concurrent.RequestKey {
			t.Fatal("concurrent creates must converge on one draft")
		}
	}
	count, err := f.base.auth.client.AccountListing.Query().Where(accountlisting.OriginEQ(accountlisting.OriginPlayora)).Count(ctx)
	if err != nil || count != 2 {
		t.Fatal("exactly two PLAYORA drafts must exist", count, err)
	}
	audits, err := f.base.auth.client.AuthAudit.Query().Where(authaudit.ActionEQ("resale_playora_inventory_created")).All(ctx)
	if err != nil || len(audits) != 2 || audits[0].Metadata["origin"] != "playora" || audits[0].Metadata["game_id"] != f.intake.game.ID {
		t.Fatal("each created draft is audited once with its origin and game", len(audits), err)
	}

	// Readiness facts and publication rules.
	detail, err := f.resale.Listing(ctx, f.base.admin, draft.ID)
	if err != nil {
		t.Fatal(err)
	}
	for _, code := range []string{"listing_details", "listing_price", "listing_terms", "publication"} {
		if !strings.Contains(strings.Join(detail.Blockers, ","), code) {
			t.Fatal("missing readiness blocker", code, detail.Blockers)
		}
	}
	unpriced := playoraProduct()
	unpriced.Commission = nil
	var invalid *catalog.Invalid
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, draft.ID, "save", resale.ListingInput{Version: draft.Version, Product: unpriced}); !errors.As(err, &invalid) {
		t.Fatal("PLAYORA listings need the published base + 5% buyer price:", err)
	}
	inspection := playoraProduct()
	inspection.DisputeHours = 24
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, draft.ID, "save", resale.ListingInput{Version: draft.Version, Product: inspection}); !errors.As(err, &invalid) {
		t.Fatal("PLAYORA listings keep the seven-day inspection period:", err)
	}
	account := accountArtwork(t, f, objects, "account")
	product := accountArtwork(t, f, objects, "product")
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, draft.ID, "publish", resale.ListingInput{Version: draft.Version, Product: playoraProduct(account)}); !errors.Is(err, resale.ErrInvalid) {
		t.Fatal("publication requires the public review confirmation:", err)
	}
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, draft.ID, "publish", resale.ListingInput{Version: draft.Version, Product: playoraProduct(product), PublicReviewed: true}); !errors.Is(err, resale.ErrConflict) {
		t.Fatal("another artwork purpose must never be published as an account image:", err)
	}
	// Images are never cross-resolved: a non-artwork (seller media) ID is refused for
	// PLAYORA inventory, and account artwork is refused for a seller listing.
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, draft.ID, "publish", resale.ListingInput{Version: draft.Version, Product: playoraProduct(uuid.NewString()), PublicReviewed: true}); !errors.Is(err, resale.ErrConflict) {
		t.Fatal("seller media IDs must not publish on PLAYORA inventory:", err)
	}
	sellerImages := resaleProduct()
	sellerImages.MediaIDs, sellerImages.CoverMediaID = []string{account}, account
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, f.listing.ID, "publish", resale.ListingInput{Version: f.listing.Version, Product: sellerImages, PublicReviewed: true}); err == nil {
		t.Fatal("staff account artwork must not publish on a consignment listing")
	}
	paused, err := f.base.catalog.Mutate(ctx, f.base.admin, f.intake.game.ID, "pause", catalog.Change{Revision: f.intake.game.Revision})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.resale.ChangeListing(ctx, f.base.admin, draft.ID, "publish", resale.ListingInput{Version: draft.Version, Product: playoraProduct(account), PublicReviewed: true}); !errors.Is(err, resale.ErrGameUnavailable) {
		t.Fatal("publication waits for open account sales:", err)
	}
	detail, err = f.resale.Listing(ctx, f.base.admin, draft.ID)
	if err != nil || !strings.Contains(strings.Join(detail.Blockers, ","), "game_unavailable") {
		t.Fatal("readiness must show closed account sales", detail.Blockers, err)
	}
	if f.intake.game, err = f.base.catalog.Mutate(ctx, f.base.admin, f.intake.game.ID, "resume", catalog.Change{Revision: paused.Revision}); err != nil {
		t.Fatal(err)
	}
	published, err := f.resale.ChangeListing(ctx, f.base.admin, draft.ID, "publish", resale.ListingInput{Version: draft.Version, Product: playoraProduct(account), PublicReviewed: true})
	if err != nil || published.State != "published" || published.ReleaseID == "" {
		t.Fatal(err)
	}
	if detail, err = f.resale.Listing(ctx, f.base.admin, draft.ID); err != nil || len(detail.Blockers) != 0 {
		t.Fatal("a live PLAYORA listing with open sales has no blockers", detail.Blockers, err)
	}

	// Public projection and release-gated images.
	public, err := f.resale.Published(ctx, draft.ID)
	if err != nil || len(public.Images) != 1 {
		t.Fatal(err)
	}
	raw, err := json.Marshal(public)
	if err != nil {
		t.Fatal(err)
	}
	for _, private := range []string{`"origin"`, `"ownership"`, `"seller`, `"submission_id"`, `"offer_id"`, account} {
		if strings.Contains(string(raw), private) {
			t.Fatal("public listing leaked", private)
		}
	}
	files := media.New(f.base.auth.client, f.base.auth.service, objects, nil)
	data, kind, err := files.ListingImageContent(ctx, draft.ID, 0, published.ReleaseID)
	if err != nil || kind != "image/png" || !strings.Contains(string(data), account) {
		t.Fatal("published account image must be served through the account route", err)
	}
	if _, _, err = files.ListingImageContent(ctx, draft.ID, 0, uuid.NewString()); err == nil {
		t.Fatal("images are bound to the current release")
	}
	art := artwork.New(f.base.auth.client, f.base.auth.service, objects, nil)
	if _, _, err = art.Content(ctx, nil, account, "wide", false); !errors.Is(err, media.ErrConflict) {
		t.Fatal("account images must never be served by the public artwork route:", err)
	}
	if _, _, err = art.Content(ctx, f.base.admin, account, "wide", true); err != nil {
		t.Fatal("administrators preview their own uploads:", err)
	}
	withdrawn, err := f.resale.ChangeListing(ctx, f.base.admin, draft.ID, "withdraw", resale.ListingInput{Version: published.Version})
	if err != nil || withdrawn.State != "withdrawn" {
		t.Fatal(err)
	}
	if _, _, err = files.ListingImageContent(ctx, draft.ID, 0, published.ReleaseID); err == nil {
		t.Fatal("a paused listing must stop serving its images")
	}

	// Inventory separation: PLAYORA ownership includes bought-first rows; consignment stays the seller's.
	mine, _, counts, err := f.resale.Inventory(ctx, f.base.admin, resale.InventoryFilter{Ownership: "playora"})
	if err != nil || len(mine) != 2 || counts.Playora != 2 || counts.Seller != 1 {
		t.Fatal("PLAYORA inventory view", len(mine), counts, err)
	}
	theirs, _, _, err := f.resale.Inventory(ctx, f.base.admin, resale.InventoryFilter{Ownership: "seller"})
	if err != nil || len(theirs) != 1 || theirs[0].ID != f.listing.ID || theirs[0].Origin != "consignment" || theirs[0].Ownership != "seller" || theirs[0].SellerPayoutConfirmed != nil {
		t.Fatal("seller inventory view", theirs, err)
	}
	_, _, counts, err = f.resale.Inventory(ctx, f.base.admin, resale.InventoryFilter{State: "withdrawn"})
	if err != nil || counts.Playora != 1 || counts.Seller != 0 {
		t.Fatal("counts follow the state filter", counts, err)
	}
	if _, _, _, err = f.resale.Inventory(ctx, f.base.admin, resale.InventoryFilter{Ownership: "playora", Origin: "playora"}); !errors.Is(err, resale.ErrInvalid) {
		t.Fatal("ownership and origin filters are exclusive:", err)
	}
	if _, _, _, err = f.resale.Inventory(ctx, f.base.buyer, resale.InventoryFilter{}); !errors.Is(err, identity.ErrForbidden) {
		t.Fatal("customers cannot read inventory:", err)
	}
}

func TestPlayoraListingPurchaseCreatesNoSellerObligation(t *testing.T) {
	f := resaleDraftDB(t, "consignment", false)
	ctx := t.Context()
	client := f.base.auth.client
	config := f.intake.game.Configuration
	config.ReviewPolicy = &catalog.ReviewPolicy{Content: "Synthetic publication policy permits criticism and prohibits private credentials, spam and abuse.", Fields: []catalog.Field{}, Rules: []catalog.Rule{}}
	game, err := f.base.catalog.Mutate(ctx, f.base.admin, f.intake.game.ID, "save", catalog.Change{Revision: f.intake.game.Revision, Configuration: config})
	if err != nil {
		t.Fatal(err)
	}
	if f.intake.game, err = f.base.catalog.Mutate(ctx, f.base.admin, game.ID, "publish", catalog.Change{Revision: game.Revision}); err != nil {
		t.Fatal(err)
	}
	obligations := func() int {
		var count int
		if e := f.base.auth.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM jobs WHERE kind='payments.seller_obligation'").Scan(&count); e != nil {
			t.Fatal(e)
		}
		return count
	}
	before := obligations()
	if before != 1 {
		t.Fatal("only the consignment acceptance creates a seller obligation", before)
	}
	listing := f.playoraListing(t)
	f.listing = listing
	input := f.reserveInput()
	var wg sync.WaitGroup
	reserved := make(chan orders.Detail, 3)
	for range 3 {
		wg.Go(func() {
			attempt := input
			attempt.RequestKey = uuid.NewString()
			if v, e := f.resale.Reserve(ctx, f.base.buyer, listing.ID, attempt); e == nil {
				reserved <- v
			}
		})
	}
	wg.Wait()
	close(reserved)
	details := []orders.Detail{}
	for v := range reserved {
		details = append(details, v)
	}
	if len(details) != 1 {
		t.Fatal("unique inventory admits exactly one reservation", len(details))
	}
	detail := details[0]
	price := detail.Contract.Data.AccountPrice
	if price == nil || price.BaseMinor != "1175" || price.FeeMinor != "59" || price.TotalMinor != "1234" || len(detail.Contract.Data.Lines) != 2 {
		t.Fatal("PLAYORA listings use the same base + 5% buyer price")
	}
	purchase, err := client.Order.Get(ctx, detail.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if purchase.Snapshot["id"] != f.intake.game.CurrentRelease {
		t.Fatal("the order must record the game's current catalog release")
	}
	a := f.start(t, detail)
	f.issue(t, a)
	f.reconcile(t, f.evidence(t, a, "930", "finished", "12.34000001"))
	sold, err := client.AccountListing.Get(ctx, listing.ID)
	if err != nil || sold.State != "sold" {
		t.Fatal("verified payment must sell the PLAYORA account", err)
	}
	bundle, err := f.resale.SubmitDeliverySecret(ctx, f.base.admin, detail.Order.ID, resale.SecretInput{RequestKey: uuid.NewString(), Value: []byte("synthetic PLAYORA handoff"), ExpiresAt: time.Unix(f.base.auth.clock.Load(), 0).Add(72 * time.Hour)})
	if err != nil {
		t.Fatal(err)
	}
	v, err := f.resale.Delivery(ctx, f.base.admin, detail.Order.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	v, err = f.resale.ChangeDelivery(ctx, f.base.admin, detail.Order.ID, "deliver", true, resale.DeliveryChange{Version: v.Version, SecretVersion: bundle.Version, Accept: true, Instructions: "Synthetic checklist for the PLAYORA account."})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.resale.ChangeDelivery(ctx, f.base.buyer, detail.Order.ID, "acknowledge", false, resale.DeliveryChange{Version: v.Version, Accept: true, Instructions: "I received and tested this synthetic PLAYORA account."}); err != nil {
		t.Fatal(err)
	}
	completed, err := client.Order.Get(ctx, detail.Order.ID)
	if err != nil || string(completed.State) != "completed" {
		t.Fatal("acknowledged delivery completes the order", err)
	}
	feedback := reviews.New(client, f.base.auth.service, func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) })
	eligibility, err := feedback.ForOrder(ctx, f.base.buyer, detail.Order.ID)
	if err != nil || !eligibility.Eligible {
		t.Fatal("buyers of PLAYORA accounts may review their purchase", err)
	}
	if after := obligations(); after != before {
		t.Fatal("a PLAYORA sale must not create a seller obligation", after)
	}
	payouts, err := client.MoneyTransfer.Query().Where(moneytransfer.KindEQ("seller_payout")).Count(ctx)
	if err != nil || payouts != 0 {
		t.Fatal("a PLAYORA sale must not create a seller payout", payouts, err)
	}
	offer, err := client.SellerOffer.Get(ctx, f.offer.ID)
	if err != nil {
		t.Fatal(err)
	}

	// Paid cancellation withdraws the PLAYORA account and touches no seller offer.
	tx, err := client.Tx(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err = resaleevents.CancelPaid(ctx, tx, completed, time.Unix(f.base.auth.clock.Load(), 0)); err != nil {
		t.Fatal(errors.Join(err, tx.Rollback()))
	}
	if err = tx.Commit(); err != nil {
		t.Fatal(err)
	}
	if row, e := client.AccountListing.Get(ctx, listing.ID); e != nil || row.State != "withdrawn" {
		t.Fatal("paid cancellation must withdraw, never relist", e)
	}
	if unchanged, e := client.SellerOffer.Get(ctx, f.offer.ID); e != nil || unchanged.Version != offer.Version {
		t.Fatal("PLAYORA cancellation must not touch a seller offer", e)
	}

	// An unpaid PLAYORA reservation returns to publication.
	second := f.playoraListing(t)
	f.listing = second
	held := f.reserve(t)
	unpaid, err := client.Order.Get(ctx, held.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	tx, err = client.Tx(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err = resaleevents.ReleaseUnpaid(ctx, tx, unpaid, time.Unix(f.base.auth.clock.Load(), 0)); err != nil {
		t.Fatal(errors.Join(err, tx.Rollback()))
	}
	if err = tx.Commit(); err != nil {
		t.Fatal(err)
	}
	if row, e := client.AccountListing.Get(ctx, second.ID); e != nil || row.State != "published" {
		t.Fatal("unpaid release must relist", e)
	}
	if active, e := client.AccountReservation.Query().Where(accountreservation.ActiveListingIDEQ(second.ID)).Exist(ctx); e != nil || active {
		t.Fatal("released reservation must free the inventory", e)
	}
}

// A sold PLAYORA listing (NULL offer) must not disable the accepted-offer hold
// for every seller: NOT IN with a NULL member is never true.
func TestPlayoraInventoryKeepsSellerPrivacyHold(t *testing.T) {
	f := resaleDraftDB(t, "consignment", false)
	ctx := t.Context()
	client := f.base.auth.client
	f.listing = f.playoraListing(t)
	executeSQL(t, f.base.auth.db, "UPDATE account_listings SET state='sold' WHERE id=?", f.listing.ID)
	// Isolated fixture: the seller's accepted offer has no inventory yet, and its
	// submission conversation is resolved, so only the offer hold remains.
	if _, err := client.AccountListing.Delete().Where(accountlisting.OriginEQ(accountlisting.OriginConsignment)).Exec(ctx); err != nil {
		t.Fatal(err)
	}
	executeSQL(t, f.base.auth.db, "UPDATE conversations SET state='resolved' WHERE user_id=?", f.intake.buyer.User.ID)
	now := func() time.Time { return time.Unix(f.base.auth.clock.Load(), 0) }
	content := sitecontent.New(client, f.base.auth.service, now)
	policy, err := content.Save(ctx, f.base.admin, "retention", sitecontent.Input{Data: retentionData(), Label: "retention-1", Publish: true})
	if err != nil {
		t.Fatal(err)
	}
	s := privacy.New(client, f.base.auth.service, now)
	request, err := s.Request(ctx, f.intake.buyer, privacy.RequestInput{PolicyID: policy.ReleaseID, Accept: true})
	if err != nil {
		t.Fatal(err)
	}
	held, err := s.Update(ctx, f.base.admin, request.ID, true, privacy.Change{Version: request.Version, Action: "review", PolicyID: policy.ReleaseID})
	if err != nil || held.State != "held" {
		t.Fatal("an accepted seller offer without completed inventory must hold erasure", held.State, err)
	}
}
