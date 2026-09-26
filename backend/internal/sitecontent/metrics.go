package sitecontent

import (
	"context"
	"net/http"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/identity"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/publicmetrics"
)

// Metrics uses the explicitly published home policy, never the editable draft.
func (s *Store) Metrics(ctx context.Context) ([]publicmetrics.Metric, error) {
	ctx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()
	view, err := s.Public(ctx, "home")
	if err != nil {
		return nil, err
	}
	var home Home
	if view.ReleaseID != "" {
		if err = decode(view.Data, &home); err != nil {
			return nil, err
		}
	}
	return publicmetrics.Read(ctx, s.client, home.Metrics, "", s.now()), nil
}

func (s *Store) metrics(w http.ResponseWriter, r *http.Request, _ *identity.Principal) error {
	w.Header().Set("Cache-Control", "no-store")
	metrics, err := s.Metrics(r.Context())
	if err != nil {
		return failure(w, err)
	}
	return write(w, map[string]any{"metrics": metrics})
}
