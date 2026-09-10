# Durable background jobs

The P01 worker polls a TiDB-backed queue. NATS is not needed for this topology. Business code must enqueue through `jobs.EnqueueEntTx` (Ent) or `jobs.EnqueueTx` (`database/sql`) in the same transaction as the business mutation. Committing creates both; rollback removes both. Job payloads should contain record references, not credentials or unnecessary personal data.

Idempotency keys are unique, and reusing a key with a different kind or canonical JSON payload is rejected. JSON integers retain their original precision. Claims use conditional updates, random ownership tokens, a 30-second lease and a 10-second heartbeat. A failed handler retries with bounded exponential backoff, up to five attempts by default. An exhausted or abandoned final lease becomes a failed job. Handler panics become generic errors without logging their contents. Shutdown cancels work and leaves unacknowledged work available for lease recovery.

Delivery is **at least once**. Ownership checks fence acknowledgement, renewal and failure updates. They cannot undo an external side effect that happened before a worker crashed. Handlers must use business/provider idempotency keys and honor cancellation; database effects must also use transactional business-state guards. Financial effects will add their own reconciliation and idempotency rules in P05. No payment handler exists yet.

The initial `system.ping` handler demonstrates queue execution without making an external call. Use the runtime CLI in local Compose:

```sh
docker compose exec api /app/boosterplus jobs enqueue-ping unique-test-key
docker compose exec api /app/boosterplus jobs failed
docker compose exec api /app/boosterplus jobs retry JOB_ID
```

`failed` prints at most 100 failed job IDs, kinds, attempts and safe error codes, without payloads. Retrying requires direct operator access to the CLI and its database credentials; retry only after checking the job's business effects. The authenticated admin task page now provides recent-factor, generation-checked retry with an atomic audit trail; see [operational administration](operations-design.md). CLI retries also advance the manual retry generation so stale browser requests cannot repeat them. There is no unauthenticated queue management API.
