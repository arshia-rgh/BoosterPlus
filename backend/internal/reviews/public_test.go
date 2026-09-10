package reviews

import (
	"errors"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/review"
)

func TestPublicProjectionRejectsUnpublishedRows(t *testing.T) {
	now := time.Now()
	for _, row := range []*ent.Review{{State: review.StatePending, PublishedAt: &now}, {State: review.StateHidden, PublishedAt: &now}, {State: review.StatePublished}} {
		if _, err := publicView(row, nil, nil); !errors.Is(err, ErrConflict) {
			t.Fatal("unpublished or inconsistent row exposed", err)
		}
	}
}
