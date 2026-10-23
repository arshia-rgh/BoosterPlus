# SHOP180 — concise MLBB offers and cancellation wording

## Owner direction

Publish the available prepared MLBB offers with concise delivery and region descriptions, preserving the 15% markup and existing artwork. The eight source-marked unreleased Global offers remain private. Live supplier purchasing remains disabled; publication does not authorize activation or a real purchase.

After confirmed payment, a customer cannot cancel merely because they change their mind. Failed fulfillment, protected account problems, mandatory cancellation/withdrawal rights and the accepted full-refund promises remain covered. Existing accepted contracts retain their original terms. Seller withdrawal rules and cancellation of unpaid orders are separate and unchanged.

## Implementation and publication

The reusable shop cancellation template now uses the confirmed-payment boundary and explicitly preserves failure and mandatory remedies. A scoped regression checks those promises. No schema, payment processing, supplier activation or permission changes are required.

All 216 eligible prepared MLBB products were updated and published through the owner's normal authenticated admin session, including the required owner-completed MFA steps. The five-page Published inventory was reconciled against the exact expected product IDs; all eight source-unreleased Global offers remain draft. Private before/after receipts are under `.cache/shop180/`. The GET-only Nexus catalog contains all 224 prepared offers. Its code category remains labelled Russia; concise copy retains that label rather than claiming worldwide compatibility. The 15% markup, artwork and supplier bindings were preserved. Existing automatic price synchronization remains independent of this copy update.

The legal canonical text, structured Terms and Refunds sections, the payment-policy cancellation rule and product cancellation terms must agree. Preserve every unrelated legal paragraph, price, markup, supplier binding, refund, account-damage protection and accepted historical revision. Check every saved preview before publication and verify the published revision afterward.

Legal revision 6 (`playora-terms-2026-10-23-payment-confirmed`, release `6d85e864-a43c-4510-a022-5a9172c92098`) and payment-policy revision 7 (`7ca99fa7-e57c-48b5-837d-1f504700fd85`) are published. Only the approved cancellation paragraphs changed; the payment policy retains the fee, exchange-rate, dispute, appeal and payout-route settings. Historical accepted terms remain immutable.

The MLBB game catalog still had its original Shop pause with reason `soon`. The saved configuration was exported and compared with the published projection before editing. Only the Shop capability state, description and pause reason changed, plus the normal review flag/revision lifecycle; all unrelated catalog content was preserved. The owner completed MFA and published the reviewed visibility change (draft revision 299 after publication). This makes the catalog discoverable; it does not authorize or enable supplier purchasing.

## Qualification and release status

Signed candidate `817812b49fa257314bb72935c2bdc4595732183f` passed the normal server focused commit hook, including backend formatting/generated-code, vet, golangci-lint, standalone gosec, vulnerability scan, race-enabled unit tests and build; 214 frontend component files/1,016 cases; and repository/deployment configuration checks. The scoped cancellation regression passed. No full gate or local test suite ran. The separate DISCOUNT179 implementation and prototype/cameo work are excluded.

Exact CI `39932165434` passed on its owner-triggered second attempt; the first attempt was blocked by GitHub billing before steps ran. Image release `39934529778`, scans, signature verification, pinned-image pulls and production preflight passed. Preserve the initial preflight stop: its source-binding receipt accidentally used the shared dirty AGENTS.md instead of the committed source. The corrected `source-binding2.json` binds the exact committed tree and verified server source; no application source, tests or images changed. Original evidence remains retained.

Only the inactive generated Go compiler cache was cleared for deployment headroom (2.63 GiB); no application data, source, release images or evidence was removed. The unchanged 20% storage floor remains in force.

The owner explicitly approved: “Deploy 817812b shop cancellation update without an off-host backup”. Signed `817812b` is deployed and verified at unchanged schema50; the one-release recovery exception is consumed. Off-host recovery remains absent and application rollback is not qualified; the prior signed application is retained without claiming recoverability. All eight live services, HTTPS routing/redirect/security checks, private webmail, schema verification and GET-only public checks passed. Public pagination returned exactly the 216 expected products, omitted all eight held offers, preserved the other catalog settings, and verified the updated cancellation/remedy text plus disabled supplier purchasing on every published product. A rendered customer Shop/product-detail check also confirmed the catalog and terms. Checkout stays enabled; supplier purchases, outgoing transfers and customer deletion stay disabled; Vendoria remains absent. No live invoice, order, funds or message test was performed.

Legal wording retains mandatory rights because generic terms acceptance alone does not establish separately required consent to early digital performance. Reference: [European Commission guidance on the Consumer Rights Directive](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=oj%3AJOC_2021_525_R_0001). This change does not rewrite previously accepted agreements.

Current deployment manifest: `/srv/playora/releases/817812b/deployment.env`. Previous signed release `460a136` is retained. Evidence: `/srv/playora-qualification/shop180/` and `.cache/shop180/`, including `verified-published-inventory.json`, `final-held-inventory.txt`, `public-shop-verification.json`, the owner-authenticated publication receipts and deployment verification. Prepared historical browser-run helpers were not executed or counted; the live UI was checked through the connected browser, and the comprehensive publication verification used server-side public GET requests.
