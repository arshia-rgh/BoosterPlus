# UI136 scoped senior design review

Owner request: remove public statistics calculation disclosures and visible motion options across the site. Preserve automatic device reduced motion, truthful unavailable/stale values, reporting context, navigation and the green theme. Base: `2ec72e62837dbdbaea970c57403c3b21e43e1bd8`.

Changed scope: public metrics shared by homepage/game hubs; shared customer/admin/booster footer; Surface motion controls; account display section; the retired character showcase's pause control and shared device-motion hook. The old manual preference is intentionally ignored once its controls are removed. No backend calculation or business rule changes.

Reviewer: `/root/stats_motion_review`, acting as senior UI/UX designer. Implementation and evidence capture were performed by the primary agent, not the reviewer.

## Review rounds and evidence

Native browser review initially blocked: no Chrome/IAB surface was available to the reviewer and selecting Firefox stalled. The primary agent interrupted the stalled turn and supplied rendered evidence from an isolated headless Chromium session. This tool failure is not an application defect or a passed browser review.

Final round reviewed current shared React components from the localhost-only synthetic fixture at `http://127.0.0.1:5176/.cache/ui136/index.html`, with customer/admin/booster role variants. Captures cover each role at 1440×900, 768×900 and 360×900, plus a keyboard-focus screenshot. The review includes all nine rendered combinations, implementation diff and the capture script/evidence. No production data or private session was used.

Private local evidence: `frontend/.cache/ui136/{customer,admin,booster}-{1440,768,360}.png`, `keyboard-focus.png`, `render.mjs` and `render-evidence.json`. Browser assertions confirmed absence of the removed controls, no horizontal page overflow, live device reduced/full state changes and visible anchor focus. These are supplemental scoped checks; the normal frontend gate remains independently required.

The reviewer found reporting dates/UTC and unavailable values readable, the two-column footer balanced with clean narrow stacking, accurate account section labeling, and no removal-related orphan controls or spacing. The synthetic fixture heading and unchanged Surface minimum height were excluded from product findings. No implementation fixes were requested.

**Final verdict: PASS — no remaining actionable findings in this scope.**

## Limits

The reviewer inspected rendered captures and browser evidence rather than directly controlling a browser. This does not establish real authenticated-flow, physical-device or assistive-technology acceptance. No production deployment is implied. Full route browser/container checks are recorded separately in `docs/progress.md`; do not claim missing checks passed.

## Completed automated qualification

Normal tracked frontend commit gate round2 passed and created `18f1064dfdbec17141250022fe201ef75eac3eff`, tree `f038dccf3e60fd9600ff0d64c9fafaf3fb2a77c3`, parent `2ec72e62837dbdbaea970c57403c3b21e43e1bd8`. All25 source files were SHA256-verified before importing the hook-created commit locally. The added order/legacy-character test corrections change only how device reduction is selected, with the existing motion assertions retained; no subsequent visual implementation changed after the senior review.

Passed: root repository/security/contracts/workflow checks; frontend formatting/type/lint/live dependency audit; 139 shipped unit files/461 tests; both production builds and budgets; nine server/proxy checks; all154 desktop/mobile browser cases; both image scans and non-root/read-only container smoke. Browser totals were38+37+2 per device. Unchanged full backend/production suites were not repeated under the established UI-only policy.

Private server evidence: `/srv/playora-qualification/ui136/round2/{gate.log,gate-state.json,source-manifest.json,manifest.json,qualified.bundle}`.

- Gate log SHA256: `34477d32977afcd75196140f00a9b21beaaa3343168e6d74d40a77093434e9ee`.
- Source manifest SHA256: `cea9e70fd222e8b78a3f5c249e8e22bcda59ef025076d1eb0410bc0a0b6c578d`.
- Commit bundle SHA256: `47e0b76ba53b6243d5890343d2b014cd7d86f1be009edac43a60c4bebe5330d3`.

Round1 remains a failure: the order journey clicked the intentionally removed Reduced button and reached its150-second deadline. Its trace identified that exact obsolete locator. The failed attempt was stopped, its own test services cleaned up and evidence retained under `ui136/failed1-test-results`, `gate.log` and `interruption1.json`. Round2 restarted the complete normal frontend gate with corrected device-preference emulation; no retry bypass, timeout increase or reduced threshold was used.

Deployment is separate. The current live release remains signed6ae48bf at schema40, with checkout enabled and outgoing transfers disabled. Off-host recovery is still absent and the previous exact-release backup-deferral approval is consumed. This UI verification does not create a fresh deployment exception, authorize external messages or qualify a real financial transaction.
