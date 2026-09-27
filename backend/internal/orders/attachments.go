package orders

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/catalog"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

func bindAttachments(ctx context.Context, tx *ent.Tx, p *identity.Principal, row *ent.Order, release catalog.Release, answers catalog.Answers, key string, now time.Time) error {
	ids := []string{}
	for _, service := range release.Configuration.Services {
		if service.Key != row.Service {
			continue
		}
		for _, field := range service.Fields {
			raw := answers[field.Key]
			if field.Type != "attachment" || len(raw) == 0 {
				continue
			}
			var files []string
			if err := json.Unmarshal(raw, &files); err != nil {
				return invalid(field.Key, "Choose a checked image through the private upload control.")
			}
			ids = append(ids, files...)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	err := media.BindIntake(ctx, tx, p, row, key, ids, now)
	if errors.Is(err, media.ErrInvalid) || errors.Is(err, media.ErrConflict) || ent.IsNotFound(err) {
		return invalid("form", "A screenshot is unavailable for this request. Finish its safety check or remove it before submitting. Attach at most four images in total.")
	}
	return err
}
