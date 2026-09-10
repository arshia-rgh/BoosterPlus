package media

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/ent/mediafile"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/jobs"
)

// ScanHandler promotes only the scanned, sanitized bytes to a separate clean key.
func (s *Store) ScanHandler() jobs.Handler {
	return func(ctx context.Context, job jobs.Job) error {
		var input struct {
			ID string `json:"media_id"`
		}
		if err := json.Unmarshal(job.Payload, &input); err != nil || input.ID == "" {
			return ErrInvalid
		}
		row, err := s.client.MediaFile.Get(ctx, input.ID)
		if ent.IsNotFound(err) {
			return nil
		}
		if err != nil {
			return err
		}
		if row.State != mediafile.StateQueued {
			return nil
		}
		if !row.ExpiresAt.After(s.now()) {
			return s.reject(ctx, row.ID)
		}
		data, err := s.objects.Get(ctx, "quarantine/"+row.ID)
		if err != nil {
			return err
		}
		hash := sha256.Sum256(data)
		if int64(len(data)) != row.Size || hex.EncodeToString(hash[:]) != row.Checksum {
			return s.reject(ctx, row.ID)
		}
		if err = s.scanner.Scan(ctx, data); err != nil {
			if errors.Is(err, ErrInfected) || errors.Is(err, ErrInvalid) {
				return s.reject(ctx, row.ID)
			}
			return err
		}
		clean, err := Sanitize(data, row.ContentType)
		if err != nil {
			return s.reject(ctx, row.ID)
		}
		if err = s.objects.Put(ctx, "clean/"+row.ID, clean, CleanType(row.ContentType)); err != nil {
			return err
		}
		hash = sha256.Sum256(clean)
		_, err = s.client.MediaFile.Update().Where(mediafile.IDEQ(row.ID), mediafile.StateEQ(mediafile.StateQueued), mediafile.ExpiresAtGT(s.now())).SetState(mediafile.StateReady).SetCleanContentType(CleanType(row.ContentType)).SetCleanSize(int64(len(clean))).SetCleanChecksum(hex.EncodeToString(hash[:])).SetUpdatedAt(s.now()).Save(ctx)
		if err != nil {
			return err
		}
		return s.objects.Delete(ctx, "quarantine/"+row.ID)
	}
}
func (s *Store) reject(ctx context.Context, id string) error {
	_, err := s.client.MediaFile.Update().Where(mediafile.IDEQ(id), mediafile.StateEQ(mediafile.StateQueued)).SetState(mediafile.StateRejected).SetUpdatedAt(s.now()).Save(ctx)
	return err
}

// Cleanup first makes objects inaccessible, then deletes both namespaces. Deleted
// tombstones remain eligible for repeated deletion through the upload expiry plus
// an hour, covering bounded writes that started before revocation/cleanup.
func (s *Store) Cleanup(ctx context.Context) error {
	now := s.now()
	_, err := s.client.MediaFile.Update().Where(mediafile.MessageIDIsNil(), mediafile.ExpiresAtLTE(now), mediafile.StateNEQ(mediafile.StateDeleted)).SetState(mediafile.StateDeleted).SetUpdatedAt(now).Save(ctx)
	if err != nil {
		return err
	}
	rows, err := s.client.MediaFile.Query().Where(mediafile.Or(mediafile.StateEQ(mediafile.StateRejected), mediafile.And(mediafile.StateEQ(mediafile.StateDeleted), mediafile.PurgedAtIsNil()))).Order(ent.Asc(mediafile.FieldUpdatedAt)).Limit(100).All(ctx)
	if err != nil {
		return err
	}
	for _, row := range rows {
		if err = s.objects.Delete(ctx, "quarantine/"+row.ID); err != nil {
			return err
		}
		if err = s.objects.Delete(ctx, "clean/"+row.ID); err != nil {
			return err
		}
		if _, err = s.client.MediaFile.UpdateOneID(row.ID).SetUpdatedAt(now).Save(ctx); err != nil {
			return err
		}
		if row.State == mediafile.StateDeleted && row.ExpiresAt.Before(now.Add(-time.Hour)) {
			if _, err = s.client.MediaFile.UpdateOneID(row.ID).SetPurgedAt(now).Save(ctx); err != nil {
				return err
			}
		}
	}
	// Ready files may retain quarantine copies after a storage timeout or an upload
	// retry that was already in flight. Reaping these copies never deletes clean data.
	ready, err := s.client.MediaFile.Query().Where(mediafile.StateEQ(mediafile.StateReady), mediafile.PurgedAtIsNil()).Order(ent.Asc(mediafile.FieldUpdatedAt)).Limit(100).All(ctx)
	if err != nil {
		return err
	}
	for _, row := range ready {
		if err = s.objects.Delete(ctx, "quarantine/"+row.ID); err != nil {
			return err
		}
		if _, err = s.client.MediaFile.UpdateOneID(row.ID).SetUpdatedAt(now).Save(ctx); err != nil {
			return err
		}
		if row.ExpiresAt.Before(now.Add(-time.Hour)) {
			if _, err = s.client.MediaFile.UpdateOneID(row.ID).SetPurgedAt(now).Save(ctx); err != nil {
				return err
			}
		}
	}
	return nil
}

// RunCleanup runs bounded maintenance without logging storage errors or object IDs.
func (s *Store) RunCleanup(ctx context.Context, logger *slog.Logger) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			task, cancel := context.WithTimeout(ctx, 30*time.Second)
			err := s.Cleanup(task)
			cancel()
			if err != nil && ctx.Err() == nil {
				logger.ErrorContext(ctx, "private media cleanup unavailable")
			}
		}
	}
}
