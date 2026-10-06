package artwork

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"regexp"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	art "github.com/arshia-rgh/BoosterPlus/backend/ent/artwork"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

var localPath = regexp.MustCompile(`^/catalog-assets/[a-z0-9][a-z0-9_-]{0,79}\.(png|jpg|webp|avif|svg)$`)
var uploadedPath = regexp.MustCompile(`^/api/v1/artwork/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/wide$`)

// ValidPath accepts bundled artwork or canonical checked uploads only.
func ValidPath(path string) bool {
	return localPath.MatchString(path) || uploadedPath.MatchString(path)
}

// Check prevents a draft or publication from referencing incomplete/wrong-purpose uploads.
func Check(ctx context.Context, c *ent.Client, path, purpose string) error {
	if path == "" || localPath.MatchString(path) {
		return nil
	}
	match := uploadedPath.FindStringSubmatch(path)
	if match == nil {
		return media.ErrInvalid
	}
	found, err := c.Artwork.Query().Where(art.IDEQ(match[1]), art.StateEQ("ready"), art.PurposeEQ(purpose)).Exist(ctx)
	if err != nil {
		return err
	}
	if !found {
		return media.ErrInvalid
	}
	return nil
}

// Store keeps bounded processing and I/O outside authorization transactions.
type Store struct {
	client  *ent.Client
	auth    *identity.Service
	objects media.Objects
	scanner media.Scanner
	slots   chan struct{}
}

// New creates an artwork service without migrations or automatic publication.
func New(c *ent.Client, a *identity.Service, o media.Objects, s media.Scanner) *Store {
	return &Store{c, a, o, s, make(chan struct{}, 1)}
}

// View contains checked dimensions and paths, never original filenames/object keys.
type View struct {
	ID       string             `json:"id"`
	Asset    string             `json:"asset"`
	Purpose  string             `json:"purpose"`
	Width    int                `json:"width"`
	Height   int                `json:"height"`
	FocusX   int                `json:"focus_x"`
	FocusY   int                `json:"focus_y"`
	Variants map[string]Variant `json:"variants"`
}

func projection(row *ent.Artwork) (View, error) {
	data, err := json.Marshal(row.Variants)
	if err != nil {
		return View{}, err
	}
	variants := map[string]Variant{}
	if err = json.Unmarshal(data, &variants); err != nil {
		return View{}, err
	}
	return View{row.ID, "/api/v1/artwork/" + row.ID + "/wide", row.Purpose, row.Width, row.Height, row.FocusX, row.FocusY, variants}, nil
}

// Upload is idempotent for an exact owner/request ID/payload/options tuple.
func (s *Store) Upload(ctx context.Context, p *identity.Principal, id, kind, purpose string, x, y int, data []byte) (out View, result error) {
	parsed, err := uuid.Parse(id)
	if err != nil || parsed.String() != id || len(data) == 0 || len(data) > media.MaxBytes || len(shapes(purpose)) == 0 || x < 0 || x > 100 || y < 0 || y > 100 {
		return out, media.ErrInvalid
	}
	select {
	case s.slots <- struct{}{}:
		defer func() { <-s.slots }()
	default:
		return out, identity.ErrLimited
	}
	ctx, cancel := context.WithTimeout(ctx, 55*time.Second)
	defer cancel()
	hash := sha256.Sum256(data)
	fingerprint := s.auth.RequestDigest("artwork", []byte(fmt.Sprintf("%s:%s:%d:%d:%x", kind, purpose, x, y, hash)))
	var row *ent.Artwork
	ready := false
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, err = tx.Artwork.Get(ctx, id)
		if ent.IsNotFound(err) {
			row, err = tx.Artwork.Create().SetID(id).SetUserID(current.User.ID).SetRequestHash(fingerprint).SetPurpose(purpose).SetFocusX(x).SetFocusY(y).SetVariants(map[string]any{}).Save(ctx)
			return err
		}
		if err != nil {
			return err
		}
		if row.UserID != current.User.ID || row.RequestHash != fingerprint {
			return media.ErrConflict
		}
		if row.State == "ready" {
			ready = true
			return nil
		}
		if row.State != "failed" && (row.State != "processing" || !row.UpdatedAt.Before(time.Now().Add(-2*time.Minute))) {
			return media.ErrConflict
		}
		row, err = tx.Artwork.UpdateOne(row).SetState("processing").SetUpdatedAt(time.Now()).Save(ctx)
		return err
	})
	if err != nil {
		return out, err
	}
	if ready {
		return projection(row)
	}
	defer func() {
		if result == nil {
			return
		}
		cleanup, stop := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
		defer stop()
		_, e := s.client.Artwork.Update().Where(art.IDEQ(id), art.StateEQ("processing")).SetState("failed").SetUpdatedAt(time.Now()).Save(cleanup)
		result = errors.Join(result, e)
	}()
	// Check bounded decode headers before the scanner or any pixel allocation.
	cfg, format, decodeErr := image.DecodeConfig(bytes.NewReader(data))
	if decodeErr != nil || cfg.Width < 1 || cfg.Height < 1 || cfg.Width > 4096 || cfg.Height > 4096 || int64(cfg.Width)*int64(cfg.Height) > 4000000 || (format != "jpeg" && format != "png" && format != "webp") || kind != "image/"+format || animated(data, format) {
		return out, media.ErrInvalid
	}
	if err = s.scanner.Scan(ctx, data); err != nil {
		return out, err
	}
	variants, width, height, err := render(data, kind, purpose, x, y)
	if err != nil {
		return out, err
	}
	metadata := map[string]Variant{}
	for name, v := range variants {
		if err = s.objects.Put(ctx, "artwork/"+id+"/"+name, v.Data, v.ContentType); err != nil {
			return out, err
		}
		metadata[name] = v.Variant
	}
	raw, err := json.Marshal(metadata)
	if err != nil {
		return out, err
	}
	values := map[string]any{}
	if err = json.Unmarshal(raw, &values); err != nil {
		return out, err
	}
	err = s.auth.StaffTransaction(ctx, p, false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.Artwork.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.State != "processing" || row.UserID != current.User.ID {
			return media.ErrConflict
		}
		row, e = tx.Artwork.UpdateOne(row).SetState("ready").SetWidth(width).SetHeight(height).SetVariants(values).SetUpdatedAt(time.Now()).Save(ctx)
		if e != nil {
			return e
		}
		_, e = tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(current.User.ID).SetActorReference(current.User.ID).SetAction("artwork_uploaded").SetCreatedAt(time.Now()).SetTargetID(id).SetMetadata(map[string]string{"purpose": purpose}).Save(ctx)
		if e != nil {
			return e
		}
		out, e = projection(row)
		return e
	})
	return out, err
}

// Content rechecks access after storage I/O; draft/private source bytes never leak.
func (s *Store) Content(ctx context.Context, p *identity.Principal, id, name string, admin bool) ([]byte, Variant, error) {
	if parsed, e := uuid.Parse(id); e != nil || parsed.String() != id {
		return nil, Variant{}, media.ErrInvalid
	}
	row, e := s.client.Artwork.Get(ctx, id)
	if e != nil {
		return nil, Variant{}, e
	}
	if row.State != "ready" {
		return nil, Variant{}, media.ErrConflict
	}
	view, e := projection(row)
	if e != nil {
		return nil, Variant{}, e
	}
	v, ok := view.Variants[name]
	if !ok || (v.ContentType != "image/jpeg" && v.ContentType != "image/png") {
		return nil, v, media.ErrInvalid
	}
	access := func() error {
		if admin {
			_, err := s.auth.Recheck(ctx, p, "admin")
			return err
		}
		return s.public(ctx, view.Asset)
	}
	if e = access(); e != nil {
		return nil, v, e
	}
	data, e := s.objects.Get(ctx, "artwork/"+id+"/"+name)
	if e != nil {
		return nil, v, e
	}
	hash := sha256.Sum256(data)
	if len(data) != v.Size || hex.EncodeToString(hash[:]) != v.Checksum {
		return nil, v, media.ErrConflict
	}
	if e = access(); e != nil {
		return nil, v, e
	}
	return data, v, nil
}
