package shop

import (
	"context"
	"errors"

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
func checkArtwork(ctx context.Context, c *ent.Client, value Definition) error {
	return checkImage(ctx, c, value.Asset, "product", "asset")
}
