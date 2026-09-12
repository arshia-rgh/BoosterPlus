package migrate_test

import (
	"testing"
	"testing/fstest"

	"github.com/arshia-rgh/BoosterPlus/backend/internal/migrate"
	"github.com/arshia-rgh/BoosterPlus/backend/migration"
)

func TestPackagedMigrations(t *testing.T) {
	t.Parallel()
	files, err := migrate.Load(migration.Files)
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 23 || len(files[0].Checksum) != 64 {
		t.Fatalf("unexpected manifest: %+v", files)
	}
}

func TestRejectInvalidMigrationManifests(t *testing.T) {
	t.Parallel()
	valid := "-- +goose NO TRANSACTION\n-- +goose Up\nSELECT 1;\n-- +goose Down\nSELECT 1;\n"
	cases := map[string]fstest.MapFS{
		"empty":                 {},
		"gap":                   {"000002_gap.sql": {Data: []byte(valid)}},
		"duplicate":             {"000001_a.sql": {Data: []byte(valid)}, "000001_b.sql": {Data: []byte(valid)}},
		"unsafe_name":           {"000001_A.sql": {Data: []byte(valid)}},
		"transactional_ddl":     {"000001_a.sql": {Data: []byte("-- +goose Up\nCREATE TABLE x(id INT);\n-- +goose Down\nDROP TABLE x;\n")}},
		"environment_expansion": {"000001_a.sql": {Data: []byte(valid + "-- +goose ENVSUB ON\n")}},
		"missing_down":          {"000001_a.sql": {Data: []byte("-- +goose NO TRANSACTION\n-- +goose Up\nSELECT 1;\n")}},
	}
	for name, source := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			if _, err := migrate.Load(source); err == nil {
				t.Fatal("unsafe manifest accepted")
			}
		})
	}
}
