# DI09 admin workspaces qualification — delivered

27 September 2026. Base: DI08 receipt `b59495b5576666cfca15a7355e196329c633918d`. Scope: A01–A04, A07–A14, A24 and A25. DI10–DI15 remain authorized; R10/R11 and final launch remain held.

## Implemented scope

- Persistent admin order context with local Overview, Request & decisions, Quote & agreement, Fulfillment, Messages & proof, Payment & cases and Activity. Compact sticky role/reference/status and visible current section; ordinary drafts survive local navigation and recoverable outages. Confirmed denial/session boundaries clear drafts; protected access unmounts when hidden or checking authority.
- Staff queue includes customer/assignee references, current agreement payment state and named next actions, omitted from customer responses. Server filters/pagination remain authoritative; Back restores filter/row context. Phones use complete labeled cards.
- Server quote preview computes the exact agreement without issuing, reserving coupons or granting fulfillment. Its HMAC binds order/version and commercial contents. The new editor requires preview and explicit review; issuance rechecks binding, revision and recent factors. Legacy callers retain an optional binding. Ambiguous issuance freezes edits until authoritative read-back; duplicate issuance is rejected.
- Admin-local catalog sections for game/ranks, intake, forms, pricing, packages, FAQs and publication retain drafts. Publication requires a clean preview of the saved revision. Server validation, immutable history, archive/restore and recent factors remain. Staff catalog search/state filters run before pagination and recheck authority.
- Directory search, role/account-state filters and existing confirmed role/session/suspension controls; session metadata identifies portal without bearer material. Owner audit has exact actor/action/target and inclusive UTC-day filters with stable pagination. Separate-tab admin verification preserves the original draft.
- Simultaneous browser session reads share only an in-flight request within one portal, preventing competing initial anonymous cookies and invalid CSRF. Completed responses are never cached; scoped session changes invalidate pending sharing. Server rendering never shares the browser map across users.

No migrations, dependencies, real payments or provider configuration changes.

## Verification and corrections

Targeted TiDB race integration passed (30.658s): quote preview without mutation, payload/cross-order/stale binding, duplicate issuance concurrency, recent-factor recheck, private queue projection, role/permission/portal metadata, audit filters/cursors and catalog discovery before pagination. Log: `/tmp/playora-di09-focused-integration-2.log`.

The first role-filter test failed because Ent's string-length validator did not enforce supported roles. An explicit allowlist corrected it; the rerun passed. Initial Go lint found an unnecessary portal string conversion; corrected, then lint and standalone gosec passed. No exclusions or threshold changes.

Changed real-API journeys passed nine desktop and nine mobile cases: catalog configuration/preview/publication/archive, custom/package decisions and immutable quote issue, fulfillment/protected access, independent staff MFA and authority boundaries, and finance fixtures. Log: `/tmp/playora-di09-focused-browser-2.log`. These precede the last responsive correction; the complete gate rechecks the final tree.

The first desktop run found an obsolete catalog-section click before opening an editor and a real first-visit cookie race on an unsubscribe route. Two simultaneous session requests each created a different anonymous cookie. Corrected the selector and portal-scoped in-flight coordination. Existing stale-response tests then required invalidating sharing on scoped session changes; those tests were retained. Failed logs remain recorded; no failed check was bypassed.

Component checks cover local drafts/recovery, protected child unmount, quote review and unknown-outcome read-back, directory/audit history and permission, queue return context, bounded reauthentication routes and session bootstrap/isolation/failure recovery. Final local pre-gate component run: 357 cases (347 tracked plus ten held experiments), 100% required route coverage; strict types, ESLint and root checks pass. Full-gate evidence will be recorded after execution.

## Independent design gate

**PASS — no remaining actionable findings in reviewed DI09 scope**, `/root/di09_design_review`, after three rounds. See [review record](reviews/2026-09-27-di09-admin.md).

Reviewed 1280×900, 768×1024, 320×800 and 320×450. Four findings addressed: missing queue context; missing sticky order context; missing directory role filter; same-tab verification draft loss. Follow-up corrected complete phone cards and horizontal visibility of the selected section. Long queue and focused quote/chat captures have no overflow; three focused axe checks are clean.

Round 1 used direct IAB rendered review. Later IAB/native access was unavailable, so the designer independently inspected reproducible Playwright captures and source. Automatic approval review rejected its synthetic “Issue quote” click. No bypass/retry; automated component and real-API integration/browser tests cover issuance, not a claimed designer click. Physical devices, assistive technology and owner acceptance remain later qualification limits.

Complete tracked hook, staged review, commit and remote verification remain required. This is not a stage-delivery or launch claim.


First complete DI09 hook stopped at govulncheck: `https://vuln.go.dev/index/modules.json.gz` returned HTTP 403. The official Google storage mirror returned the same status in an independent access check. Formatting, generated-code checks, vet, golangci-lint and standalone gosec had passed; the remaining full-gate checks are not claimed. No commit was created. Requested network restoration while continuing isolated DI10 preparation. Evidence: `/tmp/playora-di09-resource-gate.log`.


## Delivery receipt

Implementation `dee0d3e691602283af042fccf19965f412f98b28` passed the complete tracked hook on retry and was pushed directly to `origin/main`; the remote SHA matched. Both official vulnerability endpoints recovered, and live govulncheck passed. The unchanged full gate also passed golangci-lint, standalone gosec, dependency/generated checks, race units, TiDB integration (593.983s), 30 ordered SQL migrations, 357 local component cases (347 tracked plus ten held), 100% required route coverage, 106 desktop/mobile browser journeys, both frontend builds, container scans/smokes and isolated TLS/dependency/recovery deployment regressions. Evidence: `/tmp/playora-di09-resource-gate-2.log`. The first network-blocked attempt remains recorded above.

The independent scoped senior designer review is PASS. All 14 DI09-owned views are verified at this stage; DI14/DI15 still own integrated design-match qualification. DI10 resumes from its protected preparation checkpoint. R10/R11 and final launch remain held.
