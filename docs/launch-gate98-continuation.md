# Launch gate98 continuation

The owner requested reuse of already-passed checks after repeated full-run failures. Gate98 completed the backend application gate (246 integration scenarios) and frontend npm gate (148 browser cases) before failing its frontend image scan. It never qualified production or created a commit. This continuation retains that history and does not label the failed overall run passed.

## Exact evidence

- Base: `7191e51c8c0530fe14c44cf9f8dd5b36e110b6e7`.
- Original113-file manifest SHA256: `367096aa377950ed07fc368b9b6844442c7e144d9d8f756f0f53a0d82471a9fe`.
- Complete failed log SHA256: `44da236a7fd214637de09cc954c80e2dc1a12b72218f1dfefe2284aac9816e7e`.
- Reviewed patched frontend Dockerfile SHA256: `be2be31e729261deb52565448688b312e1859eb298d7029739cf66f3dc420739`.

The private evidence stays on the qualification host; only hashes are committed. `scripts/launch_resume.py` requires the exact original evidence in `.cache/qualification/gate98`, the original base, all source changes staged, unchanged application source and regular file modes. Its only application-image delta is the official Debian PCRE2 update from `10.42-1+deb12u1` to `10.42-1+deb12u2` for CVE-2026-103111. The signed Bookworm security repository was queried inside the pinned official Node base to confirm availability.

Only the reviewed Dockerfile, configuration validator fixture/tests, continuation hook/tool/tests and AGENTS/progress/this record may differ from the frozen inventory. Arbitrary new paths or altered runtime/test/dependency source invalidate reuse. The staged tree and working tree must remain unchanged throughout execution. This is a one-use, run-specific continuation, not a general test cache or environment-variable bypass.

## Required continuation checks

1. Repository policy, secret, workflow and contract checks, including continuation negative tests.
2. Backend formatting, vet, lint, standalone gosec/live vulnerability/security checks; frontend dependency security checks.
3. Rebuild and scan backend/scanner and both frontend images.
4. Frontend container smoke checks.
5. Complete production pre-commit, including staging, infrastructure scans and isolated real-TiKV qualification.

Every remaining command must return zero before the normal tracked commit hook succeeds. The failed security check is rerun, never waived. Dependency services are isolated from live production. Real delivery tests are not authorized by this continuation.

Root/project `make pre-commit` and clean CI still execute their complete gates. Without the private evidence directory the hook uses normal selection. After a successful private commit, remove that private activation directory; the advanced HEAD also prevents reusing it. Preserve the original evidence elsewhere. Independent release/CI, live authentication/payment and activation requirements remain separate. Off-host backup qualification remains explicitly deferred by the owner rather than passed.

## Gate99 follow-up — 5 October 2026

Gate99 passed refreshed static/security checks, all application image scans, customer/admin container smoke, production unit tests, gateway scan and complete staging (TLS email sign-in, authorization, CSRF, dependency failure/recovery and graceful shutdown). It failed at PHP configuration syntax checking before infrastructure audit or real-TiKV qualification. The source `webmail` and plugin directories were0700 after the private qualification runner created them; the UID82 validator could not traverse the bind mount. The reproduced diagnostic was `Could not open input file`. No PHP syntax error or production mailbox credential failure was demonstrated.

The fix copies exactly three non-secret repository configuration inputs into a disposable validation fixture with0755 directories and0444 files. Its parent stays private, the source checkout permissions stay unchanged, and the validator remains non-root/read-only/offline. The regression covers a077 umask,0600 source files, exact copied inventory, original permissions and private enclosing directory. The continuation pins this exact validator change by hash; arbitrary deployment changes still invalidate reuse. Gate100 repeats all remaining continuation commands, including the complete production suite; it retains the original246/148 application checks only. Historical99 failure remains retained.
