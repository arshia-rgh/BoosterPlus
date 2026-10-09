# Independent-panel scoped completion and release — 9 October 2026

Status: superseded by the owner's contextual-verification and visual revision. The database-only retry was cancelled on 9 October 2026, its isolated resources cleaned up, and production left unchanged. Its historical passed sections remain evidence, but this attempt is not a completed pass and will not qualify the expanded candidate. Follow `action-verification-release-2026-10-09.md` for the fresh full-suite delivery. The entries below describe the earlier scoped preparation.

The owner requested deployment after rerunning only failed or unexecuted checks, without another full gate. The evidence below is a combined qualification of unchanged sections and scoped corrections. Neither historical full run is relabeled as passed.

## Qualification ledger

| Evidence | Actual result and permitted reuse |
| --- | --- |
| Frozen round4 | Failed at four newly reported official database-image findings. Its unchanged production unit, gateway, staging and runtime configuration checks passed. Real-TiKV business qualification was not reached. |
| Frozen round5 | Owner-accepted image findings passed the infrastructure audit. Backend static/security/race and 268 ordinary database cases passed. Frontend 700 unit cases and 155 browser cases passed; the desktop catalog validation journey failed. Later frontend container and production stages were not reached. |
| Catalog correction | Reproduced the original focus race, preserved its failure, and corrected only the catalog section-focus behavior plus its regression test. Focused unit, lint/type/build, desktop/mobile catalog browser checks and senior design review passed. The existing end-to-end assertion was not weakened. |
| Remaining attempt | Frontend image builds, vulnerability scans and container smoke passed. Self-hosted fixture startup failed before any database scenario because Docker's predefined address pools were exhausted. It is a failed attempt, not a business-test failure or completion. |
| Database-only continuation | Running with the exact three passed container receipts reused; reruns only the self-hosted production database section. Requires all 268 real-TiKV cases, source/image stability and isolated fixture cleanup. No pass is recorded before actual evidence exists. |
| Migration compatibility | A private synthetic schema40→41 fixture is prepared for independent review and execution after the long database fixture is cleaned up. Offline checks alone do not qualify migration compatibility. |

The corrected runtime is bound to all 2,094 source files by manifest SHA256 `560a3de766138e39efc2d263de2d6094de75f611d9284eb6318552219f7e333a`. Catalog receipt SHA256: `842a4746beb4e0615c71930eb6514acb7e29fcc3301f0cfa57885fe6fd3b0c6a`.

## Test-host repair

Docker inspection found nine inactive networks retained by earlier synthetic panel/portal test projects. Each had zero active endpoints; referenced containers were stopped and belonged to those exact test projects. Only those nine networks were removed. Containers, volumes, logs and all production networks were retained. A before/after comparison confirmed that production networks were unchanged. No Docker daemon restart, pool reconfiguration or application source change was needed.

The failed startup, three successful section receipts, network inspection and narrow cleanup receipts remain private under `/srv/playora-qualification/panels140-remaining`. The continuation uses a separate output directory and records the origin of reused results.

The independently reviewed retry is `/srv/playora-qualification/panels140-remaining-retry1`, runner SHA256 `81ac86c64f4b7cf2cd5f891b65d9039c0ccb1ed8ffc77222843b74c945bb7a0f`. Its isolated database, storage and scanner services started after the network repair. Repository policy, secret scan, contracts and workflow checks passed locally; GitHub release access is available. These preparation checks do not imply the long database suite has completed.

## Commit and release boundary

The normal tracked hook gains one source-bound continuation verifier. It requires the historical manifests/logs, corrected-source proof, actual remaining-section results, exact image reports and complete real-TiKV business log. Missing evidence retains ordinary gate selection; present but invalid evidence fails. The continuation cannot qualify changed application files or fabricate an earlier full-gate pass. It additionally runs repository checks, continuation negative tests and current backend lint, standalone gosec and vulnerability checks.

Exact-commit lightweight GitHub CI, immutable release-image scans, signing, signature verification and server preflight follow the successful commit. The private release adapter verifies this combined proof and the actual pushed commit rather than expecting a nonexistent successful full-gate commit.

## Deployment safeguards and remaining work

Schema41 separates customer, admin and booster identities and is forward-only. Verify historical order ownership, staff attribution, MFA preservation, session revocation and financial policy before and after migration. After migration begins, schema40 images are not a compatible rollback; uncertain or partial DDL retains maintenance/quiescence for a reviewed recovery.

Preserve payment policy revision3/agreement `e1957da6-a9dd-4e66-b78b-4cd2ed4df190`, USDT/BSC checkout enabled, outgoing payments disabled, deletion disabled and private webmail. Off-host backups and real off-host recovery remain absent; no configuration snapshot is described as a data backup. No live invoice, funds action or external test email is authorized by this release.

After successful migration and activation, verify customer/admin/pro HTTPS entry points, redirects, runtime health and private webmail. Real sign-in/MFA and financial acceptance remain owner-led. Deployment and completion will be recorded only after those actual steps, with a changelog in chat.
