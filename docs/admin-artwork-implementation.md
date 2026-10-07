# Admin artwork uploads

Scope: game catalog main artwork, article cover and image blocks, and shop product artwork. Existing private order/account evidence uploads remain separate. Existing six game assets and their paths remain defaults, with an explicit restore-default control. No seed replacement or automatic publication.

## Interaction and responsive delivery

Editors show placement-specific recommended dimensions before file selection, accepted JPEG/PNG/WebP formats and the 4 MiB / 4 megapixel limit. Select an image, check focal point/crop previews where appropriate, upload and review generated versions, then use it in the draft. Upload/retry/error states preserve the existing image. Saving/publishing retains current revision and review rules. Alternative text and attribution remain explicit editor fields.

Game artwork has landscape hero, 4:3 mobile and card crops, plus a smaller backdrop. Cover artwork has landscape/card variants. Product and article-body images retain their complete aspect ratio, avoiding cropped product details or screenshots. Browsers choose bounded derivatives using picture/srcset. Small sources are not silently enlarged. Uploaded bytes are decoded, scanned and re-encoded without metadata; originals are never public.

## Security and persistence

Use a separate explicit SQL migration and Ent artwork records, private object storage and the existing fail-closed scanner. Admin portal/MFA, CSRF, live authorization, rate/size/pixel limits, fixed variant names and server-derived object keys apply. No arbitrary remote URLs, SVG uploads, request-driven transformations or executable image content. Draft artwork requires admin access; anonymous image delivery checks currently published game/product/article references, including article scheduling semantics. Draft replacement never changes an existing published image. Public response revalidation must check visibility again.

## Verification and delivery

Unit tests cover decoding/crops/bounds/metadata, paths and responsive selection. Isolated database/scanner/storage scenarios cover upload/retry/concurrency, role/CSRF boundaries, scan/storage failures and publication visibility. UI checks cover all four editor contexts, default restoration, replacement, failed/retried upload, focus, narrow/enlarged text and public images. The required senior designer reviews only these changes in a running preview and repeats until scoped findings are resolved. Backend/full repository qualification remains required for this new backend feature; previous one-use mobile/terms exception is consumed. Never use production data for destructive qualification.

Reference: [MDN responsive images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images) distinguishes crop/art direction from resolution selection. [OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) informs independent format, authorization, storage and resource checks.

Status: implementation, scoped senior UI review and the complete normal repository gate passed. Verified implementation commit: `29992d9c605c8d1e122a9af7d5ceb3f1efd26844`. Its documentation-only descendant `6ae48bf13fb43eaf72afbd5125cb1bbb491aa990` passed exact-commit CI, release image scans, signature verification and server preflight, and is deployed at schema40. The upload feature is live; owner visual acceptance and manual payment testing remain separate.

## Placement guide

| Editor | Suggested source | Generated display versions |
| --- | --- | --- |
| Game catalog | 1920 × 1080, room around faces | 1600 × 800 hero, 768 × 576 phone, 640 × 400 card; smaller 800/384/320 versions |
| Article cover | 1600 × 900 | 1600 × 900 cover, 640 × 400 card; smaller 800/320 versions |
| Shop product | 1600 × 1600 | Full aspect ratio within 1600, 800, 640 and 320 pixel boxes |
| Article image block | 1600 pixels on longest side | Full aspect ratio within 1600, 800, 640 and 320 pixel boxes |

These are maximum outputs, not promises to enlarge a smaller original. Transparent output remains PNG; opaque output is JPEG. Phone JPEG orientation is respected. Animated images and SVG uploads are rejected. Admins retain control over alternative text, source/rights and the existing exact-revision publication review.

## Operations and compatibility

Migration 40 adds the separate artwork index; migration 39's six bundled game paths and framing defaults are unchanged. Recovery capture/restore now includes every ready artwork derivative, alongside existing private evidence, at the same SQL checkpoint. Processing/failed rows are never public. Failed preparation can retry the identical request; a changed crop creates a new immutable upload. Unused prepared images remain private and retained; this release has no automated artwork deletion, preventing accidental destruction of saved historical revisions. Storage monitoring and existing capacity alerts remain necessary.

The upload has one processing slot per API process, a 55-second work budget, a route-specific 60-second backend response deadline and 65/70-second frontend/gateway bounds. Normal API timeouts remain unchanged. Only the authenticated upload route receives the extended deadline; the existing request-body read deadline remains. No public storage bucket or new runtime secret is introduced.

Schema 40 cannot be rolled back to a schema 39 binary without a separately reviewed migration/recovery procedure. Keep this feature undeployed until its complete gate and release requirements pass. Off-host backups remain an unresolved owner-deferred operational item; implementing archive coverage does not establish a backup or a successful recovery of production data.

## Complete gate evidence — 7 October 2026

The isolated `artwork135/full8.py` runner used the normal tracked hook and complete root `make pre-commit`, with no gate exception. It produced commit `29992d9c605c8d1e122a9af7d5ceb3f1efd26844`, parent `fb8a1f50b6f32292399e67d6f55ddd18ffe6d40c`, tree `78aa122b5672f78d13ff5e9fec476ef2a4638e87`. All 73 source hashes, committed blobs, parent and tree matched before local import. Unrelated untracked cameo/prototype work remains excluded and preserved.

Backend formatting/generated-code/dependency/security/build checks, race unit tests and the full isolated integration suite passed. Frontend static/contracts/audit/build/proxy/container checks, 139 tracked test files/461 unit tests and all 154 desktop/mobile browser scenarios passed. The earlier local 140-file/471-test result also included ten tests in the held untracked cameo experiment; those are not shipped or counted in the release result. Production unit/staging/runtime/configuration/application-image checks passed. The final real-TiKV suite passed all 251 scenarios in 12,838.853 seconds, including artwork authorization, publication, recovery, payment and privacy regressions. Resource observations were retained; no test failure or OOM was reported by this run. This is not a general proof of absence of memory leaks.

Infrastructure scanning found 481 findings covered by the existing exact-image owner acceptances, with zero unaccepted findings. It is not a clean infrastructure scan. No destructive check targeted production; no external email or real payment was initiated. Physical-device/assistive-technology acceptance, live transactions and off-host production recovery are not marked passed.

Private evidence is retained under `/srv/playora-qualification/artwork135/`:

| Evidence | SHA-256 |
| --- | --- |
| `full8.log` | `f3367ac3a533699be6aa0cfeee7c56916d0b45e19e94f4198ad6fffbae18d2a0` |
| `full8-source.json` | `7b7912831cff2bf26f7ff8af23e4f1aa673b1b6df95f9665ce9c204a7e542c61` |
| `full8-state.json` | `4e878a5f4de55aa7b98a17745301f959eb17454400e7006cabb60066d0a80715` |
| `manifest8.json` | `d4671f38697ac6b6e782fee4dfff5206605fde5f1e94f40236ff380c5f9fa11c` |
| `full8-resources.log` | `5a3fc1fbd4d4a3e6f0c707f8b77ee8c176b078d6a9b41dcdbdb7200f7b203236` |

## Signed candidate preflight — 7 October 2026

Exact-commit [CI 37561535071](https://github.com/arshia-rgh/BoosterPlus/actions/runs/37561535071) and [release build 37562642731](https://github.com/arshia-rgh/BoosterPlus/actions/runs/37562642731) passed for `6ae48bf13fb43eaf72afbd5125cb1bbb491aa990`. The release manifest and five SBOMs were independently compared with authenticated workflow artifacts before signing. Server verification used the existing pinned public-key fingerprint.

The private candidate at `/srv/playora/releases/6ae48bf` passed image pulls, hardened Compose/capacity validation, isolated gateway validation, checkout-enabled backend configuration validation, binary schema40 verification and read-only live schema39/migration-history checks. Evidence is `preflight135.json` and `preflight-state.json` in that directory. Temporary registry credentials were removed. The live release remains `80e08c961de78b804c4822983c2f23b7a0224218`; no migration, service restart or checkout activation occurred.

The candidate preserves stable deployment bind paths and the webmail121 patch. Its sole runtime configuration-file change is the gateway upload-route deadline; private backend configuration changes only the owner-requested checkout flag. Strict release defaults still require a fresh verified off-host backup. No such backup exists, and previous one-use deployment exceptions are consumed. A new exact-release owner decision is required before proceeding without that recovery point; schema40 also prevents ordinary rollback to the current schema39 binary. This preflight is not a backup waiver or production recovery test.

## Owner-requested checkout activation

The owner explicitly requested enabling live checkout in the new deployment for manual testing. The protected candidate changed only `PAYMENTS_ENABLED` to `true`; configuration validation passed in a network-disabled container. The subsequent deployment activated that flag in API and worker. Refund/seller-payout execution and deletion remain disabled. Reconciliation behavior and the prohibition on payment bypass remain intact.

A read-only database check found no published checkout policy. The owner requested help selecting payment settings; the receiving wallet's asset/network remains an input. Proposed settings are USD prices, fixed-rate quotes, PLAYORA-paid processing fees and a 30-minute local checkout window. The provider's shorter quote expiry still governs the displayed transfer instructions. USDT on BNB Smart Chain is a suggested starting route only if the owner's wallet and settlement configuration support it. These recommendations have not been published or silently converted into binding terms; preserve the approved refund and account-damage protections when drafting the policy.

Authenticated GET-only provider checks accepted the live key and listed `usdtbsc`/`bsc`, `usdttrc20`/`trx` and `ltc`/`ltc` among supported fixed-rate/merchant choices. Same-asset fixed-rate minimum snapshots were approximately USD9.06, USD20.39 and USD9.03 respectively; these are not permanent limits or quotes for different settlement routes. Recheck the exact route before a manual payment. No invoice, payment or outgoing transfer was created. References: [current pricing](https://nowpayments.io/pricing), [minimum-payment guidance](https://nowpayments.zendesk.com/hc/en-us/articles/27407237685917-Minimum-payment-amount).

## Production delivery — 7 October 2026

After the completed preflight and explicit backup/schema40 disclosure, the owner replied “yes all good”. The exact-release one-use receipt is retained privately as `boosterplus-production-artwork135.json`; no backup PASS was fabricated and the tracked release defaults were not weakened. Release `6ae48bf13fb43eaf72afbd5125cb1bbb491aa990` completed deployment and post-deployment verification at 09:08 Asia/Tehran. The deployment procedure, logs, state, pre-mutation gateway bytes and runtime-image evidence are retained under `/srv/playora/releases/6ae48bf` and `/srv/playora-qualification/artwork135`.

Migration40/history and dependency checks passed. All six application service instances matched the signed image digests and reported healthy. HTTPS smoke and HTTP-to-HTTPS redirects passed; a public browser check loaded homepage content without pending loading messages. The actual running API/worker environment independently confirmed checkout enabled and outgoing payments disabled. Temporary registry credentials were removed. No private admin session, production upload, invoice, email or money movement was created for verification. Live upload acceptance remains an owner check; isolated upload workflows passed before release.

Use `/srv/playora/releases/6ae48bf/deployment.env` for current operations. Stable mounted deployment source remains `/srv/playora/releases/99f60bd/source/production`, preserving webmail121 and the reviewed upload-route deadline change. No automatic schema downgrade was performed or promised. Backups/recovery remain unfinished; future deployment decisions must not reuse this consumed approval. A published payment policy and confirmed receiving coin/network are still needed for manual checkout; approved proposed settings were not silently published as financial terms.

## Confirmed payment settings and prepared draft — 7 October 2026

The owner subsequently confirmed USDT receiving wallets on BNB Smart Chain, TRON/TRC-20 and Solana, and explicitly selected 365 days for in-app disputes, 30 days per appeal and 3 appeals. The complete field values are in [PAYMENT_POLICY_DRAFT.json](legal/PAYMENT_POLICY_DRAFT.json). This is a local review artifact, not a database seed, imported policy or published agreement. Enter it through **Admin → Finance → Payment policy** using normal recent staff authentication; save, preview the exact saved revision, then complete the owner's publication review. Never write the policy directly to SQL or bypass authenticator checks.

| Customer choice | NOWPayments asset code | Network identifier |
| --- | --- | --- |
| USDT — BNB Smart Chain (BEP-20) | `usdtbsc` | `bsc` |
| USDT — TRON (TRC-20) | `usdttrc20` | `trx` |
| USDT — Solana (SPL) | `usdtsol` | `sol` |

Live GET-only checks returned these three routes as payment-enabled, fixed-rate supported and among merchant choices. Same-asset minimum snapshots were approximately USD8.96, USD20.19 and USD9.50 respectively. These change with provider/route conditions and do not establish a final invoice quote or guarantee successful settlement. No merchant wallet setting was changed and no transaction was created. Redacted evidence is retained privately as `artwork135/provider-three-usdt-readiness.json` on the server.

The draft uses USD pricing, merchant-paid processing fees, fixed quotes and a 30-minute local checkout window, subject to earlier provider expiry. Remedy fields preserve the approved full-refund/account-protection/account-damage promises. The in-app values are `dispute_hours=8760`, `appeal_hours=720`, `max_appeals=3`; they are interface limits, not expiry of the underlying protections or legal rights. Account listings retain their separately accepted reporting window, as implemented by the resale contract snapshot; staff support review remains available outside the in-app path. Do not silently rewrite the historical approved terms or existing order agreements.

The available browser session showed the normal admin sign-in page. The owner was asked to sign in themselves before draft entry; no email code was requested or MFA bypass attempted. Draft save, publication and owner-led real payment testing remain pending.
