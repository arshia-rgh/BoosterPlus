// Package recovery captures private media against an exact TiDB snapshot.
// It never restores into, migrates or mutates the source database.
package recovery

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
	"github.com/arshia-rgh/BoosterPlus/backend/internal/media"
)

// Entry binds an immutable media object to its database-declared bytes.
type Entry struct {
	ID          string `json:"id"`
	Namespace   string `json:"namespace"`
	Checksum    string `json:"checksum"`
	ContentType string `json:"content_type"`
	Size        int64  `json:"size"`
}

// Manifest is private recovery metadata, not a public customer export.
type Manifest struct {
	Version     int       `json:"version"`
	Schema      int       `json:"schema"`
	TSO         string    `json:"tso"`
	CompletedAt time.Time `json:"completed_at"`
	Entries     []Entry   `json:"entries"`
}

// Capture writes a new exclusive private directory, publishing its manifest only
// after every uploaded/queued/ready object matches the same repeatable-read TSO.
// Concurrent deletion or promotion of an unavailable source fails this attempt;
// operators retry at a fresh snapshot, never accept a missing historical object.
func Capture(ctx context.Context, db *sql.DB, objects media.Objects, destination string) (manifest Manifest, result error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Minute)
	defer cancel()
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return manifest, errors.New("recovery snapshot unavailable")
	}
	defer func() {
		if rollbackErr := tx.Rollback(); rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
			result = errors.Join(result, errors.New("recovery snapshot cleanup failed"))
		}
	}()
	var tso uint64
	if err = tx.QueryRowContext(ctx, "SELECT @@tidb_current_ts").Scan(&tso); err != nil || tso == 0 {
		return manifest, errors.New("exact recovery timestamp unavailable")
	}
	return capture(ctx, strconv.FormatUint(tso, 10), objects, destination, func(after string) ([]Entry, error) {
		return page(ctx, tx, after)
	})
}

func page(ctx context.Context, tx *sql.Tx, after string) (entries []Entry, result error) {
	rows, err := tx.QueryContext(ctx, `SELECT id, namespace, checksum, content_type, size FROM (SELECT id,
CASE WHEN state='ready' THEN 'clean' ELSE 'quarantine' END AS namespace,
CASE WHEN state='ready' THEN clean_checksum ELSE checksum END AS checksum,
CASE WHEN state='ready' THEN clean_content_type ELSE content_type END AS content_type,
CASE WHEN state='ready' THEN clean_size ELSE size END AS size
FROM media_files WHERE state IN ('uploaded','queued','ready')
UNION ALL
SELECT CONCAT(a.id,'/',v.name), 'artwork',
JSON_UNQUOTE(JSON_EXTRACT(a.variants,CONCAT('$."',v.name,'".checksum'))),
JSON_UNQUOTE(JSON_EXTRACT(a.variants,CONCAT('$."',v.name,'".content_type'))),
CAST(JSON_UNQUOTE(JSON_EXTRACT(a.variants,CONCAT('$."',v.name,'".size'))) AS SIGNED)
FROM artworks a CROSS JOIN (SELECT 'wide' AS name UNION ALL SELECT 'wide-small' UNION ALL SELECT 'mobile' UNION ALL SELECT 'mobile-small' UNION ALL SELECT 'card' UNION ALL SELECT 'thumb') v
WHERE a.state='ready' AND JSON_EXTRACT(a.variants,CONCAT('$."',v.name,'"')) IS NOT NULL
) objects WHERE id>? ORDER BY id LIMIT 100`, after)
	if err != nil {
		return nil, errors.New("recovery media snapshot unavailable")
	}
	defer func() { result = errors.Join(result, rows.Close()) }()
	for rows.Next() {
		var entry Entry
		if err = rows.Scan(&entry.ID, &entry.Namespace, &entry.Checksum, &entry.ContentType, &entry.Size); err != nil {
			return nil, errors.New("recovery media metadata invalid")
		}
		entries = append(entries, entry)
	}
	if rows.Err() != nil {
		return nil, errors.New("recovery media read interrupted")
	}
	return entries, nil
}

func valid(entry Entry) bool {
	identifier := entry.ID
	if entry.Namespace == "artwork" {
		parts := strings.Split(entry.ID, "/")
		if len(parts) != 2 || !slices.Contains([]string{"wide", "wide-small", "mobile", "mobile-small", "card", "thumb"}, parts[1]) {
			return false
		}
		identifier = parts[0]
	} else if entry.Namespace != "clean" && entry.Namespace != "quarantine" {
		return false
	}
	id, err := uuid.Parse(identifier)
	if err != nil || id.String() != identifier || entry.Size < 1 || entry.Size > media.MaxBytes {
		return false
	}
	hash, err := hex.DecodeString(entry.Checksum)
	return err == nil && len(hash) == sha256.Size && hex.EncodeToString(hash) == entry.Checksum && (entry.ContentType == "image/jpeg" || entry.ContentType == "image/png" || entry.ContentType == "image/webp")
}

func capture(ctx context.Context, tso string, objects media.Objects, destination string, next func(string) ([]Entry, error)) (manifest Manifest, result error) {
	if !filepath.IsAbs(destination) || filepath.Clean(destination) != destination {
		return manifest, errors.New("recovery directory must be absolute and new")
	}
	if err := os.Mkdir(destination, 0o700); err != nil {
		return manifest, errors.New("recovery directory must not already exist")
	}
	root, err := os.OpenRoot(destination)
	if err != nil {
		return manifest, errors.New("recovery directory unavailable")
	}
	defer func() { result = errors.Join(result, root.Close()) }()
	for _, name := range []string{"clean", "quarantine", "artwork"} {
		if err = root.Mkdir(name, 0o700); err != nil {
			return manifest, errors.New("recovery directory preparation failed")
		}
	}
	manifest = Manifest{Version: 1, Schema: database.SchemaVersion, TSO: tso, Entries: []Entry{}}
	after := ""
	var total int64
	for {
		if ctx.Err() != nil {
			return Manifest{}, errors.New("recovery capture cancelled")
		}
		entries, e := next(after)
		if e != nil {
			return Manifest{}, errors.New("recovery metadata unavailable")
		}
		if len(entries) == 0 {
			break
		}
		for _, entry := range entries {
			if !valid(entry) || entry.ID <= after || len(manifest.Entries) >= 100000 || total+entry.Size > 32<<30 {
				return Manifest{}, errors.New("recovery metadata invalid or exceeds qualified capacity")
			}
			data, e := objects.Get(ctx, entry.Namespace+"/"+entry.ID)
			if e != nil {
				return Manifest{}, errors.New("historical recovery object unavailable; retry a fresh capture")
			}
			hash := sha256.Sum256(data)
			if int64(len(data)) != entry.Size || hex.EncodeToString(hash[:]) != entry.Checksum {
				return Manifest{}, errors.New("historical recovery object does not match database evidence")
			}
			if entry.Namespace == "artwork" {
				if e = root.Mkdir("artwork/"+strings.Split(entry.ID, "/")[0], 0700); e != nil && !errors.Is(e, os.ErrExist) {
					return Manifest{}, errors.New("artwork recovery directory preparation failed")
				}
			}
			if e = write(root, entry.Namespace+"/"+entry.ID, data); e != nil {
				return Manifest{}, errors.New("private recovery object write failed")
			}
			manifest.Entries = append(manifest.Entries, entry)
			total += entry.Size
			after = entry.ID
		}
	}
	manifest.CompletedAt = time.Now().UTC()
	raw, err := json.Marshal(manifest)
	if err != nil {
		return Manifest{}, errors.New("recovery manifest invalid")
	}
	if err = write(root, "manifest.json", raw); err != nil {
		return Manifest{}, errors.New("recovery manifest write failed")
	}
	return manifest, nil
}

func write(root *os.Root, name string, data []byte) (result error) {
	file, err := root.OpenFile(name, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return fmt.Errorf("create private recovery file: %w", err)
	}
	defer func() { result = errors.Join(result, file.Close()) }()
	if _, err = file.Write(data); err != nil {
		return err
	}
	return file.Sync()
}
