# SHOP182 — shop price and region-badge hotfix

Owner requests, 23 October 2026: remove “From” from shop prices, make amounts bold like account prices, display prices on product detail pages, explain why Global diamonds start at 344, and add small region flags/globe to existing product images. No price, markup, publication, purchase-setting or schema change is authorized by this UI patch.

## Presentation

- Bold champagne price immediately below each card/detail title, visible independently of sign-in, quote creation and supplier buying availability.
- Fixed offers show their exact published price. Differently priced manual options show a currency-specific range with “By option”; minimum-quantity context stays where needed. Currencies remain separate, and exact integer amounts avoid floating-point conversion.
- Supplier publication already prices its minimum quantity. It is displayed unchanged, with a short quantity caption for variable offers; actual checkout still requires its authoritative current quote.
- Existing artwork stays unchanged. Small noninteractive upper-left badges use a globe for Global, country flags for explicit supported public regions, and both flags for Singapore/Malaysia. Unknown regions retain their written names without a guessed flag. Loading/error image states keep the badge; region text remains available to assistive technology.
- Static flags are vendored from flag-icons v7.3.2, MIT (Panayiotis Lipiridis), with its license at frontend/public/region-flags/LICENSE.txt. Only seven required countries are included; no third-party runtime image requests or dependency.

## Why the smallest Global products remain private

Fresh authenticated GET-only Nexus catalog inspection on 23 October returned 236 MLBB offers. The API explicitly reports metadata.isReleased=false for 86, 172, 257, 706, 1412, 2975, 3688 and 6000 Global Diamonds. It reports true for 344. Seeing 86 in the provider dashboard does not override that explicit release state or the owner's instruction to hold these eight offers. This hotfix does not import or publish offers. Private source snapshot and corrected metadata-path summary: .cache/shop182/nexus-mlbb-current.json and source-availability.json. The initial diagnostic summary incorrectly looked at a top-level field; it is superseded by the metadata-based summary, not treated as availability evidence.

## Deployment and qualification

Signed `ad71d07cd7c6131cfcd06e3479ff6cc34a5832cb` is deployed and verified on 23 October 2026 at unchanged schema50 after the owner's exact approval “Deploy ad71d07 shop price and region hotfix without an off-host backup”. This one-release recovery exception is consumed.

- Server-only types/lint/format checks, 46 scoped component cases and four distinct responsive fixture browser cases passed. Independent senior design review passed after source corrections and four evidence rounds; see [review](redesign/reviews/SHOP182_DESIGN.md).
- The normal frontend/repository hook passed 217 component files / 1,040 cases, 14 server cases, 24 repository-script cases, dependency audit and all three portal builds.
- Exact CI39960519417 attempt2, signed-image build/scans39964411813, signature verification and live server preflight passed. The unchanged backend and database suites were not rerun. No full gate or local tests ran.
- Post-deployment: all eight application/mail services healthy; schema50, protected runtime/policy settings, HTTPS redirects and private webmail verified. Eleven live GET/HEAD-only browser cases passed: card/detail prices and Global globe at1440/768/390/320, Indonesia flag, Singapore/Malaysia paired flags, and customer sign-in entry. Card and detail prices match, with no horizontal overflow at those widths.

Source is based on525e43d. Concurrent DISCOUNT179 source and prototype/cameo work are preserved and excluded from this release; the combined uncommitted discount working tree is not qualified by SHOP182. No catalog, policy, markup, purchase-setting, identity or schema changes occurred. Checkout stays enabled; supplier purchases, outgoing transfers and customer deletion remain disabled; Vendoria remains absent. No live order, publication, invoice, funds, message or customer-data test occurred.

## Preserved failed evidence and limits

First-pass test-only lint/template-type failures were corrected and retained. The first local adoption stopped on concurrent appended CSS before changing the branch; the second used a reviewed merge preserving the other author's work. Bulk collection of screenshot evidence timed out, and individual files were retrieved without changing the tested source.

CI39960519417 attempt1 failed an unchanged image-upload focus assertion (`app/media/intake-image.test.tsx`): the body was focused instead of the upload button, with1,039/1,040 cases passing. The normal server run passed all1,040 cases; twelve isolated instrumented server diagnostics also passed. A single bounded retry of the failed job passed unchanged. The root cause is not proven, and this release does not claim to fix that intermittent focus behavior. No assertion, test, threshold or security rule was suppressed. Original run/jobs/logs and the diagnostic disposition remain in the private evidence.

Fixture and live Chromium checks cover the stated widths and flows, not every physical device or assistive technology. No real purchase or financial behavior was exercised by this presentation-only hotfix.

## Recovery and evidence

Current manifest: `/srv/playora/releases/ad71d07/deployment.env`. Previous signed4b9296d is retained at the same schema; application rollback remains unqualified and off-host server/data recovery remains unavailable. A forward fix may be required. No reusable recovery exception is granted.

Private evidence: `.cache/shop182/` and `/srv/playora-qualification/shop182/`, including source binding, focused checks, independent review, original failed evidence, exact CI/build evidence, signatures, preflight, literal approval, activation and live verification. Stable99f60bd runtime tooling/configuration, accepted catalogs/contracts/policies and private webmail are preserved.
