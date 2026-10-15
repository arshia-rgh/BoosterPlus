# UX159 — additive theme, sign-in and form clarity

Owner-authorized combined implementation, 15 October 2026. Base: `7cdf812`.

## Scope and acceptance

1. Apply the approved restrained champagne details to existing green public, customer, admin and booster screens. Preserve artwork, green headings, primary actions and semantic status colors.
2. Shared split-screen sign-in: artwork left, one authentication panel right, official Google artwork and email together. Preserve independent identities, consent, invitation eligibility, authenticator requirements, recovery and cooldowns.
3. Persistent inline validation, first-invalid focus and scrolling, retained values, and visible fallback feedback across active form families. Cover native constraints, API issues, nested/conditional fields, disabled-field races and editor previews.
4. Simplify repetitive explanatory text and improve shared spacing/alignment without rewriting accepted legal, commercial or security terms.
5. Five visible homepage service choices controlling a horizontal stage, inspired by the observed JetBrains selector. Include adjacent previews, keyboard controls, responsive layout and OS reduced motion. No autoplay or scroll hijacking.

## Review and qualification

Independent reviewers: `/root/release159_senior_design` and `/root/release159_form_review`. Source review identified native form feedback gaps, disabled-field focus races, authoring-preview errors, unnamed action fields and unmapped combination rules. Both reviewers returned PASS after corrective round trips, including32 final form checks and retained visual parity/select-height evidence. See `redesign/reviews/UX159_2026-10-15.md`.

Use focused component, security and affected browser/integration checks only. Maintain full-suite coverage without running the full gate. No live messages, invoice or funds tests. CI, signed image checks, server preflight and runtime verification remain required. No deployment or qualification pass is claimed yet. Off-host recovery remains unavailable; earlier release-specific approvals are consumed.

Sources: [JetBrains](https://www.jetbrains.com/#air-for-devs), [Google branding guidance and approved assets](https://developers.google.com/identity/branding-guidelines), approved ACCENT158 preview.

## Implementation details

The green surfaces, hero emphasis, prices and semantic statuses remain unchanged. Champagne rules are loaded with their owning page families. Authentication uses one shared consent control and one panel for Google/email, with retained invitation help, recovery and staff MFA. The Google G is the unmodified official asset downloaded from https://developers.google.com/static/identity/images/g-logo.png; the white button follows Google’s published branding guidance. No third-party asset host is contacted at runtime.

Shared validation now reads native constraints into persistent inline messages; named action fields and confirmation controls register their labels and focus targets. Errors retain input, wait for disabled controls to re-enable, focus the first field in page order and avoid moving focus during correction. Unmapped server errors remain visible. Seller titles/notes and catalog combination rules return actionable paths without changing acceptance rules. Custom-order rejections reveal the correct step and survive that transition. Chat replies and authoring preserve protected-field handling and uncertain-send idempotency.

Backend changes are validation paths/messages only: no schema, identity, authorization, price, financial-state or storage changes. Retained current release supports schema43 application rollback. Full qualification remains paused under the owner's standing focused-check policy.

## Evidence in progress

- Focused race-enabled catalog/submission unit cases passed.
- New regression cases cover native sign-in constraints, seller API rejection, unknown errors, chat correction and authoring recovery, and both custom-order stages.
- Original failed frontend runs are retained in `frontend/.cache/ux159/`; fixes update obsolete guide expectations and preserve their authorization assertions.
- Production build caught a shared-CSS budget overrun. Page-family accents and existing account-only rules were moved to their owning stylesheets; all three builds now pass and shared CSS is 4069/4096 bytes gzip. No budget was raised.
- Built portal browser checks and final review/gate results are recorded below when complete. No full-suite pass, release or deployment is claimed by this draft.

- Final built-host checks passed in Chromium and WebKit at desktop/mobile sizes (three results per engine, including parent suite). The failed WebKit fixture replaced a document during a pending synthetic read; waiting for network idle before intentional hard navigation resolved the failure without filtering browser errors.
- Additional definitive chat-form rejection regression resets the calculated expiry and request key after an explicit rejection; ambiguous delivery keeps the exact original payload and key. Nine chat form component cases pass. The reviewer also identified native WebKit select sizing; scoped explicit height preserves its native arrow and a 48 px target.
