# UX10 — Final UI qualification and owner review

Status: implementation and qualification in progress. UX01–UX09 delivery evidence is in `docs/progress.md`. R10/R11 remain held; this document does not authorize launch.

## Final corrections

- Accepted order agreements are collapsed after acceptance; exact totals remain in the order header and checkout stays prominent. Quote/terms acceptance is still explicit.
- Admin triage shows nonzero queues first and preserves zero-count destinations in a compact disclosure. No summed crypto revenue or invented activity.
- Empty seller commercial history and optional withdrawal are quieter. Actual offered/accepted arrangements and eligible payout obligations remain visible.
- Mobile marketplace filters use a native drawer with Escape/focus return, visible applied filters and result focus after applying.
- Removed the repeated activity title and humanized work states. Screenshot captures wait for actual loaded market/admin/case states.
- Completed independent social format masters, editable overlays, padded avatar and an optimized share image. Homepage metadata uses only an explicitly configured HTTPS public origin, never request headers or private account data.

## Route and state evidence map

These are actual fixture journeys, not a claim that every possible data combination was exhaustively tested. Shared layout stress covers 320/360/390/768/1024/1440 CSS px, short landscape, 200% root text and 320 px reflow. Authenticated journeys additionally exercise their narrow and desktop layouts, with long text/error states where relevant.

| Route family | Reproducible journey / states |
| --- | --- |
| `/`, `/games`, game/service/package detail and public reviews | `home`, `catalog`, `catalog-admin`, `review-journey`: published/absent catalog, dynamic goals/estimate, required agreement, safe draft/sign-in return, keyboard, failed art/no JS, reduced/reverse scroll and CSP |
| `/accounts`, `/accounts/:id` | `resale-journey`: URL filters/back, loading/empty, reviewed gallery/Escape/focus, explicit terms, reservation, sold/stale state, protected delivery |
| `/login`, `/account` and settings/security/preferences | `identity`, `account`: email verification, settings, sessions/logout, role MFA, safe return and mobile focus; component/server tests cover Google callback validation |
| `/privacy`, historical `/terms` | `admin-policy`: explicit retention enablement, holds, export/download, terms publication and later erasure state; backend tests retain financial/audit evidence |
| `/orders`, `/orders/:id` and quote/payment/case/review panels | `orders`, `order-workspace-journey`, `payments`, `review-journey`: filters/back, revised quote and consent, accepted total, denial/retry, paused checkout, fixture payment/refund evidence, case history, eligibility |
| `/support`, `/support/:id`, linked order/booster conversations | `support`, `chat-ux-fixtures`, `fulfillment`: reader anchor, new messages, unsent draft, reconnect/outage, attachment failure, audience and assigned-only boundaries |
| `/sell`, `/sell/new`, `/sell/:id` | `submissions`, `resale-journey`: draft/save/submit, clarification, review, withdrawal, both commercial models, expiry tests, private source access, handoff and payout terms |
| `/favorites`, `/availability`, unsubscribe, `/notifications`, `/reviews`, review detail | `catalog-admin`, `availability-journey`, `support`, `review-journey`: save/remove/reorder, explicit alerts consent/unsubscribe, unread/read, moderation and refund labels |
| `/booster`, assigned list/detail/calendar/support | `identity`, `fulfillment`: authenticator, assigned-only access, account/together modes, schedule/DST/conflicts, holds/proof/complete review; component polling cleanup |
| `/admin`, orders/detail/support/detail/calendar | `identity`, `operations-journey`, `orders`, `support`, `fulfillment`: actionable triage, directory separated, quotes, cases, scheduling and staff audience |
| Admin catalog/coupons/accounts/submissions and details | `catalog-admin`, `submissions`, `resale-journey`: editable release, save/preview/publish, stale/unsaved handling, ownership review and exact commercial terms |
| Admin finance/reports | `payments`, `resale-journey`, `reports-journey`: URL views, preserved policy draft, reconciliation feedback, exact asset/network, refund/payout evidence and preview freshness |
| Admin customers/media/alerts/content/privacy/jobs/reviews and details | `identity`, `operations-journey`, `availability-journey`, `admin-policy`, `review-journey`: role restrictions/MFA, media states, publication/retention controls, task recovery and moderation |
| Not found, signed out, denied/revoked, unavailable and navigation recovery | `catalog`, `identity`, `order-workspace-journey`, `chat-ux-fixtures`, component suites: 404/injection, no private SSR data, stale request rejection, retry and denied resource clearing |

## Reproduction and evidence

Use the pinned dependencies (`npm ci --include=dev`) and Playwright browsers (`npx playwright install chromium firefox webkit`). With dedicated synthetic TiDB, SMTP, scanner and storage configured, `make -C frontend test-cross-browser` builds both apps and runs the same complete fixture suite sequentially in all three engines. Project names stay desktop/mobile so every engine gets fresh isolated fixture populations. Firefox does not implement mobile browser emulation: its mobile project is a narrow touch viewport, not a Firefox Android certification. WebKit's iPhone profile also does not replace actual iOS hardware review.

`motion-recording.spec.ts` records videos of native forward/reverse rank scrolling, each articulated character and reduced-motion return, and `home.spec.ts` records frame intervals, transfer and layout-shift metrics. Unsupported browser performance entry types are recorded as null. Chromium retains the required CLS budget; all engines retain CSP, same-origin transfer, responsive behavior and rendered interaction assertions. Headless local frame timing is diagnostic evidence, not a promise of device FPS or deployed Core Web Vitals.

Safari keyboard testing uses [Apple’s documented Option-Tab](https://help.apple.com/safari/mac/8.0/en.lproj/cpsh003.html) to include links under its default keyboard policy. Dialog triggers explicitly receive focus before opening, and the focused report region supports arrow-key scrolling without intercepting child controls.

Final counts, engine versions, inspected captures and full-root-gate outcome are recorded below only after running. No required failure is skipped. Image and bundle thresholds remain unchanged; the share image has its own 500 KiB bound and is not ordinary homepage transfer.

## Owner acceptance still needed

Review the development storefront and `/admin`, then use synthetic customer/staff accounts to inspect account overview, chat reading/composer, quote versus fixed checkout, seller offers, and staff triage. The five-second status comprehension and task-time targets require a human review; no measured usability score is claimed. Actual iOS/Android software-keyboard behavior and VoiceOver/NVDA interaction have not been qualified by desktop automation. These are explicit review items, not silently claimed passes. Character motion is articulated 2D imagery, not a full game model or skeletal animation.

All implementation scope ends at UX10. Publication-rights review, real merchant transaction checks, operator policies, selected locale/RTL qualification and the full deferred operational rollout remain in `final-launch.md`. Do not resume R10/R11 without separate authorization.


## Local review entry points

Run `make -C backend dev-up`, then `make -C frontend dev`. Defaults are the storefront at `http://127.0.0.1:5173` and staff workspace at `http://127.0.0.1:5173/admin`; use the single shared origin printed by the launcher for authentication. Sign in with your own authorized account; staff still require their authenticator. Fixture identities used by tests are temporary and are not reusable login credentials.

1. Homepage: scroll slowly forward/back through rank transformation, switch the three game characters, then choose Reduced motion.
2. Account and chat: identify the next order action, open its conversation, read older messages, write a draft, and inspect attachments without sending real private access details.
3. Checkout and selling: compare a custom estimate with an accepted total and a fixed package; inspect the two seller payout triggers. Review only—no real payment is needed for UI acceptance.
4. Administration: use waiting queues, search modules, review catalog sections and the separate finance views. Inspect account activity and the booster calendar on a narrow viewport.
5. Social assets: open `docs/brand/playora/social/README.md`; use the independent PNG backgrounds or editable SVG overlays. Existing fonts, website background and green theme remain.

Report a route, viewport and observed interaction for any remaining issue. The next action after this handoff is owner review, not R10/R11 implementation.


## Alternate-engine qualification — 14 September 2026

Playwright 1.63.0 pins Chromium 153.0.8010.12 (revision 1243), Firefox 155.0 (1543), and WebKit 26.6 (2359). Firefox and WebKit each passed all 54 journeys: 26 ordinary plus one policy test for each desktop/mobile fixture population. No retries, skipped failures, increased timeouts or reduced thresholds. Logs are `.cache/ux10-firefox.log` and `.cache/ux10-webkit.log`; per-engine screenshots/videos/metrics are retained in `.cache/ux10-evidence/`. Additional isolated users use matching narrow viewports; these are not actual mobile hardware/keyboard tests.

| Engine / viewport | Initial encoded bytes | CLS | Median frame interval | p95 frame interval |
| --- | ---: | --- | ---: | ---: |
| webkit / desktop | 893691 | Unavailable | 31.00 ms | 43.00 ms |
| webkit / mobile | 625636 | Unavailable | 36.00 ms | 67.00 ms |
| firefox / desktop | 893977 | Unavailable | 16.67 ms | 33.34 ms |
| firefox / mobile | 625922 | Unavailable | 16.66 ms | 16.72 ms |

These are short local, unthrottled headless samples. Unsupported CLS is unavailable, not zero; Chromium's mandatory CLS budget remains in the full gate. No external resources or CSP violations were observed in these homepage checks. The optimized share image is 423850 bytes (below 500 KiB) and is metadata-only.

Inspected the loaded admin desktop/mobile triage, narrow marketplace, checkout/case/seller/account/chat captures, all three character scenes, rank checkpoints and social overlay formats. The final full root gate, Chromium outcome and delivered revision are recorded after completion.


Review media: [desktop motion recording](media/playora-motion-desktop.webm), [narrow motion recording](media/playora-motion-mobile.webm), and [social layout preview](media/playora-social-square-preview.png). Videos are local WebKit recordings of public pages only, with fixed 1280 × 720 recording canvases; the narrow viewport is letterboxed. Native website interaction remains the main acceptance surface.
