package recovery

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/database"
)

func TestRestoreRejectsWrongSchemaTimestampIndexAndUnmatchedSQL(t *testing.T) {
	t.Parallel()
	row := entry([]byte("fixture"))
	good := Manifest{Version: 1, Schema: database.SchemaVersion, TSO: "123", CompletedAt: time.Now().UTC(), Entries: []Entry{row}}
	raw, err := json.Marshal(good)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = decode(raw); err != nil {
		t.Fatal(err)
	}
	if err = matches(good.Entries, pages(row)); err != nil {
		t.Fatal(err)
	}
	for _, bad := range []Manifest{
		{Version: 1, Schema: 0, TSO: "123", CompletedAt: good.CompletedAt, Entries: []Entry{row}},
		{Version: 1, Schema: database.SchemaVersion, TSO: "0", CompletedAt: good.CompletedAt, Entries: []Entry{row}},
		{Version: 1, Schema: database.SchemaVersion, TSO: "123", CompletedAt: good.CompletedAt, Entries: []Entry{row, row}},
	} {
		raw, err = json.Marshal(bad)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = decode(raw); err == nil {
			t.Fatal("invalid manifest accepted")
		}
	}
	if err = matches(nil, pages(row)); err == nil {
		t.Fatal("extra SQL object ignored")
	}
	if err = matches(good.Entries, func(string) ([]Entry, error) { return nil, nil }); err == nil {
		t.Fatal("missing SQL object ignored")
	}
	changed := row
	changed.Checksum = "changed"
	if err = matches(good.Entries, pages(changed)); err == nil {
		t.Fatal("different SQL checksum accepted")
	}
}

func TestArchiveReadsRejectOversizeAndExternalSymlinks(t *testing.T) {
	t.Parallel()
	directory := t.TempDir()
	if err := os.WriteFile(filepath.Join(directory, "object"), []byte("fixture"), 0o600); err != nil {
		t.Fatal(err)
	}
	root, err := os.OpenRoot(directory)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := root.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	if _, err = read(root, "object", 3); err == nil {
		t.Fatal("oversized archive object accepted")
	}
	outside := filepath.Join(t.TempDir(), "private")
	if err = os.WriteFile(outside, []byte("private"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err = os.Symlink(outside, filepath.Join(directory, "link")); err != nil {
		t.Fatal(err)
	}
	if _, err = read(root, "link", 100); err == nil {
		t.Fatal("archive symlink escaped root")
	}
	if _, err = read(root, ".", 100); err == nil {
		t.Fatal("directory accepted as archive object")
	}
}
