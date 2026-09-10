# Verified purchase reviews

P10 review implementation covers completed paid boosting purchases. Account-commerce eligibility, availability alerts, and live payment qualification remain separate work. Administrators must publish the game's review policy before customers can submit feedback; no live terms or business prices are seeded.

## Eligibility and ownership

A customer can write one review per owned completed custom/package order. The current contract must belong to that customer and order, retain the active-order reference, and be settled. Staff cannot submit reviews or moderate their own former customer review. There is no endpoint or production flag that marks a purchase paid for testing. Synthetic settlement exists only in the isolated integration/browser fixtures.

Create requests use a canonical UUID idempotency key and an HMAC of the payload. Reusing a key with changed data or for another order conflicts. Edits and withdrawals use the expected review version. Current account status and role are rechecked within the existing authorization transaction; competing requests cannot overwrite each other silently. Moderation additionally requires recent primary verification and authenticator verification.

## Customer content and publication

Ratings are explicitly selected integers from 1 to 5; the form does not preselect a positive rating. Feedback is plain text, 1–4,000 Unicode characters. Optional administrator-declared feedback fields use the existing typed form evaluator, conditional visibility/requirements and validation rules. These fields cannot use attachment or credential stages. Unknown answers are rejected and hidden answers are removed.

Each save explicitly accepts the currently released policy ID and snapshots its text, fields and references. A changed policy requires refresh and acceptance. Every accepted edit preserves the previous immutable revision, returns the review to pending moderation, removes the prior staff response and immediately removes that revision from public results. Withdrawal hides the review immediately; administrators cannot republish a withdrawn review. An eligible customer may edit and resubmit it.

Admins publish after checking the accepted policy and recording an internal explanation. Hiding/rejection requires a documented privacy, spam, abuse or unrelated-content reason. Low rating is not an accepted moderation reason. Staff cannot rewrite customer text, answers or score. A public staff response is separately labeled and requires a policy check. Database audit/revision writes and generic customer notification enqueue commit atomically with moderation; audit failure rolls the entire decision back. Revision bodies are visible to the customer and administrators; internal moderation explanations remain administrator-only.

## Public read model

`GET /api/v1/public/reviews/{slug}` returns only published feedback, optional service/package filters, a 20-item cursor page, rating count/sum and five rating buckets. The response uses a separate projection without customer, moderator, order or contract identifiers. The UI labels authors “Verified customer”. Free text is rendered as text, never HTML. Public response headers and SSR fetches disable caching; private review/history endpoints also disable caching.

Aggregates, page and purchase-status labels are read in one repeatable-read transaction containing only SELECTs. TiDB rejects the SQL READ ONLY option in the configured deployment; no no-op compatibility switch is enabled. The `review_public` index groups game/state/rating and permits a snapshot sort for publication time. Qualification reproduced an inconsistency in the local TiDB 8.5.7 unistore descending publication-time index path: a historical count could disagree with the returned row. The revised index passed the direct SQL and concurrent moderation regressions. The public projection also fails closed on unpublished/null-publication rows and inconsistent first-page counts. Production-equivalent TiDB/TiKV query-plan, concurrency and load qualification remains required; the local standalone engine is not production evidence. TiDB documents its repeatable-read semantics in [Transaction isolation levels](https://docs.pingcap.com/tidb/stable/transaction-isolation-levels/).

Later financial or fulfillment changes retain the review's history and score with a neutral status-update label. Stopping or archiving new game sales does not erase already published reviews; review pages use the last released catalog, never an unpublished draft. Availability and published policy remain separate decisions. Public count includes only the currently published revisions; moderation and edit history remain auditable privately.

## Delivery and remaining qualification

SQL migration 17 creates reviews and immutable revisions, indexes ownership/idempotency and bounds queue/page access. Ent generates queries only. API, React screens, optional policy editor, customer order/review history, admin queue/detail/actions, SSR public game reviews, and generic notification links are included. The test gate covers malformed requests, CSRF, roles/ownership, stale factors, suspension, idempotency, races, rollback, policy changes, Unicode limits, pagination/filtering, privacy projections, contracts, and desktop/mobile accessibility. Logs and final-source delivery evidence are recorded in `docs/progress.md`.

This stage does not establish live payment evidence, account-sale review eligibility, final moderation/legal policy, review abuse operational staffing, traffic targets or production readiness. The shared route rate limit is 600 requests/hour per applicable identity/IP bucket; deployment traffic and abuse limits require operational qualification.
