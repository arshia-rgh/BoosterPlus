# Signed releases and compatible rollback

This procedure is implemented but still requires the server rehearsal recorded in `LAUNCH_EXECUTION.md`. Run from `production/` as the dedicated deployment operator. Do not activate checkout during first-install qualification.

## Artifacts and trust

1. Push the reviewed revision to `main`; the exact revision must pass the complete `Quality and security` workflow. Dispatch `Release artifacts` on that same main revision. Download its `release-bundle` with authenticated GitHub CLI access. A pending/failed workflow is not release evidence.
2. On the signing operator's machine, keep an encrypted RSA private key (at least 3072 bits) and its private password file **outside the repository and deployment server**, mode0600. Generate the key interactively with `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -aes-256-cbc -out /protected/location/release-key.pem`. Export its public key using `openssl pkey -in /protected/location/release-key.pem -pubout -out /protected/location/release-public.pem`. Keep independently accessible recovery copies under the named custodian.
3. Set absolute `RELEASE_DIRECTORY`, `SIGNING_KEY_FILE`, `SIGNING_PASSWORD_FILE`; run `make artifact-sign`. It authenticates both workflow identities and compares the exact manifest/SBOM bytes downloaded from Actions before signing. It never uploads the private signing key.
4. Provision only the public key onto the server through the trusted SSH channel. Put its absolute path and independently checked SHA256 of the **PEM file bytes** in `RELEASE_TRUST_KEY` and `RELEASE_TRUST_KEY_SHA256` in the deployment manifest. Do not derive trust from a key supplied in the downloaded bundle.
5. Transfer the signed bundle. Set `RELEASE_DIRECTORY` to its absolute path and run `make artifact-verify`. The five component digests, exact source revision, schema, workflow references and SBOM hashes are bound to the signature. This does not claim a SLSA-certified build.

Use a registry credential limited to image reads on the server. Log in using an interactive/password-stdin mechanism; never put a token in a command argument. CI image publishing uses its scoped ephemeral token. Signed artifact acceptance does not substitute for server tests or owner launch approval.

## First installation

- Finish `OWNER_REQUIREMENTS.md`; select the dedicated UID1000 operator (do not duplicate an existing UID). An administrator creates `/srv/playora` owned by that account with mode0700. Then run `DATA_DIRECTORY=/srv/playora/installation make data-prepare` as that operator. The installation child must not already exist. Generated credentials/CA keys remain private. Preparation initializes no SQL schema and starts no services.
- Create separate backend/frontend/migration runtime files (mode0600). Use only the relevant entries from `secrets/provisioned.env`; never give the application administrative or migration credentials. Keep checkout/outgoing transfers off while qualifying. Set the real domain, correct terms, public origin, mail configuration and digest references in the private deployment manifest.
- Arrange private mail account provisioning and certificate directories as described in `MAIL.md`; check DNS and host prerequisites. The data directory's CA signing key must have an independent protected recovery copy. No other cluster component receives that key.
- Run `make host-check`, `artifact-verify`, then `make release`. Explicit SQL migrations precede API readiness. The release starts the worker only after the public HTTPS smoke and mail service health. The bucket must be explicitly created in the private SeaweedFS administration shell before accepting uploads; qualify it with `dependencies check` before sales. Do not expose filer administration to do this.
- Bootstrap the owner through the documented backend CLI and qualify all three sign-in portals. A successful release command is infrastructure evidence only.

## Upgrade and rollback

Take and verify an off-host backup of the current release first. Its consistent recovery point must be at most15minutes old. Select the new signed bundle and run `make release`. The operation locks out competing releases/backups, pulls and checks the candidate before interruption, stops traffic/writes, applies explicit forward SQL, verifies history/schema, starts the app, performs HTTPS smoke and starts the worker. Expect a bounded maintenance outage; callbacks must recover through retries/reconciliation.

Successful releases write a private durable `operations/<project>-current.json`; subsequent normal commands use its exact image digests, even if the initial manifest still names older images. Preserve receipts and all signed bundles independently. No command automatically runs SQL down migrations or destroys volumes.

For an application rollback, select a previously signed bundle and run `make rollback`. The **actual database schema must exactly match the target binary**. After a schema-changing release, use a forward fix; do not start an incompatible old binary. Restoring an older backup is a separately controlled disaster-recovery operation, not an image rollback.

## Interrupted/failed release

Inspect `operations/<project>-release.json` and private service diagnostics. Before interruption of traffic, a preflight failure leaves the running application alone. Once quiescing begins, failure leaves the application stopped; no automatic restart against an ambiguous schema. Volume data and stage receipts survive.

Fix the underlying issue, select the **same signed bundle**, and use `make release-resume` (or `rollback-resume`). Migration history verification fails closed on partial/drifted SQL. Do not edit journal rows, remove receipts or choose a different bundle to get around that failure: investigate the exact interrupted DDL and use a reviewed forward recovery. Kernel locks are released after crashes; receipts are not discarded. Restoring a backup requires the isolation and reconciliation procedure in the recovery runbook.
