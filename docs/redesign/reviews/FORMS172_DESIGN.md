# FORMS172 — senior UI/UX form review

Scope: every customer-facing form family plus the shared form primitives they use (see `docs/forms-minimal-2026-10-21.md`). Reviewer: an independent senior UI/UX designer agent, separate from the implementing agent. The reviewer decided and verified; it did not edit repository files.

## Round 1 — audit and decisions

Evidence: read-only live rendering of `playoragames.com` (non-GET requests aborted, no sign-in, nothing typed or submitted), synthetic Vite/Playwright fixtures at 1440/768/390 px, and source review where a family could not be rendered (checkout errors, order detail, composer, refunds, cases, fulfillment secrets). Fixture artefacts (oversized group headings in two fixtures, unmocked "Connection unavailable" panels) were excluded from findings.

Shared-system decisions:

| ID | Severity | Decision |
| --- | --- | --- |
| S-01 | High | One green field palette (`--field-bg`, `--field-line`, `--field-hint`, 48 px controls, 1rem text) for storefront/booster controls; navy inputs removed from customer pages; admin palette unchanged. |
| S-02 | High | Field anatomy label → control → hint → error with 0.5rem rhythm; spacing only from the parent grid; remove per-field divider lines and uneven coupon gap. |
| S-03 | High | Two-column top-aligned field grids, one column below 640 px; bottom-aligned filter bars with an action cell. |
| S-04 | High | No second fieldset frame inside cards; consistent section and group legends; win-rate options unboxed; no doubled inset below 640 px. |
| S-05 | Medium | Checkbox/radio grid aligned to the first text line; hero choice rows lose the 1rem label margins. |
| S-06 | High | `.form-actions` row, one button scale, one primary first, secondary outline, destructive variant for disable/sign-out-everywhere/revoke; refresh actions secondary. |
| S-07 | Medium | Keep "(required)/(optional)" inside accessible labels but render it quietly. |
| S-08 | Low | No pointer-focus box on programmatic focus targets. |
| S-09 | Medium | Sentence-case labels for raw enum values (order status options, privacy categories, alert email state). |

Per-family decisions F-01–F-140 covered sign-in/MFA/recovery/settings, custom boost and fixed packages, shop (manual and supplier), account marketplace, selling an account and photos, checkout/refunds/cases, support, reviews, availability alerts, privacy, orders, customer game-access secrets and attachments. Every cut kept legal/consent text, payment route and funds-safety instructions, protected-credential warnings, fee/refund disclosures and owner-authored catalog/product content. F-35 lists optional owner-authored catalog help edits; they need normal owner authentication and are not part of this release.

## Implementation round 1

All shared decisions and F-01–F-140 except F-35 were implemented. Engineering adjustments sent back for review:

- The new `app/ui/forms.css` loads with the shared form-validation module, not the root, because the root stylesheet was already 4069/4096 gzip bytes of its budget.
- Sentence-case status labels apply to the customer order filter options only, leaving staff status badges unchanged.
- Additional short copy edits (order-stage note, restored-draft note, summary guidance states, intake screenshot note, draft title label, duplicate photo heading) and accurate wording where a decision would have narrowed a fact ("authorized staff" rather than "assigned staff"; a paused alert state).
- Customer fixtures now use the production `storefront-app` body class so rendered checks exercise the real field system.

Automated evidence for this round: 991/991 component tests; 142/142 fixture browser cases on desktop and Pixel 7 Chromium, including new regressions for sell-form field alignment and shop filter action alignment; all three production builds with asset budgets. The first new shop regression found a real 5 px select/button offset and then a wrapped-row expectation; both were corrected and retained in private evidence under `.cache/forms172/`.

## Round 2 — rendered verification: FAIL

The reviewer re-rendered fixtures at 1440/768/390/320 px, compared against an extracted base `fd347e6`, inspected the built route manifest and reviewed checkout source. Most decisions were verified (shared palette, flags, focus, dividers, hero rows, destructive actions, sign-in/MFA copy, settings, custom/package copy, shop/marketplace/sell copy, checkout order and disclosures, support/reviews/privacy/orders). Engineering choices (a)–(h) were accepted; the shop filter layout was not.

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| R2-01 | High | 29 px label-to-control gap in identity forms (shared margin rule outranked `.ui-field` labels) | Rule excludes `.ui-field > label` and `.catalog-label > label` |
| R2-02 | High | Supplier consent checkbox shared a row with the payment actions | Review children take full rows; actions 1rem below |
| R2-03 | Medium-high | No gap above the coupon field | `--field-gap` above the coupon row |
| R2-04 | Medium | Filter actions stacked in a narrow column; not full width on phones | Actions own a full row; full-width stack below 640 px |
| R2-05 | Medium | Orders, marketplace and staff directory buttons misaligned | Shared filter grid and action row; regression added |
| R2-06 | Medium | Global button scale depended on which route loaded the stylesheet | Button scale limited to form contexts |
| R2-07 | Medium | 12 px inset remained in the lost-access dialog | Inline padding/margin removed inside the dialog |
| R2-08 | Medium | Uneven empty bands in the sell photo step | 8/20/16 px rhythm; empty containers hidden |
| R2-09 | Low-medium | Account alert form still nested | Inner card unframed; heading reduced |
| R2-10 | Low | Shop variant and quantity hints detached | Hints moved inside their fields |
| R2-11 | Low | Account reserve and marketplace legends missed | Reserve fieldset unframed; legends restyled |
| R2-12 | Low | Custom boost actions did not stack on phones | Primary first; full-width stack below 640 px |
| R2-13 | Low | Refresh sessions still primary | Secondary compact retry variant |
| R2-14 | Low | Security-email hint detached from its checkbox | Indented checkbox hint linked by `aria-describedby` |
| R2-15 | Low | Hero legend offset and count on its own line | Unpadded legend with the count on its line |

Round 2 corrections evidence: 991/991 component tests; 146/146 fixture browser cases including new regressions for identity label gaps, filter action alignment (staff directory, customer orders, desktop marketplace) and supplier consent placement; lint and formatting clean. The first 390 px run of the new filter regression timed out because marketplace filters live in a drawer at that width; the check is limited to desktop for that bar.

## Round 3 — verification: FAIL

The reviewer confirmed R2-01–R2-12, R2-14 and the intended action-row interpretation for R2-05, with no horizontal overflow at 1440/768/390/320 px and no admin side effects against the base build. Remaining:

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| R3-01 | Medium | Profile "Display name" kept a 24 px label gap from a base `.identity-card label` margin | Labels inside identity field containers have no margin; regression added |
| R3-02 | Medium | Narrowing the button scale (R2-06) returned off-form refresh actions to primary styling | Secondary treatment applies anywhere in the storefront; regression added |
| R3-03 | Low | Marketplace actions about 60 px below the fields | Action row margin removed inside the filter panel |
| R3-04 | Low | Hero picker legend 2 px right of other labels | Default fieldset inline margin removed |
| R3-05 | Low | Filter-bar buttons were 44 or 48 px | All filter-bar actions use the 48 px control height |

Round 3 corrections evidence: 991/991 component tests; 146/146 fixture browser cases; readability 42/42 across three repetitions. One readability failure (`toContainText`) during the first run after the change was not captured and did not recur; it is recorded as unexplained rather than passed.

## Round 4 — final verification: PASS

The reviewer re-rendered at 1440/768/390/320 px and confirmed R3-01–R3-05: profile label gap 8 px; the five refresh actions are 44 px secondary outlines; marketplace actions follow the panel's own row rhythm; hero and win-rate legends align with other labels; every filter-bar action is 48 px. A regression sweep of all round-3 passes (sign-in/MFA, lost-access dialog, supplier review, manual shop fields, coupon spacing, custom-boost actions, sell form, support/orders/alerts fields) found no regressions and no horizontal overflow. Admin supplier-library metrics remain identical to the base build.

Verdict: **PASS — no remaining actionable findings in this scope.**

Non-blocking notes recorded by the reviewer, outside this scope: the staff directory "Clear filters" remains a pre-existing primary button; game-shell statistics refresh controls are not forms and are unchanged; booster account forms were not rendered (they share the corrected storefront rules); owner-authored catalog help suggestions (F-35) remain an owner decision; moving the marketplace panel onto the shared filter grid is an optional follow-up.

Limits: synthetic fixtures and source review, not persisted backend journeys, live sign-in, provider checkout or real devices. Passing means no issues were found in this review, not that none exist.
