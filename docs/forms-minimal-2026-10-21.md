# FORMS172 — minimal customer forms

Owner request, 21 October 2026: make every user-facing form minimal, easy and straightforward. Remove unnecessary explanatory text and definitions, fix field alignment and improve layouts where needed. Every change is reviewed and decided by an independent senior UI/UX designer. The owner also asked to remove the homepage service explorer's “Availability is shown on each game page.” note. Then deploy through the normal signed procedure.

## Boundaries

- Scope: customer-facing storefront forms and the shared form primitives they use. Staff authoring forms change only through shared components.
- Preserve legal/consent controls, payment/network instructions, protected-credential warnings, fee/commission/refund disclosures, owner-authored catalog/product text, accessible required indication, error association, focus behavior, validation and business/security logic, and the green/champagne direction.
- Focused checks only; no full gate. No publication, message, invoice or funds test. A fresh exact recovery decision is required after the signed candidate and preflight.
- User-owned prototype/cameo files remain untouched.

## Changes

- Homepage service explorer: removed the shop/news “Availability is shown on each game page.” note and its unused style.

- Every customer form family follows the senior designer's decisions S-01–S-09 and F-01–F-140 (except owner-authored catalog help F-35): one green field system, aligned two-column grids, unframed nested fieldsets, aligned checkboxes, one action row with primary/secondary/destructive hierarchy, quiet required/optional flags, and much shorter task copy. Legal consent, payment route and funds-safety notes, protected-credential warnings, fee/refund disclosures and authored product terms are unchanged. Checkout's action is now "Go to payment".
- The shared stylesheet `frontend/app/ui/forms.css` loads with the form-validation module because the root stylesheet is at its size budget.

## Review and qualification

Four rendered review rounds ended in **PASS**; findings, fixes and limits are in [the review record](redesign/reviews/FORMS172_DESIGN.md).

Local focused evidence on the final source: 991/991 component tests; 146/146 self-hosted fixture browser cases on desktop and Pixel 7 Chromium, including new regressions for field alignment, identity label gaps, filter-action alignment, supplier consent placement and secondary refresh actions; strict types, lint, formatting, repository checks and all three production builds with asset budgets. Customer fixtures now use the production `storefront-app` body class. Earlier failures are retained privately under `.cache/forms172/`: 46 stale-copy component assertions after the first implementation, two Vite dependency-cache races, a 5 px filter offset caught by the new regression, a phone-width drawer case, and one uncaptured readability failure that did not recur in 45 later runs. No full gate ran.

The normal hook, exact CI, signed image release, server preflight and a fresh exact recovery decision remain required before activation. No publication, message, invoice or funds action is included.
