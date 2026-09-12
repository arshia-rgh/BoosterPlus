package sitecontent

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/siterelease"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

// Store uses live identity authorization and explicit immutable releases.
type Store struct {
	client *ent.Client
	auth   *identity.Service
	now    func() time.Time
}

// New constructs the content store without seeding policy or performing DDL.
func New(client *ent.Client, auth *identity.Service, now func() time.Time) *Store {
	if now == nil {
		now = time.Now
	}
	return &Store{client, auth, now}
}

// View is an editorial revision without actor or private identity data.
type View struct {
	Kind      string         `json:"kind"`
	Version   int            `json:"version"`
	ReleaseID string         `json:"release_id"`
	Label     string         `json:"label"`
	Data      map[string]any `json:"data"`
	UpdatedAt time.Time      `json:"updated_at"`
}

// Input binds a draft save or publication to the current working revision.
type Input struct {
	Version int            `json:"version"`
	Label   string         `json:"label"`
	Data    map[string]any `json:"data"`
	Publish bool           `json:"publish"`
}

func capability(kind string) string {
	if kind == "home" || kind == "notifications" {
		return "admin"
	}
	return "owner"
}
func validKind(kind string) bool {
	return kind == "home" || kind == "legal" || kind == "retention" || kind == "notifications"
}

// Published returns only a validated immutable published release, or an explicit empty unpublished view.
func Published(ctx context.Context, client *ent.Client, kind string) (View, error) {
	out := View{Kind: kind, Data: map[string]any{}}
	if !validKind(kind) {
		return out, ErrInvalid
	}
	row, e := client.SiteSetting.Get(ctx, kind)
	if ent.IsNotFound(e) {
		return out, nil
	}
	if e != nil {
		return out, e
	}
	if row.CurrentRelease == "" {
		return out, nil
	}
	release, e := client.SiteRelease.Get(ctx, row.CurrentRelease)
	if e != nil {
		return out, e
	}
	if release.Kind != kind {
		return out, ErrConflict
	}
	if e = validate(kind, release.Data); e != nil {
		return out, e
	}
	return View{kind, release.Version, release.ID, release.Label, release.Data, release.CreatedAt}, nil
}

// Public serves published text only; draft retention and operator information remain private.
func (s *Store) Public(ctx context.Context, kind string) (View, error) {
	return Published(ctx, s.client, kind)
}

// Draft requires the relevant current staff role.
func (s *Store) Draft(ctx context.Context, p *identity.Principal, kind string) (out View, err error) {
	if !validKind(kind) {
		return out, ErrInvalid
	}
	err = s.auth.AuthorizedTransaction(ctx, p, capability(kind), false, func(tx *ent.Tx, _ *identity.Principal) error {
		out = View{Kind: kind, Data: map[string]any{}}
		row, e := tx.SiteSetting.Get(ctx, kind)
		if ent.IsNotFound(e) {
			return nil
		}
		if e != nil {
			return e
		}
		out = View{kind, row.Version, row.CurrentRelease, "", row.Draft, row.UpdatedAt}
		return nil
	})
	return out, err
}

// Save audits draft edits and publication; stale editors cannot replace newer policy.
func (s *Store) Save(ctx context.Context, p *identity.Principal, kind string, input Input) (out View, err error) {
	if !validKind(kind) || input.Version < 0 || input.Version >= 2147483645 {
		return out, ErrInvalid
	}
	if err = validate(kind, input.Data); err != nil {
		return out, err
	}
	if input.Publish && (!labelPattern.MatchString(input.Label) || kind == "legal" && input.Label == s.auth.BootstrapTermsVersion()) {
		return out, ErrInvalid
	}
	err = s.auth.AuthorizedTransaction(ctx, p, capability(kind), input.Publish, func(tx *ent.Tx, current *identity.Principal) error {
		row, e := tx.SiteSetting.Get(ctx, kind)
		if ent.IsNotFound(e) {
			if input.Version != 0 {
				return ErrConflict
			}
			row, e = tx.SiteSetting.Create().SetID(kind).SetVersion(1).SetDraft(input.Data).SetUpdatedAt(s.now()).Save(ctx)
		} else if e == nil {
			if row.Version != input.Version {
				return ErrConflict
			}
			row, e = tx.SiteSetting.UpdateOne(row).AddVersion(1).SetDraft(input.Data).SetUpdatedAt(s.now()).Save(ctx)
		}
		if e != nil {
			return e
		}
		action := "content_draft_saved"
		label := ""
		if input.Publish {
			release, createErr := tx.SiteRelease.Create().SetKind(kind).SetVersion(row.Version).SetLabel(input.Label).SetData(input.Data).SetCreatedBy(current.User.ID).SetCreatedAt(s.now()).Save(ctx)
			if ent.IsConstraintError(createErr) {
				return ErrConflict
			}
			if createErr != nil {
				return createErr
			}
			row, e = tx.SiteSetting.UpdateOne(row).SetCurrentRelease(release.ID).Save(ctx)
			if e != nil {
				return e
			}
			action = "content_published"
			label = input.Label
		}
		_, e = tx.AuthAudit.Create().SetID(uuid.NewString()).SetActorID(current.User.ID).SetAction(action).SetTargetID(kind).SetCreatedAt(s.now()).SetMetadata(map[string]string{"release_id": row.CurrentRelease}).Save(ctx)
		if e != nil {
			return e
		}
		out = View{kind, row.Version, row.CurrentRelease, label, row.Draft, row.UpdatedAt}
		return nil
	})
	return out, err
}

// History exposes bounded immutable policy/content revisions with no private actor metadata.
func (s *Store) History(ctx context.Context, p *identity.Principal, kind, after string) (out []View, err error) {
	out = []View{}
	if !validKind(kind) {
		return out, ErrInvalid
	}
	if after != "" {
		id, e := uuid.Parse(after)
		if e != nil || id.String() != after {
			return out, ErrInvalid
		}
	}
	err = s.auth.AuthorizedTransaction(ctx, p, capability(kind), false, func(tx *ent.Tx, _ *identity.Principal) error {
		q := tx.SiteRelease.Query().Where(siterelease.KindEQ(kind)).Order(ent.Asc(siterelease.FieldID)).Limit(50)
		if after != "" {
			q.Where(siterelease.IDGT(after))
		}
		rows, e := q.All(ctx)
		if e != nil {
			return e
		}
		for _, v := range rows {
			out = append(out, View{v.Kind, v.Version, v.ID, v.Label, v.Data, v.CreatedAt})
		}
		return nil
	})
	return out, err
}

// Version preserves access to a previously published agreement; private drafts never appear here.
func (s *Store) Version(ctx context.Context, kind, label string) (View, error) {
	if !validKind(kind) || !labelPattern.MatchString(label) {
		return View{}, ErrInvalid
	}
	release, e := s.client.SiteRelease.Query().Where(siterelease.KindEQ(kind), siterelease.LabelEQ(label)).Only(ctx)
	if e != nil {
		return View{}, e
	}
	if e = validate(kind, release.Data); e != nil {
		return View{}, e
	}
	return View{kind, release.Version, release.ID, release.Label, release.Data, release.CreatedAt}, nil
}
