# Terms-link accessibility hotfix — 11 October 2026

Status: signed `3a9f6943133cad7e8757d433b8b617492e0f4792` deployed and verified on11 October2026 at schema41.

The owner requested fixing the remaining account-terms link accessibility issue, running related tests and deploying the hotfix without another complete suite. This is a new, bounded authorization for this CSS fix; it does not reuse the previous release's consumed waiver or claim that its failed full run passed.

## Change and scope

Base source: `579efb0e1bb50202d8e474a36c4e82e29bc83d2d`; current production release: signed `fb31bb082ee673c12c25e5959cd1151631e74640`, schema41.

Persistent underlining and a small underline offset make inline consent links identifiable without relying on color. The rule targets direct links inside `.identity-card .check` only. Existing focus outlines, green theme, card/navigation styling, link destinations and checkbox behavior remain intact. Email and Google sign-in use the same component across customer, admin and booster panels.

The existing failing layout scenario now also covers the booster panel and checks both consent links before hover and when focused. Its axe audit, six viewport widths, recovery disclosure and 200% text/long-label checks remain. No assertion is weakened or skipped.

## Verification and delivery boundaries

Use the scoped browser/accessibility regression in Chromium and WebKit, related identity unit tests, frontend build/type/format/lint checks, repository/secret checks and separate senior rendered UI review. Local browser tests use an explicit signed-out synthetic API; unknown routes fail closed. Initial fixture startup omitted its required proxy key and produced503; that failed setup is retained separately and corrected with a synthetic key. No real sign-in, external email or payment is exercised.

A private one-use commit receipt binds the exact staged tree and passed scoped evidence under this owner's instruction. Normal tracked hooks and future requirements remain unchanged. Exact-commit lightweight CI, scanned immutable release images, signature verification, production preflight and post-deployment checks still apply. No complete backend/database/browser suite is claimed or required for this bounded CSS change.

Deploy at the existing schema41 with identical backend configuration, portal origins, payment policy revision3, enabled checkout, disabled outgoing payments/deletion and private webmail. This is a same-schema application update; retain the previous signed schema41 release for application rollback. Off-host backups remain absent, as already disclosed and accepted in the immediately preceding deployment discussion; record that fact rather than a fabricated recovery pass. The owner explicitly requested this hotfix deployment in that known state. No provider transaction or external-message authorization is added.

## Focused results

All three frontend production builds and their budgets passed. Format/lint/type checks and 34 related identity unit tests passed. The expanded original layout/accessibility regression passed both desktop/mobile projects in Chromium and WebKit (four scenarios, each covering all three panels, six widths and 200% text). Senior reviewer `terms142_designer` passed 18 rendered route/width/engine cases and 36 keyboard-link checks with no actionable findings. Native macOS WebKit uses Option+Tab for links when its standard Tab preference skips anchors; both keyboard modes were distinguished honestly. See `docs/redesign/reviews/TERMS142_2026-10-11.md`.

Implementation commit: `1b82facd61d9bb28586260fc5e7da0f5143a3a08`. Exact-commit CI `38153501478` passed on attempt2. Attempt1 failed the unchanged development-launcher readiness test; its original logs are retained. The two launcher checks passed locally, and the single CI retry passed without source or assertion changes. The first failure's underlying cause was not established and is not claimed fixed. CI retained standalone gosec, live dependency scans and lightweight deployment configuration checks; no complete database/browser suite was restarted. Private evidence is under `.cache/terms142/`.

## Required gateway security remediation

The first image release, `38154783849`, failed its normal gateway image scan with `CVE-2026-78669` in the existing `golang.org/x/net v0.56.0` replacement. No release was signed or activated. The [official Go advisory](https://pkg.go.dev/vuln/GO-2026-6611) identifies excessive HTTP/2 SETTINGS processing as a CPU denial-of-service issue and lists `v0.60.0` as fixed. The complete failed log and source remain preserved.

As the narrow remediation necessary to deploy this hotfix, update the existing gateway dependency replacements to `x/net v0.60.0` and its declared minimum `x/crypto v0.57.0` / `x/text v0.42.0` dependencies. Retain the pinned Caddy release, Go compiler, base images, gateway configuration and runtime privileges. Qualify the actual rebuilt amd64 image, live vulnerability scan, isolated HTTP/1.1 and HTTP/2 routing/header/TLS-host boundaries, deployment unit/configuration checks and fresh exact-source CI/image/signature evidence. The owner-requested focused scope does not require restarting unrelated database/application suites, and no security finding is waived. The unchanged consent-link checks and senior review remain bound to their original file hashes. Private remediation evidence is under `.cache/terms143/`.

The rebuilt amd64 gateway passes the live Trivy fixable HIGH/CRITICAL gate with zero findings. Twelve isolated HTTP/1.1/HTTP/2 checks pass for all three hosts, strict SNI, proxy-header stripping, the artwork upload route and redirects. The fixture uses synthetic certificates and upstream responses on an internal-only network; no real email, sign-in or payment occurs. The two setup failures are retained: Docker did not expose ports on its internal network, and synthetic certificates required the same explicit redirects used by the established staging fixture. The corrected fixture runs its client inside the isolated network and preserves the assertions. Deployment preparation passed77 unit tests plus configuration/mutation checks without service startup. Backend lint, standalone gosec and live source govulncheck passed.

An additional, non-gate binary diagnostic with govulncheck1.8.0 and1.9.0 exited3 with six module-wide advisories. Neither extracted a symbol inventory from the stripped binary, so those runs are not recorded as clean passes. Independent inspection of all54,214 runtime functions and the complete runtime function-name table found none of the implicated OpenPGP, CEL NativeTypes/ParseStructTag, S2 NewDict or Chi RealIP names. The raw diagnostics, extraction output, inspection helper and exact binary remain retained. This distinguishes module metadata from linked-function evidence; the [official scanner documentation](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck) describes its module fallback when binary symbols cannot be extracted. The normal image gate and backend source scan remain unchanged; no advisory was suppressed or accepted by this observation.

## Delivered release

Signed source: `3a9f6943133cad7e8757d433b8b617492e0f4792`. Exact-commit lightweight CI `38156598598` and the five-image release `38160763501` passed. Signature and all SBOM hashes verified. A temporary GitHub status-read connection failure interrupted the local coordinator; it resumed the same successful CI/build without rerunning tests or duplicating the release dispatch. The original interruption is retained.

Server preflight and deployment both passed. Current manifest: `/srv/playora/releases/3a9f694/deployment.env`. The release journal is complete, schema41 and its migration checksums verify, and the expected signed images are running healthy. All mounted configuration bytes stayed unchanged. Checkout remains enabled, outgoing payments remain disabled, and the existing payment policy, independent identities, MFA and deletion hold are preserved. Private webmail and all three HTTPS/HTTP-redirect surfaces passed. Temporary registry credentials were removed. The previous signed `fb31bb0` remains retained as a schema-compatible application rollback; off-host backups remain absent and are not claimed verified.

Twelve live anonymous Chromium/WebKit cases passed across customer/admin/booster login pages at320 and1440px, covering both visible consent links, focus, axe accessibility and200% text. Three canonical-host HTTP/2 login reads also passed. The initial standalone Node probe used an implicit `:443` authority, which the existing exact-host contract rejects with421; the corrected probe uses the configured canonical authority, matching the browser and existing host-boundary tests. That first result is retained, not relabeled. No real sign-in, external message, invoice, payment or staff action was performed.

Evidence is retained privately in `.cache/terms143/` and `/srv/playora-qualification/terms143/`, with runtime receipts under `/srv/playora/releases/3a9f694/`. The current focused hotfix authorization is fulfilled. Normal future gates and release policy remain intact; no full-suite pass is claimed.
