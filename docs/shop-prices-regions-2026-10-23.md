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

## Qualification and release

Server-only types/lint/format checks, 46 scoped component cases and four distinct responsive fixture browser cases passed. Independent senior design review passed after source corrections and four evidence rounds; see [review](redesign/reviews/SHOP182_DESIGN.md). No full gate. Preserve first-pass test-only lint failures (non-null assertions/template types), fixes and subsequent evidence. Source is based on 525e43d; concurrent DISCOUNT179 work is excluded from this release and preserved separately. Normal frontend/repository commit checks, exact CI, signed image scans/verification and live server preflight precede activation. Activation requires the owner's fresh exact no-off-host-backup decision. Until then production remains 4b9296d/schema50. Supplier buying stays disabled.

Evidence and final review verdict are recorded alongside the release receipts under .cache/shop182/ and /srv/playora-qualification/shop182/.
