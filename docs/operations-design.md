# Operational administration

The P11 operations stage adds a defined admin overview and private background-task inspection/recovery. It preserves the existing staff/owner identity controls and connects to the order, intake, review, support and scheduling workflows. Payment/payout reporting, full exports/search, privacy-retention operations and production qualification remain separate work.

## Dashboard

`GET /api/v1/admin/operations` requires a current administrator/owner session with completed staff sign-in factors. The existing authorization transaction rechecks account suspension, role, session and permissions. The overview counts submitted requests; orders needing information/quote acceptance; orders awaiting payment; queued/in-progress/on-hold orders; submitted completions; submitted account intake; intake approved pending terms; pending purchase reviews; unresolved and unassigned support; upcoming confirmed bookings; outstanding booking proposals; failed/runnable/running jobs.

Each card states its exact meaning and links to the existing staff workflow. The overview shows at most six oldest submitted requests, six confirmed sessions starting in the next 24 hours, and six failed-job samples. It excludes customer email addresses, order answers, credential data, message bodies, job payloads and financial amounts. Workflow states are not reported as revenue. Job counts and the oldest runnable timestamp use database UTC time and exclude future-scheduled pending work; worker activity may advance between the separate bounded queries. Refresh obtains a new observation. This view is operational guidance, not an accounting snapshot.

The React admin page retains user/role/audit controls, adds the overview, and replaces obsolete phase-placeholder copy. The booster landing page links to its existing assigned-order workspace and availability calendar. Private-resource errors conceal stale content while authorization is rechecked, following the shared resource boundary.

## Task inspection and retry

`GET /api/v1/admin/jobs` accepts an allowlisted state, an optional known-kind filter and a bounded opaque cursor. It returns at most 50 tasks ordered by creation time/ID. The DTO contains an opaque reference, task kind/state, automatic attempt count/limit, manual retry generation, generic failure code and scheduling/lease timestamps. It excludes payloads, idempotency keys, request hashes and lease owner tokens. Unknown failure text becomes `internal_error`; unknown task kinds are visible for investigation but cannot be retried through this API.

`POST /api/v1/admin/jobs/{id}/retry` requires recent primary verification and recent authenticator verification, a matching observed retry generation, a failed state, a supported task kind, and a nonempty explanation of up to 2,000 Unicode characters. Strict JSON rejects attempts to change payload/kind/limits/other fields, and the shared transport requires origin/CSRF protection and limits request size. Operations routes share a 300/hour per-identity rate bucket.

The transaction conditionally changes the observed failed generation to pending, resets automatic attempts, clears expired lease/error state and schedules another attempt. It increments `retry_generation` and writes an audit record containing the operator ID, task reference and private explanation. Audit failure rolls back recovery. Duplicate/stale requests conflict, including when a task has already been retried and failed again. The original payload, idempotency key, request hash and attempt limit remain unchanged. Existing worker lease fencing still prevents an old worker from acknowledging a newly recovered task.

Supported kinds currently match the worker's `system.ping`, `identity.email`, `activity.email` and `media.scan` handlers. Those handlers retain their current eligibility/expiry/deduplication checks; manual retry cannot grant account access or fabricate payment evidence. Email acceptance can be ambiguous, so a replay can duplicate delivery; staff must investigate before requesting it. Recovery does not promise that the task's business effect occurs: an expired or unauthorized reference may correctly be suppressed.

SQL migration 18 adds a monotonic manual retry generation and a staff queue index. Existing direct-operator CLI retry also increments that generation and clears leases; its host/database access remains a separate operational trust boundary. Web staff cannot use CLI/database privileges through the API. Ent owns domain queries; the durable job queue continues using parameterized SQL for conditional lease/recovery operations. Migrations run only through the explicit Cobra command.

## Qualification and remaining work

Tests cover private view authorization/suspension, both recent factors, competing retries, stale generations after a later failure, immutable payload preservation, worker completion, audit rollback, invalid filters/cursors, safe error projections, 50-row pagination, defined dashboard counts, strict HTTP/CSRF/contracts and browser/accessibility recovery on both devices. The browser fixture creates synthetic failed ping work solely in an isolated UUID database; the real worker executes the retry. No production fixture or bypass endpoint exists. Reproducible delivery evidence belongs in `docs/progress.md`.

The stage does not claim complete P11 administration, finance availability, all reporting/export/retention operations, or production readiness. The owner still needs to select commercial/provider and deployment policies for their dependent features. Full production database/query-plan/load and recovery verification remains required.
