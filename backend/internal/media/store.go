package media

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/conversation"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/communication"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

// Store shares transactional authorization while keeping network I/O outside locks.
type Store struct {
	client  *ent.Client
	auth    *identity.Service
	objects Objects
	scanner Scanner
	now     func() time.Time
}

// New requires private storage and a fail-closed scanner.
func New(client *ent.Client, auth *identity.Service, objects Objects, scanner Scanner) *Store {
	return &Store{client, auth, objects, scanner, time.Now}
}
func capFor(admin bool) string {
	if admin {
		return "admin"
	}
	return "self"
}
func member(ctx context.Context, client *ent.Client, p *identity.Principal, id string, admin bool) error {
	if err := identity.Require(p, capFor(admin)); err != nil {
		return err
	}
	row, err := client.Conversation.Get(ctx, id)
	if err != nil {
		return err
	}
	if !admin && row.UserID != p.User.ID && row.Kind != conversation.KindFulfillment {
		return &ent.NotFoundError{}
	}
	return communication.Member(ctx, client, p, row, admin)
}
func audit(ctx context.Context, tx *ent.Tx, p *identity.Principal, id, action string, now time.Time) error {
	_, err := tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(p.User.ID).SetAction(action).SetTargetID(id).SetMetadata(map[string]string{}).SetCreatedAt(now).Save(ctx)
	return err
}

// Create atomically reserves quota and immutable bytes for an idempotent intent.
func (s *Store) Create(ctx context.Context, p *identity.Principal, admin bool, input Intent) (View, error) {
	key, err := uuid.Parse(input.RequestKey)
	hash, hashErr := hex.DecodeString(input.Checksum)
	if err != nil || key.String() != input.RequestKey || hashErr != nil || len(hash) != 32 || hex.EncodeToString(hash) != input.Checksum || input.Size < 1 || input.Size > MaxBytes || (input.ContentType != "image/png" && input.ContentType != "image/jpeg" && input.ContentType != "image/webp") || (input.Visibility != "public" && input.Visibility != "internal") {
		return View{}, ErrInvalid
	}
	if err = validIntakeScope(p, admin, input); err != nil {
		return View{}, err
	}
	if !admin && input.Visibility == "internal" {
		return View{}, identity.ErrForbidden
	}
	raw, err := json.Marshal(input)
	if err != nil {
		return View{}, err
	}
	digest := s.auth.RequestDigest("media-intent", raw)
	var result View
	err = s.auth.AuthorizedTransaction(ctx, p, capFor(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		if input.IntakeKey == "" {
			if e := member(ctx, tx.Client(), current, input.ConversationID, admin); e != nil {
				return e
			}
		} else if e := validIntakeScope(current, admin, input); e != nil {
			return e
		}
		old, e := tx.MediaFile.Query().Where(mediafile.UserIDEQ(current.User.ID), mediafile.RequestKeyEQ(input.RequestKey)).Only(ctx)
		if e == nil {
			if old.RequestHash != digest {
				return ErrConflict
			}
			result = view(old)
			return nil
		}
		if !ent.IsNotFound(e) {
			return e
		}
		rows, e := tx.MediaFile.Query().Where(mediafile.UserIDEQ(current.User.ID), mediafile.StateNEQ(mediafile.StateDeleted)).Select(mediafile.FieldSize, mediafile.FieldMessageID, mediafile.FieldIntakeOrderID).All(ctx)
		if e != nil {
			return e
		}
		var total int64
		pending := 0
		for _, r := range rows {
			total += r.Size
			if r.MessageID == nil && r.IntakeOrderID == nil {
				pending++
			}
		}
		if total+input.Size > 100<<20 || pending >= 20 || len(rows) >= 1000 {
			return identity.ErrLimited
		}
		scopeQuery := tx.MediaFile.Query().Where(mediafile.ConversationIDEQ(input.ConversationID), mediafile.VisibilityEQ(mediafile.Visibility(input.Visibility)), mediafile.StateNEQ(mediafile.StateDeleted))
		if input.IntakeKey != "" {
			scopeQuery.Where(mediafile.UserIDEQ(current.User.ID), mediafile.IntakeKeyEQ(input.IntakeKey))
		}
		scope, e := scopeQuery.Select(mediafile.FieldSize).All(ctx)
		if e != nil {
			return e
		}
		var scopeBytes int64
		for _, r := range scope {
			scopeBytes += r.Size
		}
		if len(scope) >= 100 || scopeBytes+input.Size > 100<<20 {
			return identity.ErrLimited
		}

		now := s.now().UTC()
		row, e := tx.MediaFile.Create().SetUserID(current.User.ID).SetConversationID(input.ConversationID).SetIntakeKey(input.IntakeKey).SetVisibility(mediafile.Visibility(input.Visibility)).SetRequestKey(input.RequestKey).SetRequestHash(digest).SetChecksum(input.Checksum).SetSize(input.Size).SetContentType(input.ContentType).SetExpiresAt(now.Add(24 * time.Hour)).SetCreatedAt(now).SetUpdatedAt(now).Save(ctx)
		if e != nil {
			return e
		}
		result = view(row)
		return audit(ctx, tx, current, row.ID, "media_intent", now)
	})
	return result, err
}
func owned(ctx context.Context, client *ent.Client, p *identity.Principal, id string) (*ent.MediaFile, error) {
	return client.MediaFile.Query().Where(mediafile.IDEQ(id), mediafile.UserIDEQ(p.User.ID)).Only(ctx)
}

// Upload accepts only the originally declared bytes; concurrent retries cannot
// replace content while the worker scans or after a message references it.
func (s *Store) Upload(ctx context.Context, p *identity.Principal, id string, admin bool, data []byte) error {
	current, err := s.auth.Recheck(ctx, p, capFor(admin))
	if err != nil {
		return err
	}
	row, err := owned(ctx, s.client, current, id)
	if err != nil {
		return err
	}
	if err = fileMember(ctx, s.client, current, row, admin); err != nil {
		return err
	}
	if row.State != mediafile.StatePending && row.State != mediafile.StateUploaded || !row.ExpiresAt.After(s.now()) {
		return ErrConflict
	}
	hash := sha256.Sum256(data)
	if len(data) > MaxBytes || int64(len(data)) != row.Size || hex.EncodeToString(hash[:]) != row.Checksum {
		return ErrInvalid
	}
	if err = s.objects.Put(ctx, "quarantine/"+row.ID, data, row.ContentType); err != nil {
		return err
	}
	return s.auth.AuthorizedTransaction(ctx, p, capFor(admin), false, func(tx *ent.Tx, live *identity.Principal) error {
		r, e := owned(ctx, tx.Client(), live, id)
		if e != nil {
			return e
		}
		if e = fileMember(ctx, tx.Client(), live, r, admin); e != nil {
			return e
		}
		if !r.ExpiresAt.After(s.now()) || r.State != mediafile.StatePending && r.State != mediafile.StateUploaded {
			return ErrConflict
		}
		_, e = tx.MediaFile.UpdateOneID(id).SetState(mediafile.StateUploaded).SetUpdatedAt(s.now()).Save(ctx)
		return e
	})
}

// Finalize queues a reference-only scan job in the same transaction as its state.
func (s *Store) Finalize(ctx context.Context, p *identity.Principal, id string, admin bool) (View, error) {
	var result View
	err := s.auth.AuthorizedTransaction(ctx, p, capFor(admin), false, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := owned(ctx, tx.Client(), current, id)
		if e != nil {
			return e
		}
		if e = fileMember(ctx, tx.Client(), current, row, admin); e != nil {
			return e
		}
		if !row.ExpiresAt.After(s.now()) {
			return ErrConflict
		}
		if row.State == mediafile.StateQueued || row.State == mediafile.StateReady {
			result = view(row)
			return nil
		}
		if row.State != mediafile.StateUploaded {
			return ErrConflict
		}
		row, e = tx.MediaFile.UpdateOneID(id).SetState(mediafile.StateQueued).SetUpdatedAt(s.now()).Save(ctx)
		if e != nil {
			return e
		}
		raw, e := json.Marshal(map[string]string{"media_id": id})
		if e != nil {
			return e
		}
		if _, e = jobs.EnqueueEntTx(ctx, tx, "media.scan", "media:"+id, raw); e != nil {
			return e
		}
		result = view(row)
		return nil
	})
	return result, err
}
func (s *Store) allowed(ctx context.Context, p *identity.Principal, id string, admin bool) (*ent.MediaFile, error) {
	current, err := s.auth.Recheck(ctx, p, capFor(admin))
	if err != nil {
		return nil, err
	}
	q := s.client.MediaFile.Query().Where(mediafile.IDEQ(id), mediafile.StateNEQ(mediafile.StateDeleted))
	if !admin {
		q.Where(mediafile.VisibilityEQ(mediafile.VisibilityPublic))
	}
	row, err := q.Only(ctx)
	if err != nil {
		return nil, err
	}
	if row.MessageID == nil && row.IntakeOrderID == nil && row.UserID != current.User.ID {
		return nil, &ent.NotFoundError{}
	}
	if err = fileMember(ctx, s.client, current, row, admin); err != nil {
		return nil, err
	}
	return row, nil
}

// Get returns scoped lifecycle metadata, never quarantined content.
func (s *Store) Get(ctx context.Context, p *identity.Principal, id string, admin bool) (View, error) {
	row, err := s.allowed(ctx, p, id, admin)
	if err != nil {
		return View{}, err
	}
	result := view(row)
	if row.State == mediafile.StateQueued {
		failed, e := s.failed(ctx, id)
		if e != nil {
			return View{}, e
		}
		if failed {
			result.State = "scan_failed"
		}
	}
	return result, nil
}

// Grant signs a one-minute, session-bound URL; each use still checks live access.
func (s *Store) Grant(ctx context.Context, p *identity.Principal, id string, admin bool) (string, error) {
	row, err := s.allowed(ctx, p, id, admin)
	if err != nil {
		return "", err
	}
	if row.State != mediafile.StateReady {
		return "", ErrConflict
	}
	expires := strconv.FormatInt(s.now().Add(time.Minute).Unix(), 10)
	signature := s.auth.RequestDigest("media-download", []byte(p.Session.ID+":"+id+":"+expires))
	base := "/api/v1/media/"
	if admin {
		base = "/api/v1/admin/media/"
	}
	context := ""
	if !admin {
		context = "&portal=" + p.Session.Portal
	}
	return base + id + "/content?expires=" + expires + "&signature=" + signature + context, nil
}

// Content never returns quarantine keys or bytes, even with a valid signature.
func (s *Store) Content(ctx context.Context, p *identity.Principal, id string, admin bool, expires, signature string) ([]byte, string, error) {
	if err := identity.Require(p, capFor(admin)); err != nil {
		return nil, "", err
	}
	end, err := strconv.ParseInt(expires, 10, 64)
	now := s.now().Unix()
	expected := s.auth.RequestDigest("media-download", []byte(p.Session.ID+":"+id+":"+expires))
	if err != nil || end <= now || end > now+60 || subtle.ConstantTimeCompare([]byte(signature), []byte(expected)) != 1 {
		return nil, "", identity.ErrForbidden
	}
	row, err := s.allowed(ctx, p, id, admin)
	if err != nil {
		return nil, "", err
	}
	if row.State != mediafile.StateReady {
		return nil, "", ErrConflict
	}
	data, err := s.objects.Get(ctx, "clean/"+row.ID)
	if err != nil {
		return nil, "", err
	}
	hash := sha256.Sum256(data)
	if int64(len(data)) != row.CleanSize || hex.EncodeToString(hash[:]) != row.CleanChecksum {
		return nil, "", ErrInvalid
	}
	if _, err = s.allowed(ctx, p, id, admin); err != nil {
		return nil, "", err
	}
	return data, row.CleanContentType, nil
}

// Bind joins uploaded images to one message under the caller's fenced transaction.
func Bind(ctx context.Context, tx *ent.Tx, p *identity.Principal, conversationID, visibility, messageID string, ids []string) error {
	if len(ids) > 4 {
		return ErrInvalid
	}
	seen := map[string]bool{}
	for _, id := range ids {
		if seen[id] {
			return ErrInvalid
		}
		seen[id] = true
		row, err := owned(ctx, tx.Client(), p, id)
		if err != nil {
			return err
		}
		if row.IntakeKey != "" || row.IntakeOrderID != nil || row.ConversationID != conversationID || string(row.Visibility) != visibility || row.State != mediafile.StateReady || row.MessageID != nil || !row.ExpiresAt.After(time.Now()) {
			return ErrConflict
		}
		if _, err = tx.MediaFile.UpdateOneID(id).SetMessageID(messageID).Save(ctx); err != nil {
			return err
		}
	}
	return nil
}
