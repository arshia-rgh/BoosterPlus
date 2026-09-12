# Admin operations, content and privacy

R09 extends the existing separate admin React application. Start both applications with `make -C frontend dev`; staff enter `/admin` after Google/email verification and an authenticator check. Application source remains in `backend/` and `frontend/`. `production/` contains deployment configuration and runbooks only. R10/R11 are deferred for owner review.

## Where to operate

| Task | Screen and authority |
| --- | --- |
| Review work and exceptions | `/admin`: current operational counts and links; financial quantities are not presented as revenue |
| Find orders and quotes | `/admin/orders`: intersect game, type, customer, state, assignee, UTC dates and search; existing immutable quote revisions, payment/fulfillment/proof/history controls remain on order details |
| Manage games and packages | `/admin/catalog`: existing structured references, conditional forms, estimate rules, scenario preview, capacities, scheduling, remedy policy and publication; `/admin/coupons` manages discounts |
| Find customers/staff | `/admin/customers`: 50-record pages, search and active/suspended/erased state; verified-email/MFA summary, order/support links and session metadata; reads are audited |
| Revoke access | Customer directory: recent staff verification required to revoke all target sessions; administrators cannot act on owners/administrators. Existing owner role/recovery controls remain. Erased identities cannot be restored |
| Answer messages | `/admin/support`: existing waiting/unread/resolved/assigned filters and split inbox, plus customer filtering; internal notes remain separate from customer-visible replies |
| Operate account resale | `/admin/submissions`, `/admin/accounts`, order handoff, `/admin/finance` and case/payout queues; R07 commercial acceptance and evidence requirements remain enforced |
| Edit homepage/policies | `/admin/content`: homepage and notification copy for administrators; account/privacy terms and retention policy for owners |
| Manage finance | `/admin/finance`: existing approved fiat/crypto routes, checkout/expiry/reconciliation policy and refund/payout controls. Provider credentials and runtime activation switches remain private deployment settings |
| Export reports | `/admin/reports`: receipts, refunds and seller payouts alongside existing operational reports; recent verification and an audited exact-preview download |
| Review private media | `/admin/media`: scan, binding, expiry and cleanup state; recently verified staff may retry exhausted unbound scans or remove unattached files. This never overrides antivirus or deletes bound evidence |
| Manage availability consent | `/admin/alerts`: customer/state filters, accepted consent version, suppression and delivery metadata. Recent staff verification can suppress a subscription; staff cannot manufacture opt-in or reactivate consent |
| Review deletion | `/admin/privacy`: owner only; explicit holds, policy review, retention date, erasure and confirmed file-cleanup finalization |
| Inspect tasks/audits | Existing `/admin/jobs`, owner audit search, session/recovery and staff-calendar tools remain available |

## Publishing content

Saving a draft does not change public content. Publication requires recent primary and authenticator verification, affirmative review and a unique version label. A stale editor receives a conflict; reload and review the newer draft. Published history is immutable and paginated. Restoring earlier content requires a new reviewed publication with a new label.

Homepage controls cover headline, description, notice, original hero artwork or gradient, rank labels and scene description, section visibility, FAQs, internal featured offerings, business email and support hours/timezone. The existing animated original rank scene remains responsive and supports reduced motion. Featured paths must point to allowed game/account routes; editable content accepts plain text, not executable HTML, scripts or remote media URLs. No prices, rank data or win-rate promises are inferred by these controls.

Activity/availability emails have reviewed subject, introduction and footer fields. Mandatory resource/sign-in links, consent checks, unsubscribe/preferences instructions and availability warnings remain enforced by the application. Notification copy cannot alter recipients, verification codes or provider configuration. Draft copy is never used for delivery; failure to load a published revision fails delivery instead of silently ignoring it.

Publishing account/privacy terms changes the version required for new sign-ins and order acceptance. Challenges issued under old terms cannot establish a new accepted session after publication. Existing order agreements retain their accepted revision. `/terms?version=LABEL` presents a historical published agreement. The original deployment `TERMS_VERSION` label is reserved, and its approved `ACCOUNT_TERMS_TEXT` must remain available for historical access. Production startup accepts a newer API terms version only when the matching published legal content is available. It fails closed on a mismatch or missing approved terms.

## Financial report interpretation

Reports use `[from, to)` UTC date bounds. Receipt rows are selected by first-recorded time; refund/payout rows by obligation-created time. Each row shows its current evidence state at the report observation time. Only confirmed evidence means completed funds movement. This is not a settlement-date accounting ledger, net revenue calculation or tax report.

Amounts remain exact decimal strings with asset and network. No cross-currency sum, exchange rate or fiat conversion is invented. Private recipient addresses, merchant references, provider credentials and customer email addresses are excluded. Exports are bounded JSON pages, with filters/cursor and exact preview digest checked again and an audit committed before bytes are returned. A changed page requires a new preview.

## Customer export

`/privacy` provides 21 independently paginated categories, up to 100 records per download: profile, orders, quotes, accepted contracts, order events, submissions/events, offers, conversations, customer-visible messages, receipts, transfers, reviews, favorites, availability alerts, notifications, cases/events, bookings, media metadata and fulfillment.

Every page requires recent email/Google verification and, if enrolled, recent MFA. Queries select only the caller's authorized records and explicit fields; internal notes, other customers, auth/provider secrets and vault payloads are excluded. Each download has an audit ID and observation time. Download all pages in each required category; separate pages are not a transactionally frozen whole-account snapshot. Binary attachments remain available through existing authorized conversation downloads, not embedded in JSON. Export files contain personal information and must be stored privately.

## Deletion policy and workflow

Deletion is disabled until the owner publishes and enables a retention policy in `/admin/content`. Every minimum period must be entered explicitly: financial, closed-dispute, audit and ordinary-support days, plus a grace period from the request. The owner must supply customer-facing retained-evidence and backup rules and explicitly approve preservation of financial/dispute/audit evidence. No country-specific legal duration or production policy is supplied by the application.

1. A recently verified customer accepts the current policy and requests deletion. Repeated/concurrent requests resolve to one active request. The customer can cancel before erasure.
2. The owner reviews the request with recent primary and authenticator verification. Active orders, seller-linked buyer orders/cases, appeal windows, unresolved payments/transfers, reservations, inventory/offers/intakes and unresolved support hold deletion. A separate manual hold needs an explicit reason; a routine recheck never removes it.
3. Once active records are resolved, review computes the earliest eligible date from the latest relevant record in each retention category and the request grace date. The longer of the currently published and originally accepted minimum periods applies. A later policy change requires another review. Owner holds require a separate explicit release action and fresh review.
4. The owner invokes erasure. The transaction rechecks identity, both factors, request revision, current policy, deadlines and live business holds under the shared authorization fence. Concurrent new orders and erasure cannot both succeed. Any cleanup/audit failure rolls the transaction back.
5. Erasure pseudonymizes the identity, clears profile/MFA/linked Google identity material, revokes sessions, deletes owned vault payloads/wrapped keys, suppresses notifications/alerts and removes favorites. It redacts customer-authored ordinary messages, eligible submission content and current order/fulfillment answers. Eligible private media becomes inaccessible immediately and enters retryable object cleanup.
6. The request remains `erased_pending_files` until the worker has deleted eligible objects and recorded purge completion. Tombstones cover the upload expiry plus an hour to catch in-flight writes. Owner finalization fails while cleanup remains pending; it does not treat a queued delete or storage timeout as success.

Preserved records include financial agreements, receipts, refund/payout routing/evidence, cases and audit history. Proof messages and messages/images explicitly cited by case events remain private evidence. Uncited customer-authored ordinary support is redacted; staff notes and accepted financial free-text are not indiscriminately rewritten. Published anonymous reviews and immutable commercial snapshots remain. Owner review must place a hold where additional records need investigation or legally required preservation.

“Completed” confirms the defined live application cleanup, not destruction of every historical financial/evidence record or every backup copy. Backup expiry, restore-time reapplication of erasure and storage-replica verification must follow the owner-entered policy and the deferred R10 production operations work. Publishing a notice does not itself implement or qualify a backup retention process. Do not enable deletion until those operational promises can be honored.

## Qualification and delivery boundary

Feature tests cover policy defaults/holds/staleness, owner/customer authorization, CSRF, strict input, export privacy/audit failure, rollback, legal revision acceptance, concurrent request/order fencing, exact financial units, session revocation, notification consent and real isolated object/scanner cleanup with preserved case evidence. Browser tests exercise ordinary journeys before the global policy-publication journey in a fresh database per device; both groups are mandatory, with no retries or skipped failures.

Every stage commit runs the complete root/backend/frontend/production gate. Reproducible evidence and failed attempts are recorded in `docs/progress.md`. Local TiDB unistore, isolated provider fixtures and local HTTPS drills do not qualify clustered production operation or live funds movement. R10 production operations and R11 controlled live qualification/launch remain deferred.
