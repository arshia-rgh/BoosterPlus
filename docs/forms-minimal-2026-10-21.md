# FORMS172 — minimal customer forms

Owner request, 21 October 2026: make every user-facing form minimal, easy and straightforward. Remove unnecessary explanatory text and definitions, fix field alignment and improve layouts where needed. Every change is reviewed and decided by an independent senior UI/UX designer. The owner also asked to remove the homepage service explorer's “Availability is shown on each game page.” note. Then deploy through the normal signed procedure.

## Boundaries

- Scope: customer-facing storefront forms and the shared form primitives they use. Staff authoring forms change only through shared components.
- Preserve legal/consent controls, payment/network instructions, protected-credential warnings, fee/commission/refund disclosures, owner-authored catalog/product text, accessible required indication, error association, focus behavior, validation and business/security logic, and the green/champagne direction.
- Focused checks only; no full gate. No publication, message, invoice or funds test. A fresh exact recovery decision is required after the signed candidate and preflight.
- User-owned prototype/cameo files remain untouched.

## Changes

- Homepage service explorer: removed the shop/news “Availability is shown on each game page.” note and its unused style.

- Every customer form family follows the senior designer's decisions S-01–S-09 and F-01–F-140 (except owner-authored catalog help F-35): one green field system, aligned two-column grids, unframed nested fieldsets, aligned checkboxes, one action row with primary/secondary/destructive hierarchy, quiet required/optional flags, and much shorter task copy. Legal consent, payment route and funds-safety notes, protected-credential warnings, fee/refund disclosures and authored product terms are unchanged. Checkout's action is now "Go to payment".
- The shared stylesheet `frontend/app/ui/forms.css` loads with the form-validation module because the root stylesheet is at its size budget.

## Review and qualification

Four rendered review rounds ended in **PASS**; findings, fixes and limits are in [the review record](redesign/reviews/FORMS172_DESIGN.md).

Local focused evidence on the final source: 991/991 component cases including one untracked user-owned cameo file (tracked suite: 208 files / 981 cases); 146/146 self-hosted fixture browser cases on desktop and Pixel 7 Chromium, including new regressions for field alignment, identity label gaps, filter-action alignment, supplier consent placement and secondary refresh actions; strict types, lint, formatting, repository checks and all three production builds with asset budgets. Customer fixtures now use the production `storefront-app` body class. Earlier failures are retained privately under `.cache/forms172/`: 46 stale-copy component assertions after the first implementation, two Vite dependency-cache races, a 5 px filter offset caught by the new regression, a phone-width drawer case, and one uncaptured readability failure that did not recur in 45 later runs. No full gate ran.

## Required release remediation — Go 1.27.3

Exact CI39615022613 for `1f03f43` failed its mandatory backend `govulncheck` with standard-library advisory [GO-2026-6809](https://pkg.go.dev/vuln/GO-2026-6809) (crypto/x509 distrust of compromised intermediates), published 21 October 2026 and reachable from `media.Clamd.Scan`. Pinned Go 1.27.2 is affected; [Go 1.27.3](https://go.dev/doc/devel/release) is the fixed release. The form changes did not cause it, and the live `c8530fc` binaries were built with the affected toolchain. Preserve the failed CI log and result under `.cache/forms172/`.

The narrow remediation updates `backend/go.mod` to `go 1.27.3` and both builder images (`backend/Dockerfile`, `production/gateway/Dockerfile`) to the official `golang:1.27.3-bookworm` index digest `sha256:972b4110ba0f47539a975c31e52c64765e1ff19f2d74469ae4a595c6676e80a5`. Runtime bases, Caddy/xcaddy and dependency replacements, configuration, schema47 and scanner thresholds are unchanged; no advisory is accepted or suppressed. Local `govulncheck` with Go 1.27.3 reports no affecting vulnerabilities (one unused-module advisory remains, as before). This is implementation required for the requested deployment, not a new owner risk exception; it uses the normal full-scope focused hook.

Remediation commit `dd91020` passed the full-scope focused hook. Its exact CI39676014163 then passed backend checks and all 208 tracked frontend component files / 981 cases, but the mandatory `npm audit --audit-level=low` failed on dev-only test tooling advisories [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) and [GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp) (`@vitest/mocker` < 5.0.3), published on 21 October after the local hook's clean audit. Preserve that failed log. `vitest` and `@vitest/coverage-v8` move to the minimum patched 5.0.3 with exact pins and lockfile binding; the audit threshold is unchanged and reports zero vulnerabilities.

Count correction: local component runs reported 209 files / 991 cases because they included the user-owned untracked cameo test file, which is never committed. The tracked suite is 208 files / 981 cases, as CI reports.

The normal hook, exact CI, signed image release, server preflight and a fresh exact recovery decision remain required before activation. No publication, message, invoice or funds action is included.

## Deployment completed — 22 October 2026

Remediation commit `6eaad20` passed the normal full-scope focused hook, then exact CI39680232797 and image release39682617820 including image scans. The bundle was signed locally and verified against the trusted key. The server preflight bound the exact source and signed bundle, pulled all five images by digest, validated configuration and the isolated gateway, confirmed migration history at schema47 and passed current/candidate dependency and storage probes, all without changing the live release.

The owner approved exactly “Deploy 6eaad20 forms update with this recovery risk” about four minutes after the preflight. Normal signed activation completed at schema47; all eight services are healthy on the exact signed images, public HTTPS/redirect boundaries, unchanged public legal/retention responses and private webmail passed, and runtime and private configuration hashes are unchanged.

Twelve live read-only Chromium cases passed with every non-GET request aborted and nothing typed or submitted: the homepage note is absent; customer sign-in has no single-step chip and a 9 px label gap; the custom-boost form has no range/step hint, quiet required flags, green fields and the coupon field; the unpublished MLBB shop shows its honest unavailable state; desktop account filters sit below the fields at the column edge with 48 px actions; admin and booster sign-in render. The first two live harness runs stopped on harness assumptions (custom services need `?path=custom`; the shop has no published products) and are retained under `.cache/forms172/failed-live-*`; they were not application failures. Shop filter alignment remains covered by fixture regressions only.

Current manifest: `/srv/playora/releases/6eaad20/deployment.env`. Private evidence: `/srv/playora-qualification/forms172` and `.cache/forms172/`. The one-release recovery exception is consumed. Off-host backup remains absent; the prior signed `c8530fc` is retained without claiming qualified application rollback, and recovery may require a forward fix. Checkout is enabled; supplier purchases, outgoing transfers and deletion remain disabled; Vendoria is absent. No publication, message, invoice, funds or customer-data test occurred.
