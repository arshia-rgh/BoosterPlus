# SQL migration recovery

The CLI serializes mutation through `schema_migration_lock`, records file SHA-256 values in `schema_migration_journal`, and uses Goose's SQL execution/version log. TiDB DDL is not transactionally rolled back. The lock deliberately has no expiry: a delayed runner must not overlap a replacement runner's DDL.

First installation creates only the lock table before ownership is acquired. Journal initialization and migration execution both require the durable lock; competing installers must not run journal DDL outside that boundary. A held lock is never automatically expired or removed by a competing runner, including before the first migration.

## Interrupted process or DDL

1. Stop the failed release job and any other migration runners. Disable automatic release retry. Read the lock owner/time and the failing version without exposing the DSN.
2. Check database process/DDL job state and confirm the original connection/job is no longer executing. A stale wall-clock timestamp alone is not proof.
3. Compare the applied schema with the exact SQL artifact and both migration bookkeeping tables. Preserve a backup and the execution evidence. A `running` journal entry means some statements may have committed even when Goose's version record did not.
4. Prepare a reviewed, environment-specific recovery: complete missing operations or safely undo the partial change. Review effects on existing data and running application versions. Do not modify an already published SQL file to conceal the error.
5. After validating the actual resulting schema, reconcile the affected journal/version entry as part of the documented repair. Record operator, reason, original values, final values, and SQL. There is intentionally no generic `force success` CLI shortcut.
6. Release only the confirmed old lock owner after the old process and DDL have stopped. Run read-only verification, apply any required forward correction, then resume the release.

If a normal successful command cannot release its lock because the database became unavailable, verify the schema/journal first and then use the same stopped-runner checks. Never delete an unknown runner's lock merely to make a deployment proceed.

The integration suite proves that partial DDL remains present, its interrupted journal blocks retries, changed SQL is rejected, unknown/mismatched version records block mutation, and only one concurrent runner can apply each version. It does not replace an operator-reviewed recovery of production data.
