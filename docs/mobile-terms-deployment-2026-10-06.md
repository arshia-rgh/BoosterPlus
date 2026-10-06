# Mobile and terms release — 6 October 2026

Status: owner authorized scoped commit/push and deployment; preparation is complete, deployment pending.

## Approved scope

The owner requested mobile refinements across storefront/customer/booster/admin panels and readable numbered terms. The owner subsequently answered “its ok go for deploy” after the explicit question about using completed checks without repeating unrelated backend/database/production suites. This applies to this prepared update only. Existing off-host recovery deferral is still unresolved; this release must not fabricate backup/recovery evidence or activate finance/deletion. Preserve the signed schema39 application for compatible rollback and the deployed webmail121 configuration patch.

Mobile review: [scoped findings and evidence](redesign/reviews/2026-10-06-mobile-runtime.md). Terms review: [presentation and text-preservation evidence](redesign/reviews/2026-10-06-terms-readability.md). Both senior reviewers returned PASS after fixes.

## Qualification boundaries

Mobile128 completed 152/154 browser scenarios; two aggregate timeouts remained failures until the source-bound mobile129/131 focused reruns passed. The terms addition received separate Chromium/WebKit narrow/enlarged-text, accessibility, navigation, historical-version and print checks. Mobile132 passed current Go lint/gosec/live vulnerability checks, repository checks, all 137 frontend unit files / 454 tests at existing thresholds, frontend contracts/static/audit/build checks, nine server tests, both image scans and non-root/read-only smoke checks.

The complete unrelated backend/database/production gate was not rerun. A one-use continuation within the normal tracked commit gate must verify the parent, exact staged source and qualification receipt hashes, refresh repository and required Go security checks and record its consumed tree. The normal tracked hook/default gate remains intact. No held cameo/prototype or private runtime data belongs in the commit.

Exact-commit hosted CI and release artifact workflow, operator signature, server artifact verification, compatible schema/history, configuration and live health checks remain mandatory. The gateway one-shot validator must use isolated networking to avoid the known live static-address conflict; the actual candidate configuration must still validate. Current application data and policy wording/version remain unchanged.

## Deployment result

Pending. No new release or live success is claimed by this preparation record.

Automatic approval review rejected a proposed per-invocation private hook override. That command was not executed. The compliant alternative uses the normal tracked hook and an exact-base/source/log-bound continuation in `scripts/mobile_resume.py`, with negative scope/evidence tests. Clean checkouts and other revisions retain the normal gate; no hook configuration is changed.

The first normal-hook attempt passed repository checks, continuation tests, lint and gosec, then failed because the laptop received HTTP403 from the official Go vulnerability database. No commit was created and no continuation receipt was consumed. The same normal tracked hook will run against the exact source in the isolated server checkout, which has working database access; the resulting commit may be imported only after parent/tree/file-hash verification.
