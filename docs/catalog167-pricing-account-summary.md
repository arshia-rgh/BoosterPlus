# CATALOG167 — MLBB preferences and account summaries

Status: focused feature and senior rendered checks passed; normal staged hook and signed deployment/publication remain pending. Nothing deployed or published by this task.

## Approved changes

- Win rate: no preference, above 80% (+100%), exactly 100% (+200%).
- Heroes selected: one +50%, two +40%, three +30%, four +20%, five +10%; no hero preference adds nothing.
- Requested delivery: no preference, within 48 hours (+15%), within 24 hours (+25%). Remove the min/max inputs from the new MLBB release, preserving historical agreements and other catalogs.
- Each surcharge uses the same base estimate. Example: USD20 base +200% WR +50% hero +25% delivery = USD75. The estimate is still subject to staff acceptance and the agreed final price/timing.
- Seller intake includes skin categories, quantities and names, a hero total and short selling point. Staff explicitly review these before making them public. Marketplace cards show hero/skin totals and the selling point before opening account details. Unknown legacy facts stay unknown, never invented as zero.

## Implementation boundaries

Add an optional, bounded surcharge stage to pricing plans. Existing pricing rules and historical releases retain their arithmetic. New premiums share the exact base after rank/fixed charges and minimum price, then the overall maximum applies; no intermediate rounding. Maintain saved pricing cases, overflow guards and condition validation. Existing percentage premiums in the latest MLBB draft must be reviewed and moved into the same-base stage where appropriate, preserving their authored percentage.

Account summary information is reviewed public data, separate from private seller intake. Existing offers, commissions, order snapshots, consent and authentication are unchanged. No live account details will be invented or published by this task.

## Qualification and publication

Use the standing focused gate and affected pricing, persistence, form, marketplace and browser regressions. Senior review is recorded in `docs/redesign/reviews/CATALOG167_2026-10-18.md`. Do not run the full suite. Obtain the current saved MLBB draft through the normal owner authoring interface, merge rather than replace newer edits, validate/publish after compatible code is deployed, and verify public estimates without creating orders or invoices.

## External dependency

18 October: Server.ir's panel shows ajay/raina Cloudflare nameservers, but direct queries to two .com registry servers return ns1/ns2.nonverifieddomain.com. Cloudflare still answers the correct application A records. The owner restored delegation. At 17:59 UTC the registry returned ajay/raina Cloudflare and the admin catalog returned HTTP 200. Authenticated saved revision 288 was exported; unrelated owner changes are preserved.

## Implemented details

The optional pricing stage supports bounded flat percentage and selection-count premiums using exact rational arithmetic, one final rounding step, minimum-before-premium semantics and the existing final maximum. Old plans without this stage retain their original arithmetic. The owner's existing30% play-together premium is retained and moved to the same-base stage; rank rates, four fixed offers and linked hero/role and region/server configuration remain unchanged. New catalog controls and25 saved publication cases describe the approved choices; the UI's hero hint shows a percentage only, while the server remains authoritative for money.

Private seller intake maps ordinary hero, skin, presence and selling-point fields for an explicit staff-copy action. Public skin groups permit up to60 categories,500 named entries per group and1,000 total, with matching quantities and precise repair paths. Public details retain full names in disclosures. Existing unknown records are never filled with invented facts; explicit zero is supported. Existing consent, commissions, reservation lock and accepted snapshots remain.

## Focused evidence and limitations

- Exact arithmetic tests cover54 preference combinations, minimum/maximum, rounding reconciliation, ordering and overflow;25 prepared MLBB publication cases pass.
- Scoped component tests cover configuration import, surcharge editing, explicit seller copy/private-field exclusion, zero/unknown counts, legacy facts and root/nested inline errors. Three portal builds and scoped Chromium/WebKit form/account checks pass; final staged checks remain authoritative.
- The first persisted batch passed historical catalog publication, existing pricing transport and unique resale reservations. Its new summary test incorrectly attempted to edit an already reserved listing; the reservation lock correctly refused. The corrected test saves the private edit before reservation, then verifies the lock and immutable accepted summary. Its retry is recorded separately, never relabeling the original batch as passed.
- Senior review found and corrected conflicting legacy count facts, stale premium copy and mobile collection-wide validation placement. Final rendered approval is recorded separately.
- Original failed toolchain/test/lint/selector/harness attempts remain under private `.cache/catalog167/`. Browser tests use isolated synthetic accounts/API/media; the persisted checks use separate test databases. No physical-device/screen-reader or live financial test, full suite or wider audit completion is claimed.

Schema43, SQL migrations, dependencies, production configuration, payment/payout/deletion settings and accepted policies remain unchanged. The previous signed application is retained, but old binaries ignore the new premium stage; rolling back after publication may underprice new estimates. A forward fix may therefore be required. No off-host recovery is currently available.

The corrected account-summary database scenario passed separately (141.50s), completing all four targeted persisted cases. The original failed batch remains recorded. Senior scoped review passed after three rounds with C167-01/02/03 resolved; exact source hashes and evidence are private under `.cache/catalog167/release/`.

The first normal focused-hook attempt stopped at the required live vulnerability scan: the laptop received HTTP403 from the official Go endpoint, after vet, golangci and standalone gosec passed. The failure is retained in `.cache/catalog167/release/failed-hook-1`. The retry uses the same official live HTTPS feed through a temporary loopback SSH route on the authorized server, without replacing the database or disabling TLS verification.

The second normal hook passed the official live vulnerability scan and stopped when test binaries could not link because local disk space was exhausted. No application assertion failed in that attempt. Its evidence remains in `failed-hook-2`. Only old regenerable PLAYORA Go caches were reclaimed; the next normal hook limits package-build concurrency without dropping tests or checks.

The third normal hook completed backend checks and stopped on a frontend security-lint warning for a computed lookup over four fixed mapping keys. The editor now reads those four properties explicitly with unchanged UI behavior, without a linter suppression; `failed-hook-3` preserves the original result.

The fourth focused hook completed backend and frontend static checks;950 component cases passed and one existing upload-focus test missed its1-second assertion window. That unchanged6-case upload file passed independently. The final retry bounds component workers to2 without changing assertions or timeouts. A final adjacent review also confirmed that customer root skin-collection errors shared the hidden-feedback problem; the customer form now focuses a named message before the collection, preserving nested field focus. This correction receives separate component/rendered verification.

Final scoped design review passed round4: populated/empty customer collection errors are visible, focused and described before the controls at320px Chromium and390px WebKit; nested quantity focus is unchanged. C167-04 is closed alongside the earlier three findings. Final26 affected component cases, lint/type checks and three builds passed.

The fifth focused hook passed backend/security and frontend static checks;950 component cases passed and two existing protected-reveal cases failed. The focus scenario began a later task before the second reveal's focus effect settled; its early failure left a queued mock rejection for the next scenario. The tests now await the intended focus transition and reset the mocked endpoint before each scenario. Production reveal behavior is unchanged. Original evidence is retained in `failed-hook-5`. An affected15-case run with coverage passed its assertions but failed the unrelated global route-coverage threshold because route tests were intentionally absent; this is not recorded as a passed command. The normal focused hook retains complete route coverage.
