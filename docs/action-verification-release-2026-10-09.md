# Contextual verification and visual refinement — combined release

Status: implementation in progress. The owner approved the listed scope on 9 October 2026. The previous database-only retry was cancelled at the owner's request; its fixture cleanup and unchanged production container identities were verified. No completion or deployment is claimed.

## Accepted behavior

Keep independent customer/admin/booster accounts, host-only sessions and panel-local security. Staff sign-in still requires Google/email followed by an authenticator. After completed sign-in, a protected action requires only one fresh factor: an authenticator code or a code delivered to that same account's verified email. The API must enforce this policy, transactionally rechecking account, role, session, ownership and business prerequisites before the action occurs. Email re-verification must not erase proof that this session already completed its mandatory sign-in MFA; it must not grant MFA to a session that has never completed it.

Open an accessible modal in the current workspace when verification is needed. Explain the intended action, keep its draft in memory, allow cancellation, show clear code errors and resend/expiry timers, and resume only the original action once verification succeeds. Reject replay after account/portal/route changes or sign-out. Never automatically retry an uncertain payment or other non-authentication failure. Verification must not send users to a separate security page. Keep authenticator enrollment, recovery and session management in Security; remove standalone re-verification controls. Sensitive customer operations use this same contextual experience without inheriting staff privileges or universal staff MFA.

Replace inappropriate permanent underlines on service cards, navigation, dashboard rows and actions with deliberate clickable card/button styling. Cover the supplied game-card and customer-overview examples, admin and booster panels, keyboard focus, hover, selection and disabled states. Keep the existing green palette, typography and artwork. Use a coherent SVG icon family with distinct boosting, account, shop, news and payment meanings; replace generic repeated diamonds and unrelated decorative homepage glyphs.

## Combined delivery and verification

Include all pending independent-panel, email-resend, win-rate, inline-validation, public-contact/QR, hosted-checkout/minimum and reviewed UX corrections documented in `independent-panels-checkout-2026-10-08.md`. Preserve policy revision3, USDT/BSC checkout enabled, outgoing transfers/deletion disabled and private webmail.

The previous one-use scoped commit continuation is superseded and will not certify this expanded source. Complete focused development checks and senior UI review, then freeze a fresh source snapshot and run the normal complete suite. Perform the owner-requested independent customer/seller, admin and booster manual reviews while full qualification runs, with a senior designer resolving observed findings. Later fixes require evidence for their actual changed source. Use isolated synthetic accounts/providers; no real funds or external test email.

After successful combined qualification, commit/push main, qualify exact-commit CI and signed release images, complete schema41 compatibility and live preflight, and deploy with post-deployment checks. Schema41 remains forward-only and off-host recovery remains absent. Preserve prior failed/cancelled records and report the actual release changelog in chat.

## Development review

Implementation now includes the one-factor freshness policy, bounded in-page continuation, isolated portal modal hosts, safe cancellation/identity-change guards and matching service SVG/link styling. The senior design review completed its correction rounds; see `redesign/reviews/ACTION_VERIFICATION_2026-10-09.md`. A new `panels141` server qualification checkout is being prepared; no new full-suite pass or deployment is claimed.

The 9 October live dependency scan identified 12 called Go standard-library advisories affecting Go1.27.1, all reported fixed in Go1.27.2. The [official release history](https://go.dev/doc/devel/release#go1.27.2) confirms the 8 October security release. The module and backend/gateway builders now select 1.27.2; the official bookworm image index is pinned to `sha256:5cf287a799e6b94384bad13d16b14904c531f51ba65792237e122ce42b392f61`. Re-scan, rebuilt image qualification and full-suite evidence remain required; the earlier failed scan is retained rather than accepted or suppressed.

The Go1.27.2 live rescan reports zero called vulnerabilities and zero vulnerabilities in imported packages; one advisory remains only in an uncalled required module. Frontend development validation passed all 732 unit/component tests and all six new desktop/mobile verification journeys. These results do not replace the pending complete server qualification.

The patched compiler exposed an export-data compatibility failure in golangci-lint2.13.2. Rebuilding that same version did not resolve it; the maintained official2.14.0 release passes the unchanged broad lint configuration with zero findings. The backend bootstrap now pins2.14.0, and the fresh server runner rebuilds all pinned Go analysis tools after applying the candidate. Earlier tool failures remain private evidence; no lint rule or security threshold was relaxed.

## First full run and manual-review corrections

The fresh `panels141` run reached the unchanged normal complete hook after infrastructure/security/configuration prechecks. It failed at Ent generation because `golang.org/x/tools`0.49.0 could not decode Go1.27.2 export data. That failed log and source are retained. Pinning the maintained loader0.51.0 resolves generation without changing generated Ent code; lint, standalone gosec and live vulnerability checks pass. Only this run's stopped synthetic fixture containers/volumes were cleaned, with production container identities confirmed unchanged.

The requested three role testers and separate senior designer reviewed the frozen UI while qualification was underway. Their findings, correction rounds and honest coverage limits are recorded in `redesign/reviews/PANELS141_MANUAL_2026-10-09.md`. Corrected reveal/review/favorite outcomes retain local keyboard context, stale verification wording is removed, and the provider-check modal has a specific action label. A separate `panels141-round2` checkout is prepared for a new complete suite after final review. No failed attempt or synthetic result is represented as production qualification.

## Second full run: test synchronization correction

`panels141-round2` passed backend static/security/unit checks, the isolated database integration suite (4,469.990 seconds), and backend/scanner image checks. Frontend unit qualification then failed: the dynamically imported verification dialog's input existed before its opening/focus effects completed. The immediate focus assertion failed; test cleanup cancelled the still-pending action, producing a secondary unhandled rejection. The run remains failed, with later browser/production qualification unexecuted.

The test now waits for the open dialog and focused input, retaining the focus assertion. It observes pending action settlement during teardown while each test still asserts the original promise's success or rejection. Email/error focus assertions also await their effects. Application behavior, timeouts and coverage thresholds are unchanged. The failed source/logs are preserved; `panels141-round3` will run the complete normal gate, with an additional early frontend unit precheck to catch this failure before the expensive database suite. Production and financial settings remain unchanged.
