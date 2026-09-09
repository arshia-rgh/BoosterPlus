// Package migration packages the authoritative hand-authored SQL files with the CLI.
package migration

import "embed"

// Files contains only SQL migrations, never generated Ent migration logic.
//
//go:embed *.sql
var Files embed.FS
