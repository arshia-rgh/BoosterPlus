# Booster Plus backend

Independent Go project in the Booster Plus monorepo. P00 implements and verifies the SQL migration/Ent/TiDB foundation. API, worker, and full container packaging are the next P01 deliverables; authentication and commerce are not implemented yet.

## Requirements and setup

- Go 1.27.1 (the Go command can download the pinned toolchain), Docker with Compose, and a POSIX shell.
- From the repository root run `make bootstrap` to install the pinned checks and Git hook.
- Run `make compose-up` here to start the dedicated local TiDB endpoint on `127.0.0.1:14000`.
- Run `make pre-commit` here for the complete backend gate. Integration tests require TiDB and never silently skip it.

The integration suite creates random, isolated `boosterplus_test_*` databases and removes only those databases. It accepts only the configured local or CI test endpoint. `TEST_DATABASE_DSN` defaults to the local development TiDB root connection; never substitute production credentials.

## Migrations

SQL files in `migration/` are authoritative. Ent generates query code only. Generated Ent migration helpers exist as part of upstream code generation but are never called or imported by authored tests/application code.

Commands:

```sh
make build-cli
bin/boosterplus db migrate validate
bin/boosterplus db migrate create add_feature --dir migration
bin/boosterplus db migrate status
bin/boosterplus db migrate plan
bin/boosterplus db migrate up
bin/boosterplus db migrate verify
```

Commands that access a database read `MIGRATION_DATABASE_DSN` and `APP_ENV`. Provision the application database and least-privilege credentials separately; the runner does not create an arbitrary production database. Verified TLS is required outside development/test. Runtime connections will have separate credentials without DDL privileges.

`down --steps N --acknowledge-data-loss` is restricted to development/test. Production uses reviewed forward fixes. Status/verify do not create bookkeeping tables. Migration execution snapshots validated SQL, records SHA-256 digests, and checks the journal against Goose's version log.

A durable single-runner lock never expires automatically. A crashed runner therefore blocks a second runner until an operator confirms the old process and any DDL jobs have stopped. See the [migration recovery procedure](../docs/migration-recovery.md). Interrupted migrations are never blindly retried or marked successful.

## Quality gate

`make pre-commit` runs formatting checks, dependency tidy/verification, reproducible Ent generation, vet, the configured golangci-lint suite, standalone gosec, govulncheck, unit/race tests, real TiDB integration tests, migration validation, and the CLI build. New P01 commands and later feature tests are added to this same gate as implemented.

All tools are pinned in the Makefile. Gosec scans authored production and test code; generated upstream code is compiled and dependency-scanned. Narrow suppressions in integration tests cover only database identifiers built from a fixed prefix and cryptographic randomness.

The current Compose topology uses TiDB's single-node unistore mode for SQL compatibility testing, not production resilience. Distributed TiKV/PD load/recovery qualification belongs to the selected production topology and must be completed before launch.
