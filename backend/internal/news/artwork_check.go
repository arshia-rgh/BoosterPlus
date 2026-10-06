package news

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
func checkArtwork(ctx context.Context, c *ent.Client, value Definition) error {
	if err := checkImage(ctx, c, value.Asset, "cover", "asset"); err != nil {
		return err
	}
	for i, b := range value.Blocks {
		if b.Kind == "image" {
			if err := checkImage(ctx, c, b.URL, "inline", fmt.Sprintf("blocks.%d", i)); err != nil {
				return err
			}
		}
	}
	return nil
}
