//go:build integration

package integration

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/png"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent/authaudit"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/artwork"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/news"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/recovery"
)

// Artwork fixtures use their own database and private object namespace.
func artworkStore(t *testing.T, f *orderFixture) (*artwork.Store, *media.S3) {
	t.Helper()
	objects := mediaObjects(t, f.auth.client)
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		rows, err := f.auth.client.Artwork.Query().All(ctx)
		if err != nil {
			t.Error(err)
			return
		}
		for _, row := range rows {
			for _, name := range []string{"wide", "wide-small", "mobile", "mobile-small", "card", "thumb"} {
				if err = objects.Delete(ctx, "artwork/"+row.ID+"/"+name); err != nil {
					t.Error(err)
				}
			}
		}
	})
	return artwork.New(f.auth.client, f.auth.service, objects, media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"}), objects
}
func uploadArtwork(t *testing.T, f *orderFixture, s *artwork.Store, purpose string) artwork.View {
	t.Helper()
	v, err := s.Upload(t.Context(), f.admin, uuid.NewString(), "image/png", purpose, 50, 50, imageBytes(t))
	if err != nil {
		t.Fatal("artwork upload", err)
	}
	return v
}
func assertArtworkVisible(t *testing.T, s *artwork.Store, v artwork.View, visible bool) {
	t.Helper()
	data, _, err := s.Content(t.Context(), nil, v.ID, "wide", false)
	if visible && (err != nil || len(data) == 0) {
		t.Fatal("published artwork unavailable", err)
	}
	if !visible && !errors.Is(err, media.ErrConflict) {
		t.Fatal("private artwork exposed or unexpected failure", err)
	}
}
func saveArtworkGame(t *testing.T, f *orderFixture, c catalog.Configuration, publish bool) {
	t.Helper()
	var err error
	f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: c})
	if err != nil {
		t.Fatal("save game", err)
	}
	if publish {
		f.game, err = f.catalog.Mutate(t.Context(), f.admin, f.game.ID, "publish", catalog.Change{Revision: f.game.Revision})
		if err != nil {
			t.Fatal("publish game", err)
		}
	}
}
func TestArtworkRealStorageAuthorityRetryAndCatalogPublication(t *testing.T) {
	f := orderDB(t)
	s, objects := artworkStore(t, f)
	ctx := t.Context()
	data := imageBytes(t)
	for _, p := range []*identity.Principal{nil, f.buyer, {User: f.admin.User, Session: f.buyer.Session}} {
		if _, err := s.Upload(ctx, p, uuid.NewString(), "image/png", "game", 50, 50, data); err == nil {
			t.Fatal("unauthorized upload")
		}
	}
	v := uploadArtwork(t, f, s, "game")
	again, err := s.Upload(ctx, f.admin, v.ID, "image/png", "game", 50, 50, data)
	if err != nil || again.Asset != v.Asset {
		t.Fatal("idempotent retry", err)
	}
	for _, change := range []struct {
		purpose string
		x       int
		bytes   []byte
	}{{"cover", 50, data}, {"game", 0, data}, {"game", 50, []byte("other")}} {
		if _, err = s.Upload(ctx, f.admin, v.ID, "image/png", change.purpose, change.x, 50, change.bytes); !errors.Is(err, media.ErrConflict) {
			t.Fatal("changed retry accepted", err)
		}
	}
	archive := filepath.Join(t.TempDir(), "artwork-capture")
	manifest, captureErr := recovery.Capture(ctx, f.auth.db, objects, archive)
	if captureErr != nil || len(manifest.Entries) != len(v.Variants) {
		t.Fatal("artwork recovery coverage", captureErr)
	}
	if restored, restoreErr := recovery.RestoreMedia(ctx, f.auth.db, objects, archive); restoreErr != nil || restored != len(v.Variants) {
		t.Fatal("artwork restore", restoreErr)
	}
	count, err := f.auth.client.AuthAudit.Query().Where(authaudit.ActionEQ("artwork_uploaded"), authaudit.TargetIDEQ(v.ID)).Count(ctx)
	if err != nil || count != 1 {
		t.Fatal("duplicate audit", count, err)
	}
	assertArtworkVisible(t, s, v, false)
	if _, _, err = s.Content(ctx, f.buyer, v.ID, "wide", true); err == nil {
		t.Fatal("customer private preview")
	}
	for name, variant := range v.Variants {
		encoded, actual, readErr := s.Content(ctx, f.admin, v.ID, name, true)
		if readErr != nil || actual != variant || bytes.Contains(encoded, []byte("synthetic metadata")) {
			t.Fatal("private variant", name, readErr)
		}
		decoded, decodeErr := png.Decode(bytes.NewReader(encoded))
		if decodeErr != nil || decoded.Bounds().Dx() != variant.Width || decoded.Bounds().Dy() != variant.Height {
			t.Fatal("variant dimensions", decodeErr)
		}
	}
	c := f.game.Configuration
	c.Asset = v.Asset
	c.AssetAlt = "Synthetic test image"
	saveArtworkGame(t, f, c, false)
	assertArtworkVisible(t, s, v, false)
	saveArtworkGame(t, f, c, true)
	assertArtworkVisible(t, s, v, true)
	c.Asset = "/catalog-assets/game-mlbb-1536.jpg"
	saveArtworkGame(t, f, c, false)
	assertArtworkVisible(t, s, v, true)
	saveArtworkGame(t, f, c, true)
	assertArtworkVisible(t, s, v, false)
	c.Asset = v.Asset
	saveArtworkGame(t, f, c, true)
	original, err := objects.Get(ctx, "artwork/"+v.ID+"/wide")
	if err != nil {
		t.Fatal(err)
	}
	if err = objects.Put(ctx, "artwork/"+v.ID+"/wide", []byte("corrupt"), "image/png"); err != nil {
		t.Fatal(err)
	}
	if _, _, err = s.Content(ctx, nil, v.ID, "wide", false); !errors.Is(err, media.ErrConflict) {
		t.Fatal("corrupt object served", err)
	}
	if err = objects.Put(ctx, "artwork/"+v.ID+"/wide", original, "image/png"); err != nil {
		t.Fatal(err)
	}
	if _, _, err = s.Content(ctx, f.admin, v.ID, "../../wide", true); !errors.Is(err, media.ErrInvalid) {
		t.Fatal("variant traversal", err)
	}
	if _, err = f.catalog.Mutate(ctx, f.admin, f.game.ID, "archive", catalog.Change{Revision: f.game.Revision}); err != nil {
		t.Fatal(err)
	}
	assertArtworkVisible(t, s, v, false)
}

func TestArtworkNewsShopVisibilityAndPurpose(t *testing.T) {
	f := orderDB(t)
	s, _ := artworkStore(t, f)
	ctx := t.Context()
	c := f.game.Configuration
	c.Discovery = &catalog.Discovery{}
	for _, service := range []string{"boost", "accounts", "shop", "news"} {
		c.Discovery.Capabilities = append(c.Discovery.Capabilities, catalog.CapabilityPolicy{Service: service, State: "active"})
	}
	saveArtworkGame(t, f, c, true)
	cover := uploadArtwork(t, f, s, "cover")
	inline := uploadArtwork(t, f, s, "inline")
	product := uploadArtwork(t, f, s, "product")
	bad := c
	bad.Asset = cover.Asset
	bad.AssetAlt = "Wrong purpose"
	if _, err := f.catalog.Mutate(ctx, f.admin, f.game.ID, "save", catalog.Change{Revision: f.game.Revision, Configuration: bad}); err == nil {
		t.Fatal("cover used as game")
	}
	articles := articleStore(f)
	d := articleDefinition()
	d.Asset = cover.Asset
	d.AssetAlt = "Test cover"
	d.AssetSource = "Synthetic test artwork"
	d.Blocks = append(d.Blocks, news.Block{Kind: "image", URL: inline.Asset, Alt: "Test inline", Source: "Synthetic test artwork"})
	row, err := articles.Create(ctx, f.admin, f.game.ID, d)
	if err != nil {
		t.Fatal(err)
	}
	assertArtworkVisible(t, s, cover, false)
	assertArtworkVisible(t, s, inline, false)
	row, err = articles.Change(ctx, f.admin, row.ID, "publish", news.Change{Version: row.Version, RevisionID: row.RevisionID})
	if err != nil {
		t.Fatal(err)
	}
	assertArtworkVisible(t, s, cover, true)
	assertArtworkVisible(t, s, inline, true)
	next := uploadArtwork(t, f, s, "cover")
	d.Asset = next.Asset
	row, err = articles.Save(ctx, f.admin, row.ID, row.Version, d)
	if err != nil {
		t.Fatal(err)
	}
	row, err = articles.Change(ctx, f.admin, row.ID, "schedule", news.Change{Version: row.Version, RevisionID: row.RevisionID, At: time.Unix(f.auth.clock.Load(), 0).Add(time.Hour).UTC().Format(time.RFC3339)})
	if err != nil {
		t.Fatal(err)
	}
	assertArtworkVisible(t, s, cover, true)
	assertArtworkVisible(t, s, next, false)
	row, err = articles.Change(ctx, f.admin, row.ID, "unpublish", news.Change{Version: row.Version})
	if err != nil {
		t.Fatal(err)
	}
	assertArtworkVisible(t, s, cover, false)
	assertArtworkVisible(t, s, inline, false)
	d.Asset = product.Asset
	if _, err = articles.Save(ctx, f.admin, row.ID, row.Version, d); err == nil {
		t.Fatal("wrong purpose editorial asset")
	}
	products := shopStore(f)
	item := shopDefinition()
	item.Asset = product.Asset
	p, err := products.Create(ctx, f.admin, f.game.ID, item)
	if err != nil {
		t.Fatal(err)
	}
	assertArtworkVisible(t, s, product, false)
	p, err = products.Change(ctx, f.admin, p.ID, p.Version, "publish")
	if err != nil {
		t.Fatal(err)
	}
	assertArtworkVisible(t, s, product, true)
	_, err = products.Change(ctx, f.admin, p.ID, p.Version, "pause")
	if err != nil {
		t.Fatal(err)
	}
	assertArtworkVisible(t, s, product, true)
	c.Discovery.Capabilities[2].State = "off"
	saveArtworkGame(t, f, c, true)
	assertArtworkVisible(t, s, product, false)
}

type artworkScanFunc func(context.Context, []byte) error

func (fn artworkScanFunc) Scan(ctx context.Context, b []byte) error { return fn(ctx, b) }

type artworkFaultObjects struct {
	media.Objects
	fail atomic.Bool
}

func (o *artworkFaultObjects) Put(ctx context.Context, k string, b []byte, m string) error {
	if o.fail.Load() {
		return errors.New("fixture storage unavailable")
	}
	return o.Objects.Put(ctx, k, b, m)
}
func TestArtworkFailuresConcurrencyAndRevocation(t *testing.T) {
	f := orderDB(t)
	_, objects := artworkStore(t, f)
	ctx := t.Context()
	data := imageBytes(t)
	scanner := media.Clamd{Network: "tcp", Address: "127.0.0.1:13310"}
	faults := &artworkFaultObjects{Objects: objects}
	faults.fail.Store(true)
	s := artwork.New(f.auth.client, f.auth.service, faults, scanner)
	id := uuid.NewString()
	if _, err := s.Upload(ctx, f.admin, id, "image/png", "cover", 50, 50, data); err == nil {
		t.Fatal("storage failure passed")
	}
	row, err := f.auth.client.Artwork.Get(ctx, id)
	if err != nil || row.State != "failed" {
		t.Fatal("failed state", err)
	}
	faults.fail.Store(false)
	if _, err = s.Upload(ctx, f.admin, id, "image/png", "cover", 50, 50, data); err != nil {
		t.Fatal("retry after failure", err)
	}
	reject := artwork.New(f.auth.client, f.auth.service, objects, artworkScanFunc(func(context.Context, []byte) error { return media.ErrInfected }))
	if _, err = reject.Upload(ctx, f.admin, uuid.NewString(), "image/png", "game", 50, 50, data); !errors.Is(err, media.ErrInfected) {
		t.Fatal("scanner rejection", err)
	}
	unavailable := artwork.New(f.auth.client, f.auth.service, objects, unavailableScanner{})
	if _, err = unavailable.Upload(ctx, f.admin, uuid.NewString(), "image/png", "game", 50, 50, data); err == nil {
		t.Fatal("scanner outage")
	}
	for _, kind := range []string{"image/jpeg", "image/svg+xml"} {
		if _, err = s.Upload(ctx, f.admin, uuid.NewString(), kind, "game", 50, 50, data); !errors.Is(err, media.ErrInvalid) {
			t.Fatal("mime mismatch", err)
		}
	}
	var large bytes.Buffer
	if err = png.Encode(&large, image.NewGray(image.Rect(0, 0, 2001, 2000))); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Upload(ctx, f.admin, uuid.NewString(), "image/png", "game", 50, 50, large.Bytes()); !errors.Is(err, media.ErrInvalid) {
		t.Fatal("pixel limit", err)
	}
	entered, release := make(chan struct{}), make(chan struct{})
	done := make(chan error, 1)
	blocked := artwork.New(f.auth.client, f.auth.service, objects, artworkScanFunc(func(ctx context.Context, _ []byte) error {
		close(entered)
		select {
		case <-release:
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	}))
	go func() {
		_, e := blocked.Upload(ctx, f.admin, uuid.NewString(), "image/png", "game", 50, 50, data)
		done <- e
	}()
	<-entered
	if _, err = blocked.Upload(ctx, f.admin, uuid.NewString(), "image/png", "game", 50, 50, data); !errors.Is(err, identity.ErrLimited) {
		t.Error("concurrent processing unbounded", err)
	}
	_, err = f.auth.client.User.UpdateOneID(f.admin.User.ID).SetSuspended(true).Save(ctx)
	if err != nil {
		t.Error(err)
	}
	close(release)
	if err = <-done; err == nil {
		t.Fatal("revoked authority completed upload")
	}
}
