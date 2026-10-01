package cli

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"syscall"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/spf13/cobra"

	"github.com/arshia-rgh/BoosterPlus/backend/ent"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/config"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacy"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/privacyjournal"
)

type journalArchive struct {
	Version    int               `json:"version"`
	CapturedAt time.Time         `json:"captured_at"`
	Objects    map[string][]byte `json:"objects"`
}

func privacyRecoveryCommand(getenv func(string) string, replay bool) *cobra.Command {
	name := "recovery-privacy-export NEW_PRIVATE_FILE"
	if replay {
		name = "recovery-privacy-replay PRIVATE_FILE"
	}
	return &cobra.Command{Use: name, Args: cobra.ExactArgs(1), Short: "Export independent encrypted erasure evidence or replay it inside quarantine", RunE: func(cmd *cobra.Command, args []string) (result error) {
		ctx, cancel := context.WithTimeout(cmd.Context(), 9*time.Minute)
		defer cancel()
		journal, objects, err := config.PrivacyRecovery(getenv)
		if err != nil {
			return err
		}
		if journal == nil {
			return errors.New("independent privacy recovery configuration required")
		}
		if !replay {
			return exportJournal(ctx, journal, objects, args[0])
		}
		if err = recoveryGuard(getenv); err != nil {
			return err
		}
		archive, err := readJournalArchive(args[0])
		if err != nil {
			return err
		}
		entries := make([]privacyjournal.Entry, 0, len(archive.Objects))
		for key, data := range archive.Objects {
			entry, decodeErr := journal.Decode(key, data)
			if decodeErr != nil {
				return decodeErr
			}
			entries = append(entries, entry)
		}
		db, err := database.Open(ctx, getenv("DATABASE_DSN"), getenv("APP_ENV"))
		if err != nil {
			return errors.New("privacy recovery database unavailable")
		}
		defer func() { result = errors.Join(result, db.Close()) }()
		if err = database.Ready(ctx, db); err != nil {
			return errors.New("privacy recovery schema is not ready")
		}
		client := ent.NewClient(ent.Driver(entsql.OpenDB(dialect.MySQL, db)))
		if err = privacy.ReplayRecovery(ctx, client, entries); err != nil {
			return errors.New("privacy replay failed; keep target quarantined")
		}
		_, err = fmt.Fprintf(cmd.OutOrStdout(), "Privacy evidence replayed: records=%d; holds, eligible media purge and evidence freshness require review; quarantine retained\n", len(entries))
		return err
	}}
}

func exportJournal(ctx context.Context, journal *privacyjournal.Journal, objects *privacyjournal.S3, path string) (result error) {
	if !filepath.IsAbs(path) {
		return errors.New("absolute private journal path required")
	}
	keys, err := objects.Keys(ctx)
	if err != nil {
		return err
	}
	archive := journalArchive{Version: 1, CapturedAt: time.Now().UTC(), Objects: map[string][]byte{}}
	total := 0
	for _, key := range keys {
		data, readErr := objects.Read(ctx, key)
		if readErr != nil {
			return readErr
		}
		if _, readErr = journal.Decode(key, data); readErr != nil {
			return readErr
		}
		total += len(data)
		if total > 32<<20 {
			return errors.New("privacy recovery archive limit exceeded")
		}
		archive.Objects[key] = data
	}
	root, err := os.OpenRoot(filepath.Dir(path))
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, root.Close()) }()
	file, err := root.OpenFile(filepath.Base(path), os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return err
	}
	defer func() { result = errors.Join(result, file.Close()) }()
	if err = json.NewEncoder(file).Encode(archive); err != nil {
		return err
	}
	return file.Sync()
}

func readJournalArchive(path string) (archive journalArchive, result error) {
	if !filepath.IsAbs(path) {
		return archive, errors.New("absolute private journal path required")
	}
	info, err := os.Lstat(path)
	if err != nil || !info.Mode().IsRegular() || info.Mode().Perm()&0o077 != 0 || info.Size() > 64<<20 {
		return archive, errors.New("private bounded privacy archive required")
	}
	root, err := os.OpenRoot(filepath.Dir(path))
	if err != nil {
		return archive, err
	}
	defer func() { result = errors.Join(result, root.Close()) }()
	file, err := root.OpenFile(filepath.Base(path), os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return archive, err
	}
	defer func() { result = errors.Join(result, file.Close()) }()
	opened, statErr := file.Stat()
	if statErr != nil || !opened.Mode().IsRegular() || opened.Mode().Perm()&0o077 != 0 || opened.Size() > 64<<20 {
		return archive, errors.New("private bounded privacy archive required")
	}
	decoder := json.NewDecoder(io.LimitReader(file, 64<<20))
	decoder.DisallowUnknownFields()
	if err = decoder.Decode(&archive); err != nil {
		return archive, errors.New("invalid privacy recovery archive")
	}
	var extra any
	if err = decoder.Decode(&extra); !errors.Is(err, io.EOF) || archive.Version != 1 || archive.Objects == nil || archive.CapturedAt.IsZero() || archive.CapturedAt.After(time.Now().Add(time.Minute)) || len(archive.Objects) > 100000 {
		return journalArchive{}, errors.New("invalid privacy recovery archive")
	}
	return archive, nil
}
