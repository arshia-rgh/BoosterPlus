# DI03 discovery and content — scoped senior design review

Base: `6abe96536ec4e3cd0c0ae6ec89bf8f543a5bf697`. Reviewer: `/root/di03_design_review`, separate senior UI/UX designer. Scope: the changed catalog availability, metric-policy and promotion editors; homepage introduction and legal-section authoring; affected validation/focus behavior; immutable policy display. This is not a whole-product acceptance or a review of future DI04 pages.

## Round 1 — FAIL

| Finding | Impact | Correction |
| --- | --- | --- |
| UX01 · P1 · optional introductions/metric controls | Switching off and on discarded unsaved values. | Keep local draft values separately from publication inclusion; component and browser retention assertions. |
| UX02 · P1 · local content validation | Authoring mistakes appeared to be a transport outage, with no useful correction path. | Map local validation to the existing accessible error summary and registered fields; focus the selected field and preserve the draft. |
| UX03 · P2 · account promotion target | Raw minor-unit prices were difficult to interpret. | Use the standard currency formatter; browser assertion verifies USD 123.45 rather than an unlabeled 12345. |
| UX04 · P2 · policy kind selector | Changing kind remounted the row and lost keyboard focus. | Stable editor-only identity, excluded from saved JSON; keyboard assertions retain focus then advance to title. |

## Round 2 — correction required

The reviewer inspected updated 1280/768/320 captures, current account loading failure/retry, metric/availability/promotion controls and historical policy rendering. The four source fixes and retained-draft/focus assertions were confirmed. No additional layout/readability issue was found. One follow-up remained: replace schema-generated validation wording with plain field instructions.

## Round 3 — PASS

Plain instructions now say “Enter a title”, “Enter a description” and bounded numeric/text requirements. Unit tests cover the translation. The fresh complete frontend run passed its desktop policy journey; the reviewer inspected its validation capture and confirmed the final wording, correct field association, clear focus and no layout regression. The refreshed mobile capture was also reviewed. Final explicit verdict: **PASS — no remaining actionable findings in the DI03 review scope.** All four corrections and the plain-language follow-up are verified in scoped rendered evidence.

## Evidence and limits

- Changed real browser journeys: `frontend/tests/e2e/catalog-admin.spec.ts` and `frontend/tests/e2e/admin-policy.spec.ts`, against isolated TiDB/SMTP fixtures. Responsive and accessibility assertions cover 1280, 768 and 320 CSS pixels.
- Ignored initial/focused captures: `frontend/test-results/di03-desktop/`, `di03-mobile/`, `di03-policies-desktop/`, `di03-policies-mobile/`.
- Fresh complete-run captures: `frontend/test-results/desktop/`, `mobile/`, `policies-desktop/`, `policies-mobile/`; `di03-content-validation.png` captures the last wording correction. These runtime files are not committed.
- Account selector outage/price options use explicit isolated browser API fixtures; actual account reservation/availability is independently exercised by the TiDB suite. Browser fixtures do not qualify real payment, inventory or production activity.
- Physical-device, assistive-technology and owner acceptance remain separate. A scoped PASS means no actionable issue found in this review, not proof of defect-free software. Full automated gates remain required before delivery.
