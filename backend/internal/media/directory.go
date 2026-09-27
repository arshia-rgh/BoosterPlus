package media

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// StaffFile describes lifecycle state without storage paths, signed URLs or file contents.
type StaffFile struct {
	ID             string     `json:"id"`
	UserID         string     `json:"user_id"`
	ConversationID string     `json:"conversation_id"`
	State          string     `json:"state"`
	Bound          bool       `json:"bound"`
	Size           int64      `json:"size"`
	ContentType    string     `json:"content_type"`
	CreatedAt      time.Time  `json:"created_at"`
	ExpiresAt      time.Time  `json:"expires_at"`
	PurgedAt       *time.Time `json:"purged_at"`
}

// StaffFiles is a bounded staff directory page.
type StaffFiles struct {
	Files []StaffFile `json:"files"`
	Next  string      `json:"next"`
}

// Directory never opens private bytes and rechecks staff authority for each page.
func (s *Store) Directory(ctx context.Context, p *identity.Principal, after, userID, state string) (out StaffFiles, err error) {
	out.Files = []StaffFile{}
	for _, v := range []string{after, userID} {
		if v != "" {
			id, e := uuid.Parse(v)
			if e != nil || id.String() != v {
				return out, ErrInvalid
			}
		}
	}
	if state != "" {
		if e := mediafile.StateValidator(mediafile.State(state)); e != nil {
			return out, ErrInvalid
		}
	}
	err = s.auth.AuthorizedTransaction(ctx, p, "admin", false, func(tx *ent.Tx, _ *identity.Principal) error {
		q := tx.MediaFile.Query().Order(ent.Asc(mediafile.FieldID)).Limit(51)
		if after != "" {
			q.Where(mediafile.IDGT(after))
		}
		if userID != "" {
			q.Where(mediafile.UserIDEQ(userID))
		}
		if state != "" {
			q.Where(mediafile.StateEQ(mediafile.State(state)))
		}
		rows, e := q.Select(mediafile.FieldID, mediafile.FieldUserID, mediafile.FieldConversationID, mediafile.FieldState, mediafile.FieldMessageID, mediafile.FieldIntakeOrderID, mediafile.FieldSize, mediafile.FieldContentType, mediafile.FieldCreatedAt, mediafile.FieldExpiresAt, mediafile.FieldPurgedAt).All(ctx)
		if e != nil {
			return e
		}
		if len(rows) > 50 {
			out.Next = rows[49].ID
			rows = rows[:50]
		}
		for _, row := range rows {
			out.Files = append(out.Files, StaffFile{row.ID, row.UserID, row.ConversationID, string(row.State), row.MessageID != nil || row.IntakeOrderID != nil, row.Size, row.ContentType, row.CreatedAt, row.ExpiresAt, row.PurgedAt})
		}
		return nil
	})
	return out, err
}
func managed(ctx context.Context, client *ent.Client, p *identity.Principal, id string, admin bool) (*ent.MediaFile, error) {
	if admin {
		if e := identity.Require(p, "admin"); e != nil {
			return nil, e
		}
		return client.MediaFile.Get(ctx, id)
	}
	return owned(ctx, client, p, id)
}
func (s *Store) registerDirectory(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/admin/media", s.auth.ProtectRate("admin", "media-directory", 120, time.Hour, problem(func(w http.ResponseWriter, r *http.Request, p *identity.Principal) error {
		v, e := s.Directory(r.Context(), p, r.URL.Query().Get("after"), r.URL.Query().Get("customer"), r.URL.Query().Get("state"))
		if e != nil {
			return e
		}
		return write(w, v)
	})))
}
