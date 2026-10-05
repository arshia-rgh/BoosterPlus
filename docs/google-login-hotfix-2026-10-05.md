# Google staff-login hotfix — 5 October 2026

## Change and preserved boundaries

Staff sign-in incorrectly treated Google's optional account-session `auth_time` as proof required for every PLAYORA login. A fresh, signed, nonce/PKCE/state/portal-bound ID token now establishes the linked first-factor identity, followed by mandatory PLAYORA MFA. Sensitive actions still require recent credential proof: retain the actual recent `auth_time`, or require email verification and a new authenticator code. Never substitute token issuance for recent Google credential entry. Missing/stale/future token issuance, incorrect issuer/audience/nonce/signature, wrong portal, unlinked staff identity and state replay remain rejected. No schema, public staff signup, account linking, payment or payout change.

The production owner's eligibility and Google link were verified without retrieving stored MFA material. Raw historical Google assertions were not retained, so the precise claim values from the failed live attempt remain unknown. Signed-provider fixtures reproduce the compatibility defect. The owner must retest the actual Google callback after deployment.

## Focused verification and authorization

The owner explicitly approved focused checks instead of the full repository gate for this fix, and this update before off-host backups, retaining paused checkout/outgoing and the prior signed release for application rollback. No permanent exception or recovery guarantee is created.

- Local OAuth protocol race tests, integration compilation, standalone gosec and repository/secret/contract checks passed. The initial sandbox listener restriction and corrected test-lint finding remain recorded in progress.
- Server run112 passed the full backend stage gate: formatting/tidy/generated checks, vet, tagged lint, standalone gosec, live govulncheck, module verification, race unit tests, migration validation and production builds. Its over-broad integration selection later failed an unrelated media test without storage credentials; retain that failure, not a complete pass.
- Run113 passed all15 intended identity/portal database scenarios under the race detector in158.189seconds, including all six new admin/booster missing/old/recent timestamp subcases. The four source/test hashes are recorded in `source-evidence.json`. Synthetic databases were separate from production and removed after checks.
- A consumed single-invocation private Git hook checked the exact approved parent/staged source and verified server receipts, then passed repository checks. Normal `.githooks` configuration remains unchanged. Full unrelated browser/commerce/production suites are not claimed rerun.
- Exact-commit CI37287055287 and release37288320672 passed. All five immutable images were scanned; the bundle was independently authenticated, signed locally and verified on the server.

## Bounded deployment exception

The operator may apply only this signed schema39-preserving update from deployed release `99f60bd0a4ab75fa0aa333a3aa95b150edf371e2`, with payments/outgoing still disabled. The one-use private operation records the owner's approval and explicitly records **no off-host backup** instead of fabricating a successful backup receipt. Standard release locking, signature/config/schema/history checks, health/HTTPS probes and failure receipts remain in effect. Keep the previous signed bundle and image digests for schema-compatible application rollback. This does not recover lost host data. Ordinary release tooling continues to require off-host backup on future updates.

## Deployment result

Hotfix `2bde066ed9003597f818bc586ed7cd5f91d83561` is deployed. [CI37287055287](https://github.com/arshia-rgh/BoosterPlus/actions/runs/37287055287) and [release37288320672](https://github.com/arshia-rgh/BoosterPlus/actions/runs/37288320672) passed. Running API/worker, storefront, admin, scanner and gateway digests match the signed bundle and report healthy. Schema/history39, private dependency probes and HTTPS checks passed. Customer/admin/booster authorization-request checks passed without contacting Google: separate callbacks, secure cookies, state/nonce, PKCE, account selection and the optional timestamp claim. Real owner Google callback/MFA acceptance still requires the owner's retry. Temporary registry credentials were removed; checkout/outgoing remain paused.

The initial deployment116 stopped at preflight because Compose's one-shot Caddy validation reused the live gateway's static network address. The running application was not interrupted by that failed attempt. Retained private error evidence identifies `Address already in use`. Resume118 used the existing exact signed pending-release receipt and validated the same candidate Caddy configuration in a hardened, network-disabled one-shot container. All other release checks ran normally; no validation was skipped. Production configuration/source files and the live gateway's trusted address were unchanged. A general deployment-tool fix for this one-shot static-address conflict remains follow-up work before the next ordinary update.

Private receipts: `/srv/playora/releases/2bde066/resume118-state.json`, `validator118.log`, the retained failed `hotfix116-state.json`, and the installation's current/release and scoped `boosterplus-production-hotfix-2bde066.json` receipts. The operator resume script is retained privately under `/srv/playora-qualification/`. The one-use commit/deployment exception is consumed. Standard hooks and backup-required release defaults remain unchanged. No full unrelated gate, backup recovery, live financial transaction or actual Google callback is claimed passed.
