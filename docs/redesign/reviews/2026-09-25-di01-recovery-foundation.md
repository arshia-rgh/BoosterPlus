# DI01 shared feedback, background and recovery review

25 September 2026. Scope: changes after `57ec5e2` to shared runtime recovery/feedback, visible ambient background and affected customer/booster/admin shells. Companion game-shell/artwork changes have their own [three-round review](2026-09-25-di01-game-shell.md). Reviewer: senior UI/UX designer `/root/di01_chrome_review`. This is implementation review, not authorization for final launch.

## Round 1 — findings

- **F01 — retry behavior:** focus refresh could bypass Retry-After, and manual retries had no in-flight lock or busy feedback. Fixed one shared cooldown and lock for focus/manual retry, revision protection for superseded session reads, and disabled “Checking connection…” feedback. Completed authentication changes can supersede an older read but cannot bypass a server cooldown. Unit/browser tests cover delayed retry, focus during cooldown/in-flight, explicit recovery and stale responses.
- **F02 — rate-limit identity:** a 429 looked like a connection failure, including when Retry-After was absent/invalid. Heading now follows HTTP status; a bounded valid header supplies the actual UTC retry time. Invalid headers never invent a deadline. Preserved editable form inputs and stable feedback during cooldown.
- Independent axe testing found missing document titles on root recovery pages. Added status-specific titles and reran all affected cases; raw upstream error/query content remains hidden.

## Round 2 — rendered/evidence review, PASS

The reviewer inspected 11 actual built-application captures plus the six passing desktop/mobile browser scenarios and changed source. Rendered states: customer orders/background, booster inline 429, admin loading, root 401/403/404/429/503, appropriate customer/booster/admin recovery destinations. Dimensions: 320×900, 390×844, 768×1024, 1440×960, short 768×360, and 320px with 200% root text. No horizontal page overflow in captured scenarios.

Automated interaction evidence: missing-page workspace recovery; offline→online transitions; axe with zero violations; no reflected query detail; Retry-After cooldown and no focus-triggered extra requests; disabled pending retry; successful explicit recovery; enlarged-text navigation, Escape and trigger focus restoration; transparent foreground over shared artwork; computed motion changes under operating-system reduced-motion preference. The existing motion preference tests cover persistence and unavailable storage. Game-specific artwork suppresses generic ambient art.

Reviewer verdict: **PASS — no remaining actionable findings in the reviewed DI01 shared foundation scope.** F01/F02 resolved. Evidence was temporary local fixture captures `/tmp/di01-foundation-*.png`, `/tmp/di01-foundation-evidence.json`, and `/tmp/playora-foundation-focused.log`; reproducible scenarios are committed under `frontend/tests/e2e/recovery-foundation.spec.ts` and `workspace-chrome.spec.ts`. Temporary captures are review evidence, not public assets or production data.

## Limits

Direct reviewer browser access was unavailable. The reviewer independently inspected captured renderings and the implementer's automated interaction evidence; no independent live interaction, physical-device, true browser zoom or subjective live-animation qualification is claimed. Synthetic read-only sessions do not qualify real portal authentication. Broader component/page adaptation, DI02 isolation and final-launch readiness are outside this verdict. The full tracked repository gate remains mandatory for this backend/tooling-containing stage; a focused pass does not replace it.
