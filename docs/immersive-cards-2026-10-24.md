# IMMERSIVE188 — approved artwork cards and aligned game pages

Owner accepted preview IMMERSIVE187 and requests implementation of its homepage/MLBB service chooser, full-image public shop/fixed-package/news/account cards, and consistent game header/content/FAQ alignment, then combined deployment. Base: 3b0c094; live application f4ce4dd/schema50. Other-author DISCOUNT179/migration51/prototype/cameo source is excluded in an isolated main checkout.

## Scope and preserved behavior

- Five homepage illustrations/order, bottom-left concise copy, peeks, manual tabs/arrows and soft hover; approved four MLBB illustrations with responsive derivatives. Other games use their own published images; active/paused/off behavior preserved.
- Shared full-image cards retain exact published prices/ranges, quantity basis, region, delivery and unavailable state. Accounts retain rank/region/hero/skin counts, actual inclusive total and commission note, short selling point; arbitrary extra attributes stay on details. News retains kind/date/version, full content on details. Fixed packages summarize selectable price ranges and delivery, with unavailable/legacy states explicit.
- One game-page rail for hero, statistics, content, FAQ and both separator lines, preserving configurable hero framing and game-local navigation.
- No catalog/policy changes, pricing/checkout change, backend/schema or runtime settings. No purchase, invoice, message/funds or customer-data tests. Supplier buying/outgoing transfers/deletion stay disabled; Vendoria absent.

## Review and qualification

Independent senior designer /root/immersive187_design supplied explicit decisions for all four card types plus homepage/game layout. Rendered rounds and fixes are tracked in docs/redesign/reviews/IMMERSIVE188_DESIGN.md. Focused server-only unit/component/fixture browser checks plus normal frontend/repository hook; no full gate or local tests. The final focused round passed 47 component cases and 29 browser/accessibility cases, plus format/types/lint. Preserve first-round fixture/type/lint failures, inner blurred artwork overflow and the image-failure interceptor correction; receipts are `.cache/immersive188/` and `/srv/playora-qualification/immersive188/`. Independent senior design review passed after two rendered rounds. The normal focused hook and signed release checks subsequently passed; see the delivery record below.

## Deployment

Normal exact CI, image scans/signatures and server preflight precede activation. Off-host backup remains absent; fresh exact owner recovery approval remains required once candidate/preflight are concrete. No prior exception reused. That activation subsequently completed under the exact approval recorded below.

## Capacity preparation

Before release preparation, free disk was 19.77%, below the unchanged 20% storage floor. Exactly five old `playora-{br,tidb,tikv,mail,restic}:security-probe` images were verified unreferenced by every container and saved release manifest, then removed without force. This reclaimed 2,178,789,376 bytes and restored 21.17% free. No volumes, production data, signed release images, source or qualification evidence were removed. Exact IDs and before/after receipts remain private in the task qualification folder.


## Required security patch during qualification

The first normal focused hook passed all component tests, then stopped at the unchanged low-severity npm audit threshold on newly reported/updated advisories. Original hook evidence is retained under `failed-hook1`. The narrow lockfile remediation updates body-parser2.3.0→2.4.0 (and its required qs6.16.1), undici8.10.2→8.12.3, and the direct exact Zod pin4.5.4→4.6.6. No audit exclusion or severity change. Server reinstall, audit, affected browser/component checks and the normal focused hook are rerun against the patched dependency graph. The fresh audit and round6 focused checks passed (47 component and29 browser/accessibility cases).

Primary advisories: [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828), [undici EventSource](https://github.com/advisories/GHSA-4qv8-2p9j-2685), [undici integrity](https://github.com/advisories/GHSA-f72v-6w45-q472), [undici encoding](https://github.com/advisories/GHSA-xjj6-f33q-929c), [Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

## Release continuation, 24 October

Qualified UI commit `9d55511` passed its normal focused hook (222 frontend files / 1,075 component cases, Go security/race/build and repository/deployment checks). CI40052110202 attempt3 passed after attempts1/2 were blocked before execution by GitHub billing. Image40064968048 attempt1 failed downloading Trivy's database from its mirror (HTTP404); attempt2 downloaded successfully and found CVE-2026-111497 in the scanner's brotli-libs1.2.0-r1. Both original failures are retained; neither is a passing image scan.

The scanner's existing official-package patch layer now pins brotli-libs1.2.1-r0, alongside its unchanged OpenSSL/PCRE2 fixes. [Google's release](https://github.com/google/brotli/releases/tag/v1.2.1) identifies this decoder out-of-bounds-write fix. No advisory exception or scan-threshold change. Application source/schema, UI and its passed rendered checks remain unchanged. The corrected candidate requires the normal focused hook, isolated scanner clean/malware controls, exact CI/image scans, signatures and preflight before fresh owner recovery approval. Full gate remains disabled.


## IMMERSIVE188 delivered — 24 October 2026

Signed `03272006e596a1890dc0e3234cf08b8838426a0e` is deployed at unchanged schema50 after exact owner approval “Deploy 0327200 immersive cards and game alignment update without an off-host backup”; this one-release recovery exception is consumed. The approved five homepage full-image panels and four MLBB service scenes include soft hover effects; shop, fixed-package, account and news cards use concise bottom-left copy over artwork, with honest missing-image fallbacks. Game hero, statistics, content, FAQ and both separators share one rail. Existing prices, availability, details, catalog/policy data, payment behavior and portal security are preserved.

Independent senior designer PASS after two rendered rounds; final47 scoped component and29 responsive/browser/accessibility cases passed. Normal focused hooks passed (222frontend files/1,075cases, Go vet/golangci/gosec/govuln/race/build, repository checks and83deployment cases). Exact CI40068141204, image build/scans40068678173, signatures and server preflight passed. Eight services are healthy;23live GET/HEAD-only desktop/mobile browser cases passed, followed by manual inspection of live captures. No full gate or local tests; no live invoice, funds, message, purchase or customer-data test.

Required narrow security fixes update frontend body-parser/qs, undici and Zod and add exact scanner brotli-libs1.2.1-r0 for CVE-2026-111497. Isolated clean-file acceptance and harmless antivirus-test rejection passed. Application Go source and SQL are unchanged. Preserve original fixture/lint/hook audit failures;9d55511 CI attempts1/2 were blocked before steps by GitHub billing and attempt3 passed; image40064968048 attempt1 failed on a Trivy DB mirror404 and attempt2 found the patched-available Brotli issue. Scanner control harness mistakes (APK version query and directory permissions) were corrected without changing the successfully built image. No threshold weakening or new vulnerability acceptance occurred.

Only proven unused generated tool copies, compiler caches and unreferenced security-probe images were reclaimed; source, evidence, data and signed release images remain. Final observed free storage22.09%, above the unchanged20% floor. Manifest `/srv/playora/releases/0327200/deployment.env`; signedf4ce4dd retained, application rollback unqualified/off-host recovery absent. Checkout enabled; supplier purchases/outgoing transfers/deletion disabled; Vendoria absent. Concurrent discount/migration51/prototype/cameo work preserved and excluded. Evidence `.cache/immersive188/` and `/srv/playora-qualification/immersive188/`; see `docs/immersive-cards-2026-10-24.md` and `docs/redesign/reviews/IMMERSIVE188_DESIGN.md`.
