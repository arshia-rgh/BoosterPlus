package catalog

import (
	"context"
	"errors"
	"fmt"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/artwork"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

func checkImage(ctx context.Context, c *ent.Client, path, purpose, field string) error {
	err := artwork.Check(ctx, c, path, purpose)
	if errors.Is(err, media.ErrInvalid) {
		return &Invalid{[]Issue{{field, "Upload and check artwork for this placement before saving or publishing."}}}
	}
	return err
}
func checkArtwork(ctx context.Context, c *ent.Client, value Configuration) error {
	if err := checkImage(ctx, c, value.Asset, "game", "asset"); err != nil {
		return err
	}
	for i, pack := range value.Packages {
		if err := checkImage(ctx, c, pack.Asset, "product", fmt.Sprintf("packages.%d.asset", i)); err != nil {
			return err
		}
	}
	return nil
}
