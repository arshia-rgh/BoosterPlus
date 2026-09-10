# Booster Plus backend

Independent Go project in the Booster Plus monorepo. P00/P01 provide explicit SQL migrations, an API process, a durable worker, local services, containers, and mandatory quality gates. Authentication and commerce are not implemented yet.

## Requirements and setup

- Go 1.27.1 (the Go command can download the pinned toolchain), Docker with Compose, and a POSIX shell.
- From the repository root run `make bootstrap` to install the pinned checks and Git hook.
- Run `make dev-up` here to generate private local credentials, build the image, start TiDB and Mailpit, provision local database roles, run the explicit migration service, and start the API, worker and private S3 development service.
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

Commands that access a database read `MIGRATION_DATABASE_DSN` and `APP_ENV`. Provision the application database and least-privilege credentials separately; the runner does not create an arbitrary production database. Verified TLS is required outside development/test. Runtime connections use separate credentials without DDL privileges. The local bootstrap creates only fixed development identities on the dedicated local TiDB endpoint; it is unavailable in production.

`down --steps N --acknowledge-data-loss` is restricted to development/test. Production uses reviewed forward fixes. Status/verify do not create bookkeeping tables. Migration execution snapshots validated SQL, records SHA-256 digests, and checks the journal against Goose's version log.

A durable single-runner lock never expires automatically. A crashed runner therefore blocks a second runner until an operator confirms the old process and any DDL jobs have stopped. See the [migration recovery procedure](../docs/migration-recovery.md). Interrupted migrations are never blindly retried or marked successful.

## Quality gate

`make pre-commit` runs formatting checks, dependency tidy/verification, reproducible Ent generation, vet, the configured golangci-lint suite, standalone gosec, govulncheck, unit/race tests, real TiDB integration tests, migration validation, all three executable builds, Compose validation, a Docker build, and Trivy image scanning. Later feature tests are added to this same gate as implemented.

All tools are pinned in the Makefile. Gosec scans authored production and test code; generated upstream code is compiled and dependency-scanned. Narrow suppressions document random test identifiers, local development cookie configuration, and Go’s random-nonce encryption API.

The current Compose topology uses TiDB's single-node unistore mode for SQL compatibility testing, not production resilience. Distributed TiKV/PD load/recovery qualification belongs to the selected production topology and must be completed before launch.

## Run and operate

```sh
make dev-up
make dev-smoke
curl http://127.0.0.1:8080/health/ready
curl http://127.0.0.1:8080/api/v1/status
make compose-logs
make compose-down
```

Stopping Compose preserves the named TiDB/storage volumes. Do not delete `.env` while retaining these volumes: existing local database/storage credentials are preserved. Local services are not a production deployment. TiDB listens on loopback port 14000, API on 8080, Mailpit UI/SMTP on 8025/1025, and S3 on 8333. S3's unauthenticated administrative/filer ports are not published. The `storage` profile is started explicitly by `dev-up`; `compose-up` starts only TiDB and Mailpit for lightweight tests. NATS is deferred because the durable database queue currently meets the requirements.

`make build` creates `bin/server`, `bin/worker` and `bin/boosterplus`. Host processes require the identity variables in `.env.example`, `APP_ENV`, `DATABASE_DSN`, and optionally `HTTP_ADDR`; migrations use `MIGRATION_DATABASE_DSN` instead. `config validate` performs offline configuration checks. Defaults bind the host server only to loopback. Production needs a TLS gateway and a verified TLS database connection. API/worker startup checks schema version, required column types, and critical unique constraints without running DDL. The API has bounded request size, connection/header timeouts, generic errors, fresh request IDs, security headers and graceful shutdown.

The distroless runtime runs as UID 65532, with no shell; Compose adds a read-only root filesystem, dropped capabilities and resource limits. `/health/live` reports process liveness, `/health/ready` validates the database/schema, and `/api/v1/status` exposes only public prelaunch metadata. The Docker healthcheck assumes the container listener uses port 8080, as configured by Compose. Passwordless identity, account security and permissioned staff endpoints are implemented in P02; commerce endpoints follow later phases.

See [background job guarantees and recovery](../docs/background-jobs.md). API responses are validated against [OpenAPI](api/openapi.json) in tests. The frontend consumes its own explicitly copied contract and generated types. Updating a contract requires `make -C frontend contract-update` from the repository root.

Image checks fail on fixable high/critical findings and retain a full JSON report in `.cache/image-vulnerabilities.json`. This threshold does not claim zero lower-severity or unfixed advisories. Application dependency scans have their own stricter gates. Only the application images are part of this scan; deployment/vendor-service audits, distributed failure testing and hardening remain release work.


## Passwordless identity

See [identity design and operations](../docs/identity-design.md) for email/Google setup, mandatory staff MFA, first-owner bootstrap, recovery and production inputs. SQL migration 4 introduces identities, server sessions, encrypted delivery state, throttles, audits and recovery records. Ent is used only for queries. Every connection selects TiDB pessimistic transactions; identity operations use READ COMMITTED for current authorization decisions after locking. The gate includes a simultaneous-owner-demotion regression.

Useful commands from `backend/`:

```sh
make setup-env
make dev-up
make pre-commit
# After signing up and enrolling MFA in the frontend:
docker compose run --rm --entrypoint /app/boosterplus api identity bootstrap-owner --user <user-id> --operator <operator-reference>
```

The operator reference is an auditable identifier, never a password or free-form case history. Setup appends missing identity keys without rotating existing secrets. Use `PUBLIC_ORIGIN=http://127.0.0.1:3000` in the local backend `.env` if testing Google with the production frontend server instead of Vite on port 5173.

## Catalog and SQL publication storage

SQL migrations 5–6 add `catalog_releases`, a current-release pointer on `games`, guarded upgrade/rollback visibility, and an unverified Mobile Legends draft. Ent maps queries; it never owns migration execution. P03 routes expose admin drafts/preview/publication/history and public catalog/selection validation. Staff mutations share the identity authorization transaction and publication requires recent verification of both factors. See [catalog operations](../docs/catalog.md) for configuration limits, exact-decimal answers, immutable revisions and remaining launch inputs.

## Crypto provider transport

The initial NOWPayments adapter is in `internal/payments/nowpayments`. It supports bounded hosted-invoice creation, exact-decimal payment observations and signed callback references. It is not enabled in the server or worker until the durable payment workflow is implemented and qualified. See [provider decision and integration boundaries](../docs/crypto-provider-decision.md). No live keys belong in Git or chat.
