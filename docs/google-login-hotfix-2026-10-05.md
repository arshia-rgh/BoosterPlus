# Google staff-login hotfix — 5 October 2026

## Change and preserved boundaries

Staff sign-in incorrectly treated Google's optional account-session `auth_time` as proof required for every PLAYORA login. A fresh, signed, nonce/PKCE/state/portal-bound ID token now establishes the linked first-factor identity, followed by mandatory PLAYORA MFA. Sensitive actions still require recent credential proof: retain the actual recent `auth_time`, or require email verification and a new authenticator code. Never substitute token issuance for recent Google credential entry. Missing/stale/future token issuance, incorrect issuer/audience/nonce/signature, wrong portal, unlinked staff identity and state replay remain rejected. No schema, public staff signup, account linking, payment or payout change.

The production owner's eligibility and Google link were verified without retrieving stored MFA material. Raw historical Google assertions were not retained, so the precise claim values from the failed live attempt remain unknown. Signed-provider fixtures reproduce the compatibility defect. The owner must retest the actual Google callback after deployment.

## Focused verification and authorization

The owner explicitly approved focused checks instead of the full repository gate for this fix, and this update before off-host backups, retaining paused checkout/outgoing and the prior signed release for application rollback. No permanent exception or recovery guarantee is created.

- Local OAuth protocol race tests, integration compilation, standalone gosec and repository/secret/contract checks passed. The initial sandbox listener restriction and corrected test-lint finding remain recorded in progress.
- Server run112 passed the full backend stage gate: formatting/tidy/generated checks, vet, tagged lint, standalone gosec, live govulncheck, module verification, race unit tests, migration validation and production builds. Its over-broad integration selection later failed an unrelated media test without storage credentials; retain that failure, not a complete pass.
- Run113 passed all15 intended identity/portal database scenarios under the race detector in158.189seconds, including all six new admin/booster missing/old/recent timestamp subcases. The four source/test hashes are recorded in `source-evidence.json`. Synthetic databases were separate from production and removed after checks.
- A single-invocation private Git hook will check the exact approved parent/staged source and verified server receipts, then run repository checks. Normal `.githooks` configuration remains unchanged. Full unrelated browser/commerce/production suites are not claimed rerun.
- Exact-commit CI, immutable image scans, independently authenticated signing and server verification remain required before deployment.

## Bounded deployment exception

The operator may apply only this signed schema39-preserving update from deployed release `99f60bd0a4ab75fa0aa333a3aa95b150edf371e2`, with payments/outgoing still disabled. The one-use private operation records the owner's approval and explicitly records **no off-host backup** instead of fabricating a successful backup receipt. Standard release locking, signature/config/schema/history checks, health/HTTPS probes and failure receipts remain in effect. Keep the previous signed bundle and image digests for schema-compatible application rollback. This does not recover lost host data. Ordinary release tooling continues to require off-host backup on future updates.

Commit, CI, image-build and deployment receipts will be recorded after they complete; this document alone does not assert that the fix is live.
