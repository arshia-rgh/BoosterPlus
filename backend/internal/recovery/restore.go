package recovery

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"syscall"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

// RestoreMedia imports only an archive whose complete media index matches the
// already restored database. The caller must isolate SQL/storage and keep all
// traffic/workers/mail disabled. It never restores SQL or removes quarantine.
func RestoreMedia(ctx context.Context, db *sql.DB, objects media.Objects, source string) (count int, result error) {
	if !filepath.IsAbs(source) {
		return 0, errors.New("restore archive requires an absolute path")
	}
	root, err := os.OpenRoot(source)
	if err != nil {
		return 0, errors.New("restore archive unavailable")
	}
	defer func() { result = errors.Join(result, root.Close()) }()
	raw, err := read(root, "manifest.json", 64<<20)
	if err != nil {
		return 0, errors.New("restore manifest unavailable")
	}
	manifest, err := decode(raw)
	if err != nil {
		return 0, err
	}
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return 0, errors.New("isolated restore database unavailable")
	}
	defer func() {
		if rollbackErr := tx.Rollback(); rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
			result = errors.Join(result, errors.New("restore snapshot cleanup failed"))
		}
	}()
	if err = matches(manifest.Entries, func(after string) ([]Entry, error) { return page(ctx, tx, after) }); err != nil {
		return 0, err
	}
	for _, entry := range manifest.Entries {
		if ctx.Err() != nil {
			return count, errors.New("media restoration cancelled; keep target quarantined")
		}
		key := entry.Namespace + "/" + entry.ID
		data, e := read(root, key, media.MaxBytes)
		if e != nil || !matchesBytes(entry, data) {
			return count, errors.New("archived media failed integrity verification")
		}
		if e = objects.Put(ctx, key, data, entry.ContentType); e != nil {
			return count, errors.New("isolated media restoration failed")
		}
		stored, e := objects.Get(ctx, key)
		if e != nil || !matchesBytes(entry, stored) {
			return count, errors.New("restored media readback failed integrity verification")
		}
		count++
	}
	return count, nil
}

func matchesBytes(entry Entry, data []byte) bool {
	hash := sha256.Sum256(data)
	return int64(len(data)) == entry.Size && hex.EncodeToString(hash[:]) == entry.Checksum
}

func read(root *os.Root, name string, maximum int64) (data []byte, result error) {
	file, err := root.OpenFile(name, os.O_RDONLY|syscall.O_NONBLOCK|syscall.O_NOFOLLOW, 0)
	if err != nil {
		return nil, err
	}
	defer func() { result = errors.Join(result, file.Close()) }()
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() || info.Size() > maximum {
		return nil, errors.New("archive requires bounded regular files")
	}
	data, err = io.ReadAll(io.LimitReader(file, maximum+1))
	if err != nil || int64(len(data)) > maximum {
		return nil, errors.New("archive file exceeds its bound")
	}
	return data, nil
}

func decode(raw []byte) (Manifest, error) {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	var manifest Manifest
	if err := decoder.Decode(&manifest); err != nil || manifest.Version != 1 || manifest.Schema != database.SchemaVersion || manifest.CompletedAt.IsZero() || manifest.Entries == nil || len(manifest.Entries) > 100000 {
		return Manifest{}, errors.New("unsupported or incomplete recovery manifest")
	}
	if tso, err := strconv.ParseUint(manifest.TSO, 10, 64); err != nil || tso == 0 {
		return Manifest{}, errors.New("recovery manifest lacks an exact timestamp")
	}
	var trailing any
	if !errors.Is(decoder.Decode(&trailing), io.EOF) {
		return Manifest{}, errors.New("trailing recovery manifest data")
	}
	after := ""
	var total int64
	for _, entry := range manifest.Entries {
		if !valid(entry) || entry.ID <= after || total+entry.Size > 32<<30 {
			return Manifest{}, errors.New("invalid recovery manifest entry")
		}
		after = entry.ID
		total += entry.Size
	}
	return manifest, nil
}

func matches(entries []Entry, next func(string) ([]Entry, error)) error {
	after := ""
	index := 0
	for {
		rows, err := next(after)
		if err != nil {
			return errors.New("restored database media unavailable")
		}
		if len(rows) == 0 {
			break
		}
		for _, row := range rows {
			if index >= len(entries) || entries[index] != row || row.ID <= after {
				return errors.New("restored SQL does not match this media checkpoint")
			}
			after = row.ID
			index++
		}
	}
	if index != len(entries) {
		return errors.New("restored SQL is missing archived media references")
	}
	return nil
}
