// Package migrate runs reviewed SQL with durable integrity and exclusivity checks.
package migrate

import (
	"crypto/sha256"
	"errors"
	"fmt"
	"io/fs"
	"regexp"
	"strconv"
	"strings"
)

// File is a reviewed SQL migration and its content digest.
type File struct {
	Version  int64
	Name     string
	Checksum string
	SQL      string
}

// Load validates sequential, SQL-only, nontransactional migration files.
func Load(source fs.FS) ([]File, error) {
	names, err := fs.Glob(source, "*.sql")
	if err != nil {
		return nil, fmt.Errorf("list migrations: %w", err)
	}
	if len(names) == 0 {
		return nil, errors.New("no SQL migrations found")
	}
	pattern := regexp.MustCompile(`^([0-9]{6})_[a-z][a-z0-9_]*\.sql$`)
	files := make([]File, 0, len(names))
	for i, name := range names {
		match := pattern.FindStringSubmatch(name)
		if match == nil {
			return nil, fmt.Errorf("invalid migration filename: %s", name)
		}
		version, err := strconv.ParseInt(match[1], 10, 64)
		if err != nil || version != int64(i+1) {
			return nil, fmt.Errorf("migration sequence must be contiguous at %s", name)
		}
		data, err := fs.ReadFile(source, name)
		if err != nil {
			return nil, fmt.Errorf("read migration: %w", err)
		}
		content := string(data)
		if !strings.HasPrefix(content, "-- +goose NO TRANSACTION\n") || strings.Count(content, "-- +goose Up\n") != 1 || strings.Count(content, "-- +goose Down\n") != 1 {
			return nil, fmt.Errorf("migration %s needs NO TRANSACTION, Up, and Down annotations", name)
		}
		up, _, ok := strings.Cut(content, "-- +goose Down\n")
		if !ok || !strings.Contains(up, "-- +goose Up\n") || strings.Contains(content, "-- +goose ENVSUB") {
			return nil, fmt.Errorf("unsafe migration annotations in %s", name)
		}
		files = append(files, File{Version: version, Name: name, Checksum: fmt.Sprintf("%x", sha256.Sum256(data)), SQL: content})
	}
	return files, nil
}
