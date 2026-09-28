package news

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/articleslug"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

// Change binds lifecycle actions to the editor version and reviewed saved revision.
type Change struct {
	Version    int    `json:"version"`
	RevisionID string `json:"revision_id"`
	At         string `json:"at"`
}

func checkedRevision(ctx context.Context, tx *ent.Tx, row *ent.Article, id string) (*ent.ArticleRevision, Definition, error) {
	r, e := tx.ArticleRevision.Get(ctx, id)
	if e != nil {
		return nil, Definition{}, e
	}
	if r.ArticleID != row.ID {
		return nil, Definition{}, ErrConflict
	}
	d, e := decode(r.Data)
	if e != nil {
		return nil, d, e
	}
	if issues := Validate(d, true); len(issues) > 0 {
		return nil, d, &Invalid{issues}
	}
	g, e := tx.Game.Get(ctx, row.GameID)
	if e != nil {
		return nil, d, e
	}
	if g.Archived {
		return nil, d, ErrConflict
	}
	return r, d, nil
}
func publish(ctx context.Context, tx *ent.Tx, row *ent.Article, revisionID, actor, action string, now time.Time) (*ent.Article, error) {
	_, d, e := checkedRevision(ctx, tx, row, revisionID)
	if e != nil {
		return nil, e
	}
	claim, e := tx.ArticleSlug.Query().Where(articleslug.GameIDEQ(row.GameID), articleslug.SlugEQ(d.Slug)).Only(ctx)
	if ent.IsNotFound(e) {
		_, e = tx.ArticleSlug.Create().SetGameID(row.GameID).SetSlug(d.Slug).SetArticleID(row.ID).SetCreatedAt(now).Save(ctx)
	} else if e == nil && claim.ArticleID != row.ID {
		return nil, &Invalid{[]Issue{{"slug", "This game already reserves that URL for another article."}}}
	}
	if ent.IsConstraintError(e) {
		return nil, ErrConflict
	}
	if e != nil {
		return nil, e
	}
	update := clearSchedule(tx.Article.UpdateOne(row)).AddVersion(1).SetState("published").SetCurrentRevision(revisionID).SetPublicUpdatedAt(now).SetUpdatedAt(now)
	if row.PublishedAt == nil {
		update.SetPublishedAt(now)
	}
	row, e = update.Save(ctx)
	if e != nil {
		return nil, e
	}
	return row, event(ctx, tx, row, actor, action, revisionID, now)
}
func clearSchedule(u *ent.ArticleUpdateOne) *ent.ArticleUpdateOne {
	return u.SetScheduledRevision("").SetScheduleToken("").SetScheduledBy("").SetScheduledAuthVersion(0).ClearScheduledAt()
}

// Change requires recent primary/authenticator verification for every publication mutation.
func (s *Store) Change(ctx context.Context, p *identity.Principal, id, action string, input Change) (out Draft, err error) {
	if input.RevisionID != "" && !validID(input.RevisionID) || !validID(id) || !validVersion(input.Version) || !slices.Contains([]string{"publish", "schedule", "unschedule", "unpublish", "archive", "restore"}, action) {
		return out, ErrInvalid
	}
	var at time.Time
	if action == "schedule" {
		at, err = time.Parse(time.RFC3339, input.At)
		if err != nil || at.Location() != time.UTC || !at.After(s.now().Add(time.Minute)) || at.After(s.now().Add(366*24*time.Hour)) {
			return out, &Invalid{[]Issue{{"at", "Choose a UTC time more than one minute and at most one year ahead."}}}
		}
	} else if input.At != "" {
		return out, ErrInvalid
	}
	err = s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.Article.Get(ctx, id)
		if e != nil {
			return e
		}
		if row.Version != input.Version || input.RevisionID != "" && input.RevisionID != row.DraftRevision {
			return ErrConflict
		}
		now := s.now()
		if action == "publish" || action == "schedule" {
			if row.State == "archived" || input.RevisionID != row.DraftRevision {
				return ErrConflict
			}
			if _, _, e = checkedRevision(ctx, tx, row, input.RevisionID); e != nil {
				return e
			}
		}
		if action == "publish" {
			row, e = publish(ctx, tx, row, input.RevisionID, current.User.ID, "published", now)
		} else {
			u := tx.Article.UpdateOne(row).AddVersion(1).SetUpdatedAt(now)
			switch action {
			case "schedule":
				token := uuid.NewString()
				u.SetState("scheduled").SetScheduledRevision(input.RevisionID).SetScheduleToken(token).SetScheduledBy(current.User.ID).SetScheduledAuthVersion(current.User.AuthVersion).SetScheduledAt(at)
				raw, marshalErr := json.Marshal(scheduleJob{id, token})
				if marshalErr != nil {
					return marshalErr
				}
				jobID, jobErr := jobs.EnqueueEntTx(ctx, tx, "news.publish", "article:"+token, raw)
				if jobErr != nil {
					return jobErr
				}
				if _, jobErr = tx.ExecContext(ctx, "UPDATE jobs SET available_at=? WHERE id=?", at, jobID); jobErr != nil {
					return jobErr
				}
			case "unschedule":
				if row.ScheduledRevision == "" {
					return ErrConflict
				}
				clearSchedule(u)
				if row.CurrentRevision != "" {
					u.SetState("published")
				} else {
					u.SetState("draft")
				}
			case "unpublish":
				if row.CurrentRevision == "" && row.ScheduledRevision == "" {
					return ErrConflict
				}
				clearSchedule(u).SetState("unpublished").SetCurrentRevision("")
			case "archive":
				if row.State == "archived" {
					return ErrConflict
				}
				clearSchedule(u).SetState("archived").SetCurrentRevision("")
			case "restore":
				if row.State != "archived" {
					return ErrConflict
				}
				clearSchedule(u).SetState("draft").SetCurrentRevision("")
			}
			row, e = u.Save(ctx)
			if e == nil {
				e = event(ctx, tx, row, current.User.ID, action, input.RevisionID, now)
			}
		}
		if e != nil {
			return e
		}
		out, e = draft(ctx, tx, row)
		return e
	})
	return out, err
}

type scheduleJob struct {
	ArticleID string `json:"article_id"`
	Token     string `json:"token"`
}

// PublishHandler publishes only the still-current scheduled immutable revision.
func (s *Store) PublishHandler() jobs.Handler {
	return func(ctx context.Context, j jobs.Job) error {
		var input scheduleJob
		if e := json.Unmarshal(j.Payload, &input); e != nil || !validID(input.ArticleID) || !validID(input.Token) {
			return ErrInvalid
		}
		row, e := s.client.Article.Get(ctx, input.ArticleID)
		if ent.IsNotFound(e) {
			return nil
		}
		if e != nil {
			return e
		}
		if row.ScheduleToken != input.Token {
			return nil
		}
		return s.auth.StaffJobTransaction(ctx, row.ScheduledBy, row.ScheduledAuthVersion, func(tx *ent.Tx) error {
			current, err := tx.Article.Get(ctx, row.ID)
			if err != nil {
				return err
			}
			if current.ScheduleToken != input.Token {
				return nil
			}
			if current.State != "scheduled" || current.ScheduledAt == nil || s.now().Before(*current.ScheduledAt) {
				return ErrConflict
			}
			_, err = publish(ctx, tx, current, current.ScheduledRevision, current.ScheduledBy, "scheduled_published", s.now())
			return err
		})
	}
}

// IsUnavailable identifies public non-disclosure without exposing private state.
func IsUnavailable(err error) bool { return ent.IsNotFound(err) || errors.Is(err, ErrConflict) }
