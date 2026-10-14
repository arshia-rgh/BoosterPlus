# Manual seller payouts — 14 October 2026

Status: implementation, scoped database/browser checks and senior review complete; normal lightweight commit/release checks in progress. The live site is still signed `d4e19ba` at schema 41. This document does not claim deployment or a complete-suite pass.

## Owner decision

Keep customer deletion disabled. Staff pay sellers manually with crypto; PLAYORA records the completed external transfer without sending funds through NOWPayments. The owner approved recording amount, coin/network, destination and transaction hash followed by staff confirmation. Existing accepted seller agreements, commissions and timing remain binding; this change does not rewrite them or add a wallet.

## Operator flow

1. Open Admin → Finance → Seller payouts, or the seller submission’s payout section.
2. Review the immutable accepted net amount, currency/network and the seller-confirmed destination/memo. The owner role is required to record completion.
3. Confirm eligibility before paying externally. Buy-first requires verified account control. Consignment also requires settled buyer payment, completed handover/acknowledgement, the agreed inspection and delay periods, and no unresolved dispute/refund. A pre-existing provider attempt blocks manual recording and needs separate reconciliation.
4. Using the operator’s own wallet, complete the exact transfer. Sending fees must not reduce the agreed seller net amount. PLAYORA does not connect to that wallet.
5. Enter the chain transaction hash, completion time and a private verification note. Attest that the exact asset, network, destination and net amount were received. When requested, complete normal contextual authenticator **or** email verification.
6. “Record completed payout” creates a staff-attested immutable receipt and updates the payout to completed. It does not send crypto or verify the blockchain automatically. The seller can read the receipt in the submission’s payout section.

The form has inline validation, exact-request retry protection, explicit conflict guidance and a persistent success receipt. Uncertain evidence is held in page memory across a failed list refresh; no wallet data or authentication codes are persisted to browser storage. If a request times out, inspect the receipt and retry saving the same record if necessary. Never send the transfer again just because saving the record failed.

## Boundaries

- Automatic provider transfers remain disabled (`PAYOUTS_ENABLED=false`), including automatic refunds. Incoming checkout remains enabled with the published USDT/BNB Smart Chain policy. No new provider invoice, email or funds test is authorized.
- Customer deletion and the approved disabled-retention policy remain unchanged.
- The exact accepted quote is authoritative; there is no editable payout amount/address override, new exchange quote, partial payment, batch payout or automatic recipient lookup in this workflow.
- Duplicate transaction hashes on the same network and repeat completion of the same payout are rejected. EVM/TRON hashes normalize case; Solana signatures retain case. Format validation is not proof of an on-chain transfer.
- Completed external payments have a separate manual receipt and audit snapshot. They must not be presented as a NOWPayments confirmation. Internal staff notes/IDs are excluded from seller-facing transfer history.
- Staff permissions, fresh verification, CSRF, beneficiary privacy, payout eligibility and accepted terms are rechecked transactionally. Provider-attempt ambiguity cannot be overridden by a manual completion.
- No correction/deletion endpoint changes a completed receipt. Incorrect records require owner/support investigation; never create a second transfer to correct a clerical error.

## Schema and release

Explicit SQL migration `000042_manual_payouts.sql` adds immutable manual payout receipts with unique payout and network/transaction constraints. Ent generates queries only. Runtime readiness expects schema 42. The CLI refuses a downgrade crossing 42 to protect financial receipts. The older schema 41 application cannot be assumed to serve after this migration; an exact recovery decision is needed before release activation because off-host recovery remains unqualified.

Deployment must preserve the live owner’s catalog draft, legal/retention policy releases, payment policy, incoming checkout, private webmail and stable runtime configuration. No policy publication is necessary for this implementation.

## Qualification evidence

- Focused backend hash validation, compilation and broad lint passed. The isolated server retry passed four race-enabled scenarios covering owner/CSRF/strict input, immutable terms, non-owner rejection, recent verification, same-network duplicate hashes, concurrent idempotent saves, receipt privacy, API contract, schema 42 readiness/downward guard and existing consignment/refund holds (48 seconds of scenarios). Disposable TiDB was removed afterward; production data was not used. Backend source is bound by `.cache/manual150/db2/manifest.json` (SHA-256 `2bf36d1a13a759af000ea8014de7d84c167654e640645d145bf092bfeb96472f`). The first attempt failed because its synthetic login helper consumed unrelated commerce jobs; only that fixture and the rollback-test method were corrected before rerunning the scoped cases.
- New manual-form component tests and existing refund tests: 22 passed after fixing test assertions and adding retry/refresh coverage.
- Chromium and WebKit each passed six scoped cases (12 total), including contextual owner verification, save/read-failure recovery, inline validation focus, seller-only access, holds and 320/390/1280 px layouts. No horizontal overflow was found. Automated accessibility checks passed on completion and seller receipt. They caught and we corrected skipped heading levels and duplicate receipt region labels; original failure evidence is retained. Normal lightweight repository/security hook, CI and signed-image release checks remain pending until separately recorded.
- The first local browser attempt was blocked by sandbox server permissions. A later test-only datetime input used a non-canonical zero-seconds string; the browser rejected that fixture fill. Original evidence is retained under `.cache/manual150/`; neither attempt is a pass.
- Senior source review requested clearer completion wording, contextual conflict recovery and preservation of uncertain evidence through a list refresh. All three corrections are implemented and regression-tested. Final scoped senior review passed actual Chromium/WebKit ready/held/seller/completed screenshots at desktop and narrow widths. The reviewer’s direct browser provider was unavailable; this is source plus rendered-screenshot review, supported by the 12 browser tests, not a physical-device or authenticated-production test. Evidence: `.cache/manual150/senior-review.json`.

No complete gate has been requested or run for this change.

The first normal lightweight hook stopped when both official Go vulnerability database endpoints returned HTTP 403 from the workstation. The official endpoint was reachable through the authorized server; a temporary loopback-only SSH proxy preserved HTTPS verification and the unchanged live scan then passed. The second hook found one older payment-policy component assertion still expecting “Outgoing payments,” while the interface now correctly distinguishes “Automatic provider transfers.” Only that assertion was updated; the other 855 component tests had passed. Original logs remain under `.cache/manual150/`; neither failed hook is a successful commit or a complete-suite pass.
