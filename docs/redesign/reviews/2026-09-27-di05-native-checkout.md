# DI05 native checkout — scoped senior review

27 September 2026. Base: `d73a39e5bddd699aad2f48afbf0defe6a2e14df3`. Reviewer: `/root/di05_design_review`, independent senior UI/UX designer. Increment A's earlier PASS remains separate.

Scope: P09–P11 payment presentation, exact asset/network/amount/address/QR/memo, provider/local expiry, freshness, reconnect, copying and failure recovery. Existing order shell and other phases are outside this increment. Preview uses the production frontend build and private local synthetic API fixtures; it cannot perform merchant operations.

## Round 1 — FAIL, source review

- **PAY-UX01 / high:** reconnect revealed a cached QR/address before its fresh request succeeded. A monotonic request barrier now withholds instructions until a response dispatched after reconnect succeeds. Existing private-data failure handling remains closed.
- **PAY-UX02 / medium:** the outer heading could say payment was ready while the nested QR correctly refused stale, expired or offline instructions. A shared effective status includes provider expiry, evidence freshness and connectivity; headings and actionable instructions now agree.

Component regressions cover the fixes; source review alone was not a gate pass.

## Round 2 — FAIL, independent rendering and interaction

The reviewer independently launched repository Playwright against the local preview after the CUA browser became unavailable. Actual rendered sizes: 1280×900, 768×1024 and 320×800. States included ready with memo, refreshing, provider-expired, confirming, settled and request failure. No horizontal overflow was observed.

- **PAY-UX03 / medium:** the main local checkout deadline competed with a shorter provider deposit deadline far below the QR. Native checkout now shows one canonical **Send before** deadline above the QR, bounded by both windows. The local deadline remains in history rather than appearing as another send-funds deadline.
- **PAY-UX04 / medium:** generic retrieval errors omitted instructions against a duplicate payment. Payment failure now says status cannot be verified, retains the order context and tells customers who already sent funds to wait/retry/contact support rather than send again.
- **PAY-UX02 follow-through:** clipboard feedback survived when its referenced address disappeared. Feedback is bound to the exact response and displayed only while instructions are usable, so a new response cannot resurrect an old copy/failure message.

The reviewer independently simulated clipboard denial and held a reconnect GET. QR/address/copy actions stayed hidden offline and during the pending refresh, then returned on fresh success.

## Round 3 — PASS

**PASS — no remaining actionable findings in the scoped native payment UI increment.** The reviewer re-rendered the corrected production build and verified PAY-UX01–04 and clipboard follow-through. Exact amount, network/memo guidance, canonical deadline, error guidance, no overflow and reconnect behavior were verified. Review browsers were closed and preview restored to its ready mode.

Local evidence: `/tmp/di05b-independent-evidence.json`, `/tmp/di05b-independent-*.png`, `/tmp/di05b-clipboard-denied.png`, `/tmp/di05b-reconnect-pending.png`; actual API browser qualification also captures `frontend/.cache/checkout-{desktop,mobile}.png`. Runtime captures are excluded from commits.

Limits: synthetic provider states and local desktop browser emulation; no real merchant calls, actual funds or physical-device qualification. This verdict does not certify remaining DI05 work, DI06–DI15, the full commit hook or final launch.
