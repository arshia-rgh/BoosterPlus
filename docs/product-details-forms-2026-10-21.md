# UX169 — product details, game sections and forms

Owner request, 21 October 2026: simplify and improve all product-detail families and user-facing forms, separate each game's changing content from its persistent introduction/statistics and FAQ, correct FAQ answer spacing, obtain independent senior UI/UX review and deploy.

The owner subsequently clarified that another person is working on the pre-existing uncommitted shop/backend/order changes. Those files must remain untouched and must not enter this change's commits. Qualification and release preparation use an explicit owned-file manifest over `7f918472f0365d057517b51577cefdcc78c44444`, excluding the other person's changes and the preserved prototype/cameo directories. Do not stage the whole shared checkout.

## Changed presentation

- Fixed packages: padded included-content panel with readable label/value rows, a distinct delivery fact and shorter procedural copy. Published descriptions, fixed values, price, capacity and the verified-payment/access delivery clock remain authoritative.
- Custom boost details: remove the repeated introductory pricing paragraph; authored descriptions and quote/estimate-stage guidance remain.
- Game shell: restrained champagne/green rules and spacing separate the changing section from the introduction/statistics and FAQ. FAQ controls have aligned chevrons and dedicated answer insets, with native keyboard disclosure behavior and complete authored text.
- Account details: correct skin-collection disclosure padding, retaining gallery behavior, complete authored descriptions/terms, totals, commissions and inspection/support rights.
- Shop details: improve title/artwork alignment, terms reading space and wrapping of purchase steps through the clean shared stylesheet. Do not edit the concurrent shop component changes.
- Shared forms: consistent label/help hierarchy, top-aligned field grids, checkbox alignment, visible focus and compact inline validation.
- Specific form corrections: group directory filter help with its field and actions together; remove duplicated privacy/review guidance; clarify support subject help; keep protected chat-field guidance associated during errors; replace unexplained required asterisks with explicit text; flatten nested purchase-review cards and disabled fieldsets without removing consent or fieldset semantics.

## Review scope and evidence boundaries

The separate reviewer is `/root/senior_design`; round-by-round findings and rendered evidence are in `docs/redesign/reviews/UX169_DESIGN.md`.

| Family | Review and intended verification |
| --- | --- |
| Game hub, fixed package, custom boost | Source plus rendered desktop/tablet/phone; included values, field alignment, keyboard FAQ, validation focus, scrolling and separators |
| Account detail and purchase review | Source plus rendered gallery/empty-image, skin collection, complete terms, return/review flow and narrow/enlarged-text layouts |
| Manual and supplier shop | Clean committed components with changed shared CSS; synthetic options, recipient validation, review and delivery states |
| Seller intake, images and staff listing | Source plus synthetic narrow forms/authority validation; retain upload, review and uncertain-send guidance |
| Support and protected chat forms | Synthetic validation, required labels, guidance/error association, protected editing, keyboard dialog dismissal and focus return |
| Purchase review and availability alerts | Source plus rendered rating/feedback/policy/consent and readable field/action layout |
| Privacy/data export | Source plus rendered policy, export controls and truthful unavailable-deletion state |
| Login, MFA, recovery and settings | Source plus representative built portal checks; preserve separate identities, consent, mandatory staff MFA and verification |
| Admin authoring, filters and booster forms | Source inventory plus representative shared-control/portal rendering; retain business and security instructions |

Synthetic browser fixtures do not qualify persisted database journeys, real provider operations, email delivery, invoices, financial transfers or production customer mutations. The paused broader UX165 cross-role audit is not silently claimed complete. No catalog or listing publication is included.

## Qualification record

Private evidence is under `.cache/ux169/` locally and `/srv/playora-qualification/ux169/` on the existing qualification server. The preview is a clean archived source copy plus only the owned delta; the shared developer checkout and installed dependencies are not used as release inputs.

Retain the original setup/harness failures: local Python's unsupported tar extraction `filter` argument; preview helper's incorrect import path and initial sandbox listener refusal; initial sandbox SSH refusal; missing synthetic discovery/retention fields; missing theme wrappers in older seller/shop fixtures; and the first scoped lint failure for generic request-body stringification. These are not passing checks or production failures. Corrected source preparation and typed fixture request handling are separate attempts.

The initial dependency audit reported `GHSA-698v-4r3x-3vcv` in Vite 8.2.2. The [reviewed advisory](https://github.com/advisories/GHSA-698v-4r3x-3vcv) identifies 8.2.4 as the patched release on the same minor line. Only Vite was updated to 8.2.4, with its lockfile binding; the following server install reported zero vulnerabilities. Do not weaken the required audit threshold.

The four-round senior rendered review ended in **PASS** after both alignment and mobile-review-width findings were corrected. All identified form families received source review, with representative rendered coverage across the three portal shells. This is not an exhaustive every-state/persisted-flow qualification.

Completed focused results: strict types and scoped lint passed; the original45component cases had43passes and2stale-copy failures, followed by12passing cases in the two corrected files. The39affected Chromium browser cases had38passes and1obsolete corrected-message expectation; that1case passed after asserting cleared errors, retained help and continued focus. The5new readability cases passed WebKit, including 320/768/1440 package/FAQ layouts, validation/protected editing and enlarged account text. Three production portal builds and the desktop/mobile Chromium portal checks passed.

Retain the first built-portal failure for its obsolete `Your next session` heading; the current application uses `Your work overview`. Recovery-dialog screenshots were added to the maintained portal harness. Its first WebKit attempt reported a queue read aborted by the next cross-host navigation; the harness now waits for both the searched and redirected queue rows and read completion, without ignoring errors. The following bridge retry retained a second aborted searched-queue read and received the same row-readiness correction. The no-network attempt's container had no network interface, so WebKit's offline state correctly showed the application's connection-error page instead of a404. The corrected browser container uses its ordinary isolated bridge and still rejects every browser request outside its own local synthetic portal origins. The host WebKit dependency warning, unused host browser download and initial nonzero screenshot archive transfer are retained as setup/transfer limitations, not application passes.

The corrected WebKit portal run passed desktop and mobile with all cross-host, asset, privacy and page-error assertions intact (3 node-test records including the parent). Both browser engines now have passing built-portal evidence.

Normal hook, exact-commit CI, signed image release and preflight are recorded as they complete. The full gate is not requested. No activation or recovery exception is implied by this preparation record.

Production is currently signed `b700de1`, schema47, with supplier buying and outgoing transfers/deletion disabled. Preserve its configuration, credentials, policies and independent identities. Off-host recovery is unavailable; prior exact-release exceptions are consumed. Prepare the actual signed candidate and preflight before requesting the fresh exact recovery decision, if still required.


The first normal focused hook passed repository/backend checks and frontend format/type/lint, then failed1of971component cases (970passed,207files). The clean-base supplier-flow regression observed its newly rendered heading before the existing passive focus effect ran. Its exact focus assertion now uses `waitFor`, retaining the one-call quote payload and private-value assertions. The protected supplier-purchase implementation is unchanged. Original hook source/tree/log/result are retained under `failed-hook-1`; a focused supplier rerun and a fresh unchanged normal hook qualify the correction. No full gate ran.
