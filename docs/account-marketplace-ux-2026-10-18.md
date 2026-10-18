# ACCOUNTS166 — account marketplace clarity

Owner request: 18 October 2026. Base: delivered application `0dcc73c`, repository documentation checkpoint `6a16f6f`. The wider UX165 audit remains paused.

## Changed scope

Improve public account cards, account details and the purchase review without changing listings, pricing, availability or reservation behavior. Keep green and subtle champagne. Shared rendering also updates the private staff preview and the accepted account record in customer orders.

- Cards show a consistent square cover, clear account title, labeled rank/region, up to two authored attributes and the complete buyer total. Commission inclusion remains explicit. No-image and failed-image states are truthful; no game artwork is represented as an account screenshot.
- Details put the gallery and concise purchase summary alongside one another on desktop. On mobile, rank/region and the price/action come first, followed by screenshots, description and secondary help. Keyboard order follows this sequence.
- Complete authored sale, transfer, dispute and acknowledgement text remains in named disclosures. Delivery estimates, the initial inspection period and the continuing-rights qualifier stay visible. No legal or catalog content is rewritten.
- The review step contains the exact account, price breakdown and acceptance controls without repeating the whole gallery. Explicit consent, sign-in return paths, release-bound reservation, request recovery and idempotency are unchanged.
- Private staff preview reuses the card/read-only detail components, preserves temporary grants, image expiry and focus recovery, and never gains purchase/publication actions.

## Verification

Standing focused-check policy applies; no full suite. The separate senior designer reviews only these changed surfaces: [ACCOUNTS166 review](redesign/reviews/ACCOUNTS166_2026-10-18.md).

Focused component checks cover card facts/totals, historical prices, complete terms, private image expiry, gallery selection/errors, explicit acceptance, unavailable/signed-out/loading states and saved-request recovery. A maintained browser regression in `frontend/tests/portals/account-market.test.mjs` runs the actual built storefront with a synthetic GET-only API at 1440, 768, 390 and 320 pixels in Chromium and WebKit. It checks gallery keyboard/focus return, review/back transitions, sticky-header clearance, price/terms/consent, no-image states and overflow. Run after building with `node --test tests/portals/account-market.test.mjs` from `frontend`; set `PLAYWRIGHT_ENGINE=webkit` for WebKit. This is UI qualification, not persisted backend or real-payment testing.

Final focused component checks passed: seven files, 34 cases. The three portal builds and the maintained Chromium/WebKit browser regression passed at all four widths. Independent senior rendered review passed after four correction rounds: secondary controls, mobile source/visual order, review-step sticky-header clearance and narrow price-column alignment are resolved. The final review snapshot is `accounts166-v4`; eight final signed-in/out entry/back journeys passed. Retained checks cover long/sparse content, empty/error states, gallery keyboard handling, private preview and explicit consent.

Private source snapshots and review evidence: `.cache/accounts166/`. Preserve the initial local-listener sandbox denial, initial duplicate-text browser selector failure, review-scroll assertion failures, targeted lint correction and first focused-hook test-type failure. The latter required a readonly tuple annotation in the new test; application source did not change. These failed attempts are not passes. No physical-device or screen-reader session, persisted backend journey or real reservation/payment was exercised. The normal focused commit hook and signed release checks are recorded separately as they complete.

## Release status

Signed `95526065ba7e855ec2593953af78923c82404bb4` is deployed and verified. The owner explicitly approved “Deploy 9552606 account marketplace update without an off-host backup”; that exact-release exception is now consumed.

- The corrected normal focused hook passed repository, contracts, formatting, type/lint, component, dependency-security, three-build and 14 server checks. Local component totals were 203 files /941 tests, including the untouched user-owned cameo fixture. The clean tracked CI checkout passed 202 files /931 component tests; CI39109229072 also passed the required service-free backend/security and deployment-configuration checks.
- Image release39110634506 passed scans; the exact bundle's signature was verified before transfer and activation. The live preflight verified schema43, configuration, storage and dependency readiness without changing production traffic.
- Activation completed normally. All eight checked application/mail services are healthy, stable99f60bd mounted configuration/tooling and private runtime-file hashes are unchanged, and public legal/retention payloads match the preflight baseline.
- Four live read-only account journeys passed: Chromium/WebKit at 1440/390 pixels, covering cards, details, terms, signed-out purchase review, back/focus and overflow. Six live portal/browser cases passed for customer/admin/pro entry and unauthenticated private-data denial. No live reservation, customer-data mutation, email, invoice, funds or publication test occurred.

Current manifest: `/srv/playora/releases/9552606/deployment.env`. Private deployment receipts: `/srv/playora-qualification/accounts166/preflight`; local source/review/test/signature/live evidence: `.cache/accounts166/release/`. The broader UX165 audit remains paused. No full suite was run.

Schema43, independent identities/MFA, checkout enabled, automatic outgoing transfers/deletion disabled, authored listings, policies/catalogs and private webmail remain unchanged. Prior signed0dcc73c is retained for same-schema application rollback. Off-host recovery remains unavailable, and this approval is not reusable for a later release.
