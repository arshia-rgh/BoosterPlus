# One-time owner test-gate waiver — 9 October 2026

The owner explicitly requested: “Despite of the result of the tests, please commit the cnages and start production this time (only this time), and later we will fix and hotfix if any test failed”.

This supersedes the complete-test prerequisite for the pending combined independent-panel/contextual-verification release only. It does not turn any failed, running or unexecuted check into a pass. Normal repository hooks, future release requirements, image/signature verification, migration preconditions, authentication protections and financial/deletion settings remain in force outside this exact exception.

## Source and evidence

The runtime source is the frozen round3 candidate, tree `855177c7e7a14f046c37c5a34d44b4097d15832e`, based on `23c70774594c488bc6fe1dfe166f06291d81bfb1`. The exception adds this record and the corresponding repository instruction only. A private one-use commit hook binds the complete staged tree, base commit and file hashes, records the owner instruction and runs repository checks without representing the omitted full suite as passed. It is invoked for that commit only; the tracked hook configuration remains unchanged.

Round2 failed a frontend focus assertion after backend/database/image checks passed. Round3 includes a test synchronization correction, passed the early 730-test release unit suite, and was in the isolated database suite when this instruction arrived. Original failure/source/logs remain preserved; round3 results will be recorded separately. Local broader unit testing included 740 tests because it also found the held, unshipped experiment. No production qualification pass is inferred from either count.

## Release boundaries

Commit and push the prepared source to main. Retain exact-commit build/CI observations, immutable image scans/SBOMs and operator signature. Bind private deployment preparation to the explicit waiver, never a fabricated normal-full receipt. Verify migration41 preconditions and owner/account/order/policy preservation before startup. The migration is forward-only; old schema40 application images cannot be used after it. Off-host backups remain absent. A test waiver does not resolve those separate recovery facts.

Preserve payment policy revision3 and its agreement, USDT/BSC checkout enabled, outgoing refunds/payouts disabled, deletion disabled and private webmail. No live financial or external-email test is authorized. Stop on an unsafe installation condition rather than claiming a test waiver proves deployment safety. Record actual activation and post-deployment observations only after they occur.
