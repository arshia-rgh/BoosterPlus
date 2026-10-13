# Live estimates and shared service layout

This is the separate UI deployment requested after the commission/policy release. Base: `b0d7a9908f89ea782555438f0000f83c913cc3f5`. Implementation and scoped checks are prepared; this document does not claim deployment.

## Changes

- Admin custom-order Overview and Quote show the customer's original saved estimate, including its provisional breakdown or manual-review state. An accepted final quote stays distinct; later catalog changes do not recalculate the original amount.
- Custom preferences update the estimate beside “Build your next climb.” after a500ms debounce. Changed or incomplete selections immediately invalidate the old amount; stale responses, failed requests and expired estimates cannot revive it. Continue still performs fresh authoritative validation and estimation.
- Mobile uses a compact stable summary with accessible “Price & selections” details. The dialog traps keyboard focus, closes with Escape, returns focus and locks background scrolling. Short viewports avoid a sticky overlay. Price updates do not scroll or focus fields.
- Shared game, service and FAQ sections use consistent responsive inner gutters. Checkout's continuation is labeled “Go to payment”; provider, route and safe URL validation remain intact.

No backend, migration, dependency, provider or financial policy change is included. Independent accounts/MFA, historical agreements, disabled outgoing transfers/deletion and private webmail remain unchanged.

## Focused evidence

The final prepared implementation passed61 component tests across seven changed-flow files, including response races, expiry, retry, incomplete answers, original-versus-accepted admin prices and checkout continuation. Scoped TypeScript and lint checks passed. Five isolated browser cases passed in Chromium and WebKit:320/390/768/1280px price states, stable dimensions and scroll, dialog keyboard/focus/accessibility, and shared accounts/shop/package inner-gutter alignment. A corrected synthetic shop-capability assignment was typechecked and the affected shared-layout case passed again in both engines. Earlier failed browser attempts are retained, not relabeled passed.

The independent senior designer completed the required review/fix rounds and reported no remaining actionable findings for the nine changed runtime files. Round1 included direct local browser interactions; round2 inspected exact-source screenshots and browser results because the reviewer's browser surface was unavailable. The final actual runtime hashes are in `.cache/service149/review/round2-final.json`; all fixtures use synthetic data and never create real orders, payments or messages.

Normal focused commit checks, lightweight exact-commit CI, signed image scans and deployment/runtime verification remain separate required release steps. The complete database/browser suite is not run under the owner's current instruction. Real mobile keyboards, production authenticated workflows and real payment acceptance are not established by these isolated checks.
