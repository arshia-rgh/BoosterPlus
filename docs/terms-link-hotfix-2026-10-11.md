# Terms-link accessibility hotfix — 11 October 2026

Status: focused qualification passed; signed release/deployment pending.

The owner requested fixing the remaining account-terms link accessibility issue, running related tests and deploying the hotfix without another complete suite. This is a new, bounded authorization for this CSS fix; it does not reuse the previous release's consumed waiver or claim that its failed full run passed.

## Change and scope

Base source: `579efb0e1bb50202d8e474a36c4e82e29bc83d2d`; current production release: signed `fb31bb082ee673c12c25e5959cd1151631e74640`, schema41.

Persistent underlining and a small underline offset make inline consent links identifiable without relying on color. The rule targets direct links inside `.identity-card .check` only. Existing focus outlines, green theme, card/navigation styling, link destinations and checkbox behavior remain intact. Email and Google sign-in use the same component across customer, admin and booster panels.

The existing failing layout scenario now also covers the booster panel and checks both consent links before hover and when focused. Its axe audit, six viewport widths, recovery disclosure and 200% text/long-label checks remain. No assertion is weakened or skipped.

## Verification and delivery boundaries

Use the scoped browser/accessibility regression in Chromium and WebKit, related identity unit tests, frontend build/type/format/lint checks, repository/secret checks and separate senior rendered UI review. Local browser tests use an explicit signed-out synthetic API; unknown routes fail closed. Initial fixture startup omitted its required proxy key and produced503; that failed setup is retained separately and corrected with a synthetic key. No real sign-in, external email or payment is exercised.

A private one-use commit receipt binds the exact staged tree and passed scoped evidence under this owner's instruction. Normal tracked hooks and future requirements remain unchanged. Exact-commit lightweight CI, scanned immutable release images, signature verification, production preflight and post-deployment checks still apply. No complete backend/database/browser suite is claimed or required for this bounded CSS change.

Deploy at the existing schema41 with identical backend configuration, portal origins, payment policy revision3, enabled checkout, disabled outgoing payments/deletion and private webmail. This is a same-schema application update; retain the previous signed schema41 release for application rollback. Off-host backups remain absent, as already disclosed and accepted in the immediately preceding deployment discussion; record that fact rather than a fabricated recovery pass. The owner explicitly requested this hotfix deployment in that known state. No provider transaction or external-message authorization is added.

## Focused results

All three frontend production builds and their budgets passed. Format/lint/type checks and 34 related identity unit tests passed. The expanded original layout/accessibility regression passed both desktop/mobile projects in Chromium and WebKit (four scenarios, each covering all three panels, six widths and 200% text). Senior reviewer `terms142_designer` passed 18 rendered route/width/engine cases and 36 keyboard-link checks with no actionable findings. Native macOS WebKit uses Option+Tab for links when its standard Tab preference skips anchors; both keyboard modes were distinguished honestly. See `docs/redesign/reviews/TERMS142_2026-10-11.md`.
