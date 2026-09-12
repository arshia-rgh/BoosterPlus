package payments

import (
	"context"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/paymentsettings"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
)

func published(ctx context.Context, client *ent.Client) (*PolicyView, error) {
	settings, err := client.PaymentSettings.Get(ctx, 1)
	if err != nil {
		return nil, err
	}
	if settings.PublishedID == "" {
		return nil, nil
	}
	row, err := client.PaymentPolicy.Get(ctx, settings.PublishedID)
	if err != nil {
		return nil, err
	}
	data, err := decode[Policy](row.Data)
	if err != nil {
		return nil, err
	}
	return &PolicyView{row.ID, data}, nil
}

// Settings requires staff authority; it never exposes provider keys or account passwords.
func (s *Store) Settings(ctx context.Context, p *identity.Principal) (Settings, error) {
	if err := identity.Require(p, "admin"); err != nil {
		return Settings{}, err
	}
	return s.settings(ctx, s.client)
}
func (s *Store) settings(ctx context.Context, client *ent.Client) (Settings, error) {
	row, err := client.PaymentSettings.Get(ctx, 1)
	if err != nil {
		return Settings{}, err
	}
	draft, err := decode[Policy](row.Draft)
	if err != nil {
		return Settings{}, err
	}
	policy, err := published(ctx, client)
	if err != nil {
		return Settings{}, err
	}
	if draft.Routes == nil {
		draft.Routes = []Route{}
	}
	if draft.Currencies == nil {
		draft.Currencies = []string{}
	}
	return Settings{row.Version, draft, policy, s.provider != nil, s.enabled && s.provider != nil}, nil
}

// SavePolicy preserves every published agreement. Publishing requires recent staff factors.
func (s *Store) SavePolicy(ctx context.Context, p *identity.Principal, input PolicyInput) (Settings, error) {
	if input.Version < 1 || input.Version >= maxVersion || (input.Action != "save" && input.Action != "publish") || validatePolicy(input.Data) != nil || validateRemedies(input.Data.Remedies) != nil {
		return Settings{}, ErrInvalid
	}
	var result Settings
	err := s.auth.StaffTransaction(ctx, p, true, func(tx *ent.Tx, current *identity.Principal) error {
		row, err := tx.PaymentSettings.Get(ctx, 1)
		if err != nil {
			return err
		}
		if row.Version != input.Version {
			return ErrConflict
		}
		doc, err := document(input.Data)
		if err != nil {
			return err
		}
		update := tx.PaymentSettings.Update().Where(paymentsettings.IDEQ(1), paymentsettings.VersionEQ(input.Version)).AddVersion(1).SetDraft(doc).SetUpdatedAt(s.instant())
		if input.Action == "publish" {
			policy, createErr := tx.PaymentPolicy.Create().SetData(doc).SetCreatedBy(current.User.ID).SetCreatedAt(s.instant()).Save(ctx)
			if createErr != nil {
				return createErr
			}
			update.SetPublishedID(policy.ID)
		}
		count, err := update.Save(ctx)
		if err != nil {
			return err
		}
		if count != 1 {
			return ErrConflict
		}
		if err = s.audit(ctx, tx, current, "policy_"+input.Action, "checkout"); err != nil {
			return err
		}
		result, err = s.settings(ctx, tx.Client())
		return err
	})
	return result, err
}
