# DI01 shared foundation qualification

25 September 2026. **Delivered — scoped senior reviews and complete tracked commit gate passed.** This document qualifies the shared foundation, not all 130 designed views or the later connected feature journeys. DI02–DI15 and held R10/R11 keep their own acceptance requirements.

## Component inventory

| Requirement | Runtime implementation and integration | Evidence |
| --- | --- | --- |
| Green tokens, typography, spacing, surfaces | `ui/design-system.css`, existing `styles.css`, scoped `ui/workspace.css`, `experience/experience.css`, admin/account styles | Representative role/game/phone/tablet/desktop captures; enlarged-text and contrast checks |
| Primary/secondary/text/destructive and busy actions | `ui/primitives.tsx` Button; common Identity Form uses busy geometry | Six component-fixture browser scenarios, exact delayed-response width and disabled state, unit/component tests |
| Labeled fields, help, inline errors and summary | `ui/form-validation.tsx`; Identity Text/Form use registered local fields, server issues, focusable summary links and honest correction feedback | Identity unit tests and real component browser fixture; safe input preserved; generic errors remain bounded |
| Status variants and cards | StatusBadge neutral/positive/warning/danger/info, real catalog status; existing scoped game/account/admin card patterns | Component variants and actual GameCatalog fixture; shared screenshots/axe |
| Loading, empty, failure and durable feedback | Skeleton (bounded geometry; decorative when the parent owns the announcement), PanelState, Feedback, RetryButton, ErrorPage | 401/403/404/429/503/offline tests, heading/document title/privacy checks, real cooldown/busy/focus recovery |
| Table and pagination | TableRegion extracts the existing reports caption/header/keyboard-scroll pattern; CursorPagination used by GameCatalog; filterQuery removes stale cursors | Arrow-key scrolling and 320px containment; actual catalog cursor/filter/error/retry URLs; pending navigation tests |
| Public/customer/booster/admin shells | SiteHeader/Footer/AmbientBackdrop, CustomerShell/AccountNavigation, existing AdminShell; explicit workspace labels | Shared chrome/recovery review; drawer Escape/focus tests; full existing route browser suite remains required |
| Game identity/artwork | GameShell around game/service/package/review routes; optional immutable published focal metadata and framing editor | Game-shell three-round review, server publication snapshot tests, focus/Back/retry/image failure/CSP/viewport tests |
| Local record navigation | RecordShell primitive, query sections, bounded known section selection; caller retains draft/return context | Unit tests and test-only real browser deep link/Back/Forward/draft/focus journey; real order integration is later |
| Dialogs and drawers | Retained native account/admin/filter/gallery dialogs, scoped focus restoration; modal only when the interaction needs it | Existing browser regressions plus representative account drawer enlarged-text/focus test |
| Shared motion/contrast | Accepted ambient art behind readable foreground; same game hero/backdrop; persistent/OS preference | Computed animation-state browser assertions, storage failure/unit tests, earlier game review |

The shared components do not make authorization decisions, invent commercial data, execute a mutation after reauthentication or persist private drafts. Form errors are field-linked only for registered Text controls; remaining specialized controls retain their current validation until their owning feature phase adapts them. Existing native labels/required constraints are preserved.

## Reproduction and scope

- Complete required check: root `make pre-commit` (also enforced by the tracked hook for this backend/tooling-containing stage). It retains repository/secret/workflow/contract checks, backend Go/security/race/TiDB/storage/scanner/migration/container checks, frontend strict checks/audit/unit/browser/axe/build/container checks and existing production regressions.
- The ordinary desktop/mobile browser run includes `foundation-components.spec.ts`, `recovery-foundation.spec.ts`, `workspace-chrome.spec.ts`, game-shell and catalog-editor scenarios. The component fixture starts a loopback-only temporary Vite server without environment files and closes it after its tests. It is not imported by either production build.
- The known long-lived local TiDB slowdown caused one full hook to fail during migration setup (907.843s). An independent read-only health query also timed out; the container was near two CPUs. After restart, the exact failed test passed in 5.764s. The next full gate uses a fresh mount-free pinned TiDB instance at the already-allowlisted loopback port 14001, with the same two-CPU/3-GiB limits. No assertion or timeout changed. See the existing disposable-test procedure in `docs/visual-design.md`.
- Local test discovery also sees the owner's held untracked cameo test file. The tracked-test-only run passed 71 files / 223 cases with unchanged 100% route coverage thresholds. The ordinary local run passed 72 files / 233 cases, including ten expanded cases in that held file; it remains uncommitted and absent from production bundles.
- The next fresh-database attempt also failed (541.888s). VM diagnostics showed memory/swap exhaustion and TiDB memory alarms. PLAYORA's idle development database was stopped without deleting its volume; the mount-free test database was recreated. Unrelated containers were left running. This infrastructure failure remains an unsuccessful gate, not waived evidence.
- Actual admin loading integration received an additional C03 fix/review: explicit skeleton width inside PanelState, checked at 320/768/1440px with one announcement, visible lines, reduced motion and no overflow. Both targeted browser projects and the senior follow-up review passed.

## Review receipts and limits

[Shared chrome](reviews/2026-09-25-di01-shared-chrome.md), [game shell](reviews/2026-09-25-di01-game-shell.md), [recovery](reviews/2026-09-25-di01-recovery-foundation.md) and [components](reviews/2026-09-25-di01-components.md) all received scoped senior PASS after fixes. Recovery/component reviews used captured renderings and inspected automated interaction evidence because direct reviewer browser access was unavailable. Physical devices, true browser zoom, subjective live-animation acceptance and the complete design-match owner review remain DI15 qualification items.

DI01 does not claim separate authenticated sessions (DI02), the final homepage/game capability discovery (DI03–04), every real order using RecordShell (DI06/08/09), redesigned chat (DI07), commerce/shop/news completion, production implementation or launch readiness.

## Additional gate investigation

A subsequent full hook passed the complete backend suite (407.129s integration), frontend 233 local unit cases, all 42 ordinary + 1 policy scenario in **each** browser project, builds, audits and image/container checks. It then failed isolated deployment migration with database/DNS timeouts under VM pressure; it is not a complete pass. The deployment-only rerun exposed an independent fixture IPAM collision. The staging fixture now explicitly selects three unused non-overlapping /24 subnets instead of mixing a fixed edge subnet with automatic network allocation. Collision/exhaustion/malformed-inventory tests pass. A complete hook is still required after this bounded existing-regression repair; production launch implementation remains held.

The corrected isolated deployment regression passed explicit migrations, TLS authentication/cookies/authorization/CSRF, gateway routing/headers/private caching, dependency outages/recovery and graceful shutdown. On this memory-constrained workstation, completed PLAYORA development/test services must stop after the frontend browser fixtures clean up and before the independent staging services start. Development volumes are retained and services restored afterward. The complete tracked hook remains unchanged and is rerun in full; isolated success alone is not a commit-gate pass.

## Final verified result

The unchanged full tracked commit hook passed for `677907da5eafd31b103d1e43a2faf380838b0924`. Backend evidence includes formatting/generated-code checks, vet, golangci-lint, standalone gosec, govulncheck, module verification, race tests, TiDB/storage/scanner integration (**408.016s**), migration/build and image/config checks. Frontend evidence includes strict types/lint, formatting, contracts, **233 local unit/component cases** (223 tracked cases plus ten held untracked cameo cases), dependency audit, both builds/budgets, server tests, **42 ordinary + 1 policy scenario on each desktop/mobile project**, axe and both container/image checks. Existing isolated deployment regressions passed TLS routing/sign-in/cookies/CSRF, migrations, private caching/headers, dependency outages/recovery and graceful shutdown.

The resource handoff stopped only completed PLAYORA test services after browser cleanup, before the independent staging suite. Development services were restored afterward. No test was skipped, assertion weakened or hook bypassed. Earlier failed attempts above remain recorded. X01 is verified for this phase; every other feature view and DI02–DI15 retain their separate status. This is scoped automated and senior evidence-based qualification, with physical-device/true-zoom/subjective motion and final owner design-match acceptance still open under DI15. R10/R11 remain held.
