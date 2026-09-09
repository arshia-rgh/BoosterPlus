package jobs

import (
	"context"
	"errors"
	"log/slog"
	"time"
)

// Handler executes idempotent effects, honoring context cancellation.
type Handler func(context.Context, Job) error

// Run processes jobs until cancellation, renewing leases while handlers run.
func Run(ctx context.Context, store *Store, handlers map[string]Handler, logger *slog.Logger) error {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		if ctx.Err() != nil {
			return nil
		}
		job, err := store.Claim(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return err
		}
		if job == nil {
			select {
			case <-ctx.Done():
				return nil
			case <-ticker.C:
				continue
			}
		}
		handler, ok := handlers[job.Kind]
		if !ok {
			handler = func(context.Context, Job) error { return errors.New("unsupported job kind") }
		}
		if err := execute(ctx, store, job, handler); err != nil {
			logger.ErrorContext(ctx, "job processing failed", "job_id", job.ID, "kind", job.Kind)
		}
	}
}

func execute(ctx context.Context, store *Store, job *Job, handler Handler) error {
	work, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()
	heartbeatDone := make(chan error, 1)
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-work.Done():
				heartbeatDone <- nil
				return
			case <-ticker.C:
				if err := store.Renew(work, job); err != nil {
					cancel()
					heartbeatDone <- err
					return
				}
			}
		}
	}()
	handlerErr := invoke(work, *job, handler)
	cancel()
	leaseErr := <-heartbeatDone
	if ctx.Err() != nil {
		return ctx.Err()
	} // Let the lease expire so another process can retry.
	if leaseErr != nil {
		return leaseErr
	}
	if handlerErr != nil {
		return errors.Join(handlerErr, store.Fail(ctx, job))
	}
	return store.Complete(ctx, job)
}

// A faulty handler must fail/retry its job without killing the process or logging secrets.
func invoke(ctx context.Context, job Job, handler Handler) (result error) {
	defer func() {
		if recover() != nil {
			result = errors.New("job handler panicked")
		}
	}()
	return handler(ctx, job)
}
