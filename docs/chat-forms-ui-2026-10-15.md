# Chat forms and interface cleanup

Owner request, 15 October 2026. Base `dd5b698`; production `4d01c1b`, schema 42. Implementation and scoped qualification are recorded below. Release signing/preflight/deployment remain pending.

## Requested behavior

- An administrator can request a form inside any existing customer or shared booster conversation, choosing ordinary and secure fields. The intended recipient fills and returns it in the same conversation. An administrator can also send completed details securely to an intended recipient for delivery.
- Use short in-thread cards and a focused form dialog, with a clear recipient, purpose, expiry and next action. Keep ordinary answers readable; secure answers require an explicit protected reveal and disappear on blur, navigation or timeout. Never place secure answers in message bodies, notifications, event streams, browser storage, URLs or logs.
- Remove the separate Secure handover tab and credential publication prerequisite. Consignment listings may publish before anyone supplies credentials. Request access when staff need it. Keep actual buy-first payment, accepted commission/terms, reviewed public content, payment-confirmed delivery, inspection, dispute and payout checks.
- Preserve historical protected transfers and accepted agreements. Previously saved access remains available through a clearly labeled chat control; do not copy secrets into ordinary messages. New requests use the in-chat workflow.
- Review the full public/customer/admin/booster page inventory for alignment, unnecessary prose, inconsistent spacing and unclear next actions. Preserve the green theme and meaningful terms, field help, error recovery and accessibility. Correct reusable components first, then page-specific findings.

## Implementation sequence

1. Explicit SQL migration and Ent mappings for immutable form definitions, recipient-bound replies and chat references. Reuse the existing envelope encryption and expiry cleanup. Enforce authentication, current membership/assignment, recipient isolation, fresh protected actions, bounded fields, idempotency and concurrent response/cancellation checks.
2. Chat form authoring, answering, sharing, cancellation, expiry and protected reveal. Operational forms integrate with boosting access and account delivery/payout checks; ordinary forms never silently satisfy delivery or payment requirements.
3. Remove standalone handover UI/publication gating, preserve old data access in chat and make the next step reflect the new workflow.
4. Apply the senior review's site-wide layout/copy fixes and record coverage across representative states and phone/tablet/desktop widths.
5. Focused security/static/unit checks plus affected isolated database/browser cases; senior rendered fix/review rounds. Maintain the complete suite without running it unless requested.
6. Normal main commit/push, exact CI, signed images/security checks, schema preflight and deployment. Obtain the release-specific recovery decision once the concrete signed candidate is ready if off-host recovery is still absent. No live test mail, invoice, account publication or funds movement is authorized.

## Evidence

- Explicit SQL migration 43 adds chat forms and protected form references. No Ent migration is used. Customer, admin and booster identities remain separate. Forms enforce current membership, explicit recipient/booster scope, paid operational access, fresh protected actions, encrypted answers, audited reveal, expiry and idempotent responses. Completion/reassignment/refund/privacy cleanup retires applicable access. Ordinary forms cannot satisfy operational delivery prerequisites.
- Isolated race-enabled TiDB checks passed: db3 (11 scenarios, 137.553s; manifest `fa5491815b979c5b139cd22b4d824fa80a305cb817f554d2b98c7e817d71b20e`) and db4 (5 scenarios, 62.248s; manifest `a2e0cd592ea1c62f4a232fe42a07603b9f5d61a55f23241333e0274d8567d8e7`). Coverage includes encrypted storage, HTTP/export secrecy, current assignment, audit rollback, concurrent retries, paid buyer delivery/disputes, credential-free consignment publication, buy-first payment and retained fulfillment behavior. Subsequent backend edits only resolve lint without changing behavior; contract formatting is semantic-preserving.
- Backend lightweight stage passed: golangci, standalone gosec, race unit checks, migration validation and builds. The primary Go vulnerability database returned HTTP403; the official Google storage mirror completed successfully with no reachable vulnerabilities. No live scan was waived.
- Scoped frontend tests passed, including six form cases and a 28-case retry after correcting outdated chat/terms fixtures. The normal commit hook still qualifies the complete component/static/build scope; the complete repository/database/browser suite is not requested or claimed passed.
- Selling-flow Chromium: 11 cases passed initially, one outdated fixture status expectation failed; that single corrected case then passed. WebKit: all 12 passed. Widths 320/390/768/1280, error states, preview/consent and buy-first payment blockers are included. Full payment/resale/fulfillment browser journeys were maintained for the new chat flow but are not claimed executed in this focused release.
- Senior rendered review PASS after three rounds: [review record](redesign/reviews/CHAT154_2026-10-15.md). Shared-route and form states use synthetic data; unavailable fixture endpoints cover error presentation only. No claim of every live account/state or assistive-device combination being tested.
- Production configuration/preparation checks passed. They are not a production restore or activation. All failed attempts remain in private `.cache/chat154` evidence; server database receipts are under `/srv/playora-qualification/chat154/db3` and `db4`.

## Release and recovery boundary

No live test messages, email, account publication, invoices or funds movement occurred. Preserve checkout enabled, automatic outgoing transfers and customer deletion disabled, existing policies/catalogs and private webmail. Migration43 is forward-only through the CLI; reverting the old application after chat-form data exists is unqualified. Off-host recovery is still absent. Obtain the exact-release recovery decision after signed-image checks and server preflight, then record the actual deployment result.

## Activation incident and focused correction

The owner approved exact release4395194 with the stated recovery risk. Its first activation stopped before migration43 because TiKV refused writes below its free-disk safety threshold. Only disposable compiler and old scanner caches were cleared; production data, images and original evidence were preserved. Read-only inspection confirmed schema42, no migration lock, no migration43 journal/DDL and no active application query before resuming.

Migration43 then applied and verified, but API startup exposed a stale readiness expectation: `conversation_messages.purpose` still expected `varchar` although migration43 changes it to `enum`. The application remains stopped while a narrow forward correction is qualified and signed. The correction updates the startup type expectation, checks the new form references/unique keys, and adds a real-database regression covering schema42 rejection, successful schema43 startup and incompatible type drift. Migration SQL and data remain unchanged. Original failed deployment receipts are retained; 4395194 is not claimed deployed successfully.
