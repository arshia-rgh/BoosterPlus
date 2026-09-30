package recovery

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type fixtureObjects struct {
	data    []byte
	failure bool
}

func (f fixtureObjects) Get(context.Context, string) ([]byte, error) {
	if f.failure {
		return nil, errors.New("private provider detail")
	}
	return f.data, nil
}
func (fixtureObjects) Put(context.Context, string, []byte, string) error {
	return errors.New("unexpected write")
}
func (fixtureObjects) Delete(context.Context, string) error { return errors.New("unexpected deletion") }
func entry(data []byte) Entry {
	sum := sha256.Sum256(data)
	return Entry{ID: "00000001-0000-4000-8000-000000000000", Namespace: "clean", Checksum: hex.EncodeToString(sum[:]), Size: int64(len(data)), ContentType: "image/png"}
}
func pages(row Entry) func(string) ([]Entry, error) {
	return func(after string) ([]Entry, error) {
		if after != "" {
			return nil, nil
		}
		return []Entry{row}, nil
	}
}
func TestCapturePrivateBytesAndExclusiveDirectory(t *testing.T) {
	t.Parallel()
	data := []byte("fixture bytes bound by database checksum")
	directory := filepath.Join(t.TempDir(), "capture")
	row := entry(data)
	got, err := capture(t.Context(), "1234567890", fixtureObjects{data: data}, directory, pages(row))
	if err != nil || len(got.Entries) != 1 {
		t.Fatal("complete capture failed", err)
	}
	for _, name := range []string{"manifest.json", "clean/" + row.ID} {
		info, e := os.Stat(filepath.Join(directory, name))
		if e != nil || info.Mode().Perm() != 0o600 {
			t.Fatal("recovery file was not private", e)
		}
	}
	if _, err = capture(t.Context(), "1234567890", fixtureObjects{data: data}, directory, pages(row)); err == nil {
		t.Fatal("existing capture overwritten")
	}
}
func TestCaptureFailureNeverPublishesCompleteManifest(t *testing.T) {
	t.Parallel()
	data := []byte("fixture")
	good := entry(data)
	for _, scenario := range []string{"missing", "tampered", "traversal", "namespace", "duplicate", "page_failure", "cancelled"} {
		t.Run(scenario, func(t *testing.T) {
			t.Parallel()
			directory := filepath.Join(t.TempDir(), "capture")
			row := good
			objects := fixtureObjects{data: data}
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			switch scenario {
			case "missing":
				objects.failure = true
			case "tampered":
				objects.data = []byte("changed")
			case "traversal":
				row.ID = "../../foreign"
			case "namespace":
				row.Namespace = "../foreign"
			case "cancelled":
				cancel()
			}
			next := pages(row)
			if scenario == "duplicate" {
				next = func(string) ([]Entry, error) { return []Entry{row}, nil }
			}
			if scenario == "page_failure" {
				next = func(string) ([]Entry, error) { return nil, errors.New("private SQL detail") }
			}
			_, err := capture(ctx, "1234567890", objects, directory, next)
			if err == nil || strings.Contains(err.Error(), "detail") {
				t.Fatal("failure accepted or leaked private error", err)
			}
			if _, err = os.Stat(filepath.Join(directory, "manifest.json")); !errors.Is(err, os.ErrNotExist) {
				t.Fatal("partial capture has success manifest", err)
			}
		})
	}
}
