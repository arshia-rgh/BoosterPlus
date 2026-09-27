# DI07 support and conversation qualification

27 September 2026. Delivered as `682a74b994ab52e8b0ea24a298f3f0e48113af54`, following DI06 implementation `09a0c11b87abaf2754018a62b3609f0a7ce40bdb` and receipt `019a7ac16d79fe8f0cce62659d7e12e2f1c68498`. Final launch remains held.

## Applied scope

Customer and staff inboxes apply subject/reference, status, conversation type and unread filters on the server before pagination. Staff assignment/customer filters remain restricted to staff. Search covers bounded subject/reference metadata only, never messages or internal-note contents. Customer ordering uses public activity timestamps; internal notes cannot promote or mark customer threads unread. Opaque timestamp/reference cursors paginate activity order; legacy UUID cursors remain accepted only after resource membership checks.

Inbox query state survives thread entry, conversation switching and return. New-support creation validates its subject, locks rapid repeated submissions and freezes ambiguous requests for retry with the same idempotency key. The composer visibly distinguishes private support/seller audiences from explicitly shared assigned-booster coordination. Desktop Enter-to-send is explicit opt-in, default off; send buttons, Shift+Enter and IME remain supported. Existing separate public/internal drafts, private attachments, scanned proof, history/reconnect and access revocation remain in scope for regression.

## Evidence so far

- Applied frontend types, ESLint, both production builds and330 local component cases pass (320 tracked plus ten held experiments). Coverage metrics apply only to configured coverage modules.
- Applied golangci-lint and standalone gosec pass after fixing one import-grouping finding in the new integration test.
- Isolated TiDB discovery race integration passes6.650s: more than50 conversations, cursor traversal, literal wildcard matching, case-folded subject discovery, ownership, invalid/staff-only filters, private-note ordering and audience-specific unread markers.
- First focused real-API run passed fulfillment and seller flows on desktop/mobile. The existing chat filter-return journey failed because it selected the new draft filter but did not submit the explicit search form. The journey now submits Search conversations and verifies the URL before entering a thread; retained-filter/reading-position assertions remain unchanged. A full focused rerun is required. Log: `/tmp/playora-di07-focused-browser.log`.
- Scoped independent designer review is pending on the applied storefront/admin builds with synthetic fixtures. Complete unchanged hook and delivery remain required.

No live provider credentials or real money are used. Fixtures cannot qualify live payments or physical-device keyboard behavior. DI08–DI15 and owner acceptance remain subsequent work.

## Scoped review corrections

Round1 found two actionable issues: DI07-UX01 standalone history collapsed under the composer at320x450 (also independently caught at390x430 by the real-API browser test), and DI07-UX02 the full recipient list was clipped in the narrow native staff selector. Narrow/short rooms now use intrinsic height, a12rem minimum history area and ordinary page scrolling. The staff selector stays short, with the full recipients in separate wrapping text; private-note warnings remain explicit. The browser history assertion is strengthened from greater than35px to at least190px. After these fixes, types/lint,330 local component cases and both builds pass; a third focused browser run and designer recheck remain pending.

The second focused browser run passed its filter-return checks but failed the later short-height history assertion on both device projects; it is not a passing support journey. Log: `/tmp/playora-di07-focused-browser-2.log`. Missing admin logos in the initial synthetic preview came from separate-origin preview routing: admin-only serving lacks the storefront `/brand` paths normally served behind the shared gateway. The review listener now serves both app handlers, matching normal browser-test/gateway asset routing; no application asset change was needed.

Search validation now uses the existing Unicode-character validator rather than a byte limit, with a160-character multibyte regression case. The final full gate still needs to qualify this applied correction.

## Final scoped qualification before complete gate

The third focused real-API run passes all six journeys (support, fulfillment and seller, each on desktop/mobile), including unchanged private attachment/reconnect/duplicate-send assertions and the strengthened narrow history check. The Unicode discovery race integration also passes. Log: `/tmp/playora-di07-focused-browser-3.log`. The designer's rebuilt round2 is **PASS** at1280x900,768x1024,320x800,320x450, with16 clean accessibility/overflow samples and8 passing keyboard/filter-return combinations. See `reviews/2026-09-27-di07-support.md`. The complete unchanged tracked hook must still pass before this phase is delivered.


## Complete gate and delivery

The unchanged complete tracked hook passed on the applied tree: Go dependency verification, live govulncheck, golangci-lint and standalone gosec, race units and TiDB integration (572.972s), generated-code and 30 explicit migration checks, 330 local component cases (320 tracked plus ten held experiments), 106 browser journeys, frontend/backend builds, dependency/image scans and isolated TLS deployment regressions. Log: `/tmp/playora-di07-resource-gate.log`. The implementation was committed and pushed directly to main; its SHA matches origin/main. Earlier failed focused attempts above remain recorded, not counted as passes. All seven DI07-owned views now have scoped implementation evidence; cross-phase journey acceptance remains DI14/DI15. Final launch is held.
