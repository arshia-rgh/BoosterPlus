# Portal 137 independent senior UI/UX review

Date: 8 October 2026
Reviewer: `/root/portal_visual_review`, independent senior UI/UX review agent
Round: 1
Base commit: `23c70774594c488bc6fe1dfe166f06291d81bfb1`
Review target: current uncommitted staff-host implementation relative to that base.

## Scope and acceptance criteria

Reviewed the changed navigation/context behavior for administration on `admin.playoragames.com` and the semantic booster workspace on `pro.playoragames.com`: clean root/login/record URLs, persistent role and record identity, local section navigation, public-site exits, verification/task returns and unknown-route recovery. Read `AGENTS.md` and `docs/redesign/DESIGN_CHANGE_GATE.md`. This is a scoped review of the subdomain change, not a new review of the complete redesign.

## Rendered evidence inspected

Used `view_image` to inspect all 16 images below. The actual built SSR frontend was exercised against a read-only synthetic backend on distinct loopback hosts; no production private data is represented. Browser viewport sizes were 1440 × 1000 and 390 × 844; screenshots are full-page captures. Browser contexts requested reduced motion.

For each engine directory `frontend/.cache/portal-browser/chromium/` and `frontend/.cache/portal-browser/webkit/`, inspected:

- `desktop-admin-login.png`
- `mobile-admin-login.png`
- `desktop-admin-order.png`
- `mobile-admin-order.png`
- `desktop-booster-login.png`
- `mobile-booster-login.png`
- `desktop-booster-order.png`
- `mobile-booster-order.png`

Inspected both engine `result.json` files and the browser runner source. Both record `passed: true`, cover desktop/mobile and admin/booster, and explicitly state `synthetic: true` and `realBackendAuthenticationQualified: false`. Chromium recorded 76 fixture requests; WebKit recorded 75. Also opened each engine's desktop/mobile trace archive as structured trace data, confirming exact browser/viewport metadata and zero error-bearing trace events. I did not replay these archives through the visual Trace Viewer.

The runner checks clean roots and record URLs, native admin order search, active local record links, retained unsaved quote/progress drafts after section changes, back history, record refresh, unknown-route workspace return, explicit storefront terms/exit links, safe legacy list bookmarks, loaded assets and no horizontal page overflow. This is corroborating functional evidence produced by the implementation runner, separately inspected here; I did not rerun it in this review.

## Source examined

- `frontend/app/portal-router.tsx`
- `frontend/app/portal/routing.ts`
- `frontend/app/portal/routing.server.ts`
- `frontend/app/portal/router.test.tsx`
- `frontend/admin-app/root.tsx` and `frontend/admin-app/routes.ts`
- `frontend/booster-app/root.tsx` and `frontend/booster-app/routes.ts`
- `frontend/app/root.tsx`
- `frontend/app/routes/not-found.tsx`
- `frontend/app/account/return-path.tsx`
- Changed portions of `frontend/app/account/navigation.tsx`, `frontend/app/account/route-focus.tsx`, `frontend/app/identity/identity.tsx`, and `frontend/app/identity/portal.ts`
- `frontend/app/admin/shell.tsx`
- `frontend/app/ui/record-shell.tsx`, `frontend/app/ui/error-page.tsx`, and `frontend/app/ui/site-chrome.tsx`
- Changed public policy/how-it-works link portions in `frontend/app/site/`
- `frontend/portal-hosts.mjs` and changed host/handler portions of `frontend/server.mjs`
- `frontend/tests/portals/browser.test.mjs` and `frontend/tests/portals/README.md`

## Findings and assessment

No actionable scoped findings.

The rendered sign-in pages identify the intended staff role and communicate email/Google followed by authenticator verification. Public terms and storefront exits are explicit destinations. Both order views preserve workspace identity, record reference/status, a named list return, and a distinct active record section. The narrow admin section strip centers its selected item with horizontal local navigation, while booster links wrap within their section navigation; neither screenshot shows a page-width overflow or a loss of record context. Retained draft text is visible in the two portal form states in both engines. WebKit also visibly retains a focus outline around the newly selected record content; the shared source preserves focus movement and native anchor behavior.

The routing provider supplies canonical semantic paths to existing workspace logic while emitting clean host-local URLs. Same-workspace links retain client navigation, state and section query handling. Public and cross-workspace destinations use explicit configured origins. Existing verification/task return handling retains the staff context, including the admin instruction to verify in a new tab. Explicit unmatched-route handling retains the provider context, with the browser evidence checking the correct workspace recovery link.

## Verdict and limits

**PASS — no remaining actionable findings in this scope.**

No fixes or follow-up review round are required for the reviewed scope. This means no issue was found in these changed interactions; it is not a guarantee that no undiscovered issue exists.

Limits: this review does not qualify real Google/OAuth callbacks, email delivery, authenticator/recovery-code sign-in, backend authorization, actual owner/staff sessions, live financial actions, or deployment. No native devices, screen reader, tablet viewport, or atlas Phone/Tablet mode were reviewed. There is no changed responsive styling or atlas design in this bounded host-routing change; representative built desktop and genuinely narrow browser renderings were inspected. Keyboard behavior was assessed from the retained focus/link source and rendered focus state, not a fresh full keyboard-only traversal. Unrelated layout, content, loading/error states and wider site flows remain outside this scoped verdict. Normal cross-layer repository qualification and live owner-led acceptance remain separate.

## Evidence hashes

The hashes below bind the exact supplied result/trace/image evidence inspected by this reviewer.

```text
bfe462b4bdf80f9011d6a24004414dfd33493d92a9d0c8f57f730b1ee88586f2  frontend/.cache/portal-browser/chromium/desktop-admin-login.png
764d7cf42c3724301f144b8efda121338411c9a7d30244b3361b8af5083bdc94  frontend/.cache/portal-browser/chromium/desktop-admin-order.png
07836ad5edfb5372a05b4b27593050ea9d9c1d7d2e8db8f2bfed8ee13b7facba  frontend/.cache/portal-browser/chromium/desktop-booster-login.png
186a22305445df3f2e7c1fc6cc455ae4af462268ae9c566b8b0563e3759dcce0  frontend/.cache/portal-browser/chromium/desktop-booster-order.png
6cdd0f6500db345edbe32568c34bffc4b8cbc50cb95f469d1ea3a4b74ba35cb9  frontend/.cache/portal-browser/chromium/mobile-admin-login.png
97ab3a227bdb39956aa4ae206f4a92b1c0844ac75972feae06921dc161888499  frontend/.cache/portal-browser/chromium/mobile-admin-order.png
21f73deb8a1252cc85f6ca7a9d5fb616bd06438a8934decfa22901d275c1054e  frontend/.cache/portal-browser/chromium/mobile-booster-login.png
bd0211c9b389be3e160fe6c3233b72dd62deea9c9bbe8f7d21bfa2b0fc92446b  frontend/.cache/portal-browser/chromium/mobile-booster-order.png
96f41d702a30a7d7b07cbea4b03be9416b9d1f863225c62768fcfe3c2b896752  frontend/.cache/portal-browser/chromium/result.json
0bc7831e63ace114677e486f36c609c57254a0295cb5d45fe97f2cfa237d3db6  frontend/.cache/portal-browser/chromium/desktop-trace.zip
0e80507b01fa013c4ac8a87b01338f9b13c66935b8860fda8f627e0011b2d493  frontend/.cache/portal-browser/chromium/mobile-trace.zip
62a5044dd51f668c6892238d93969ac537a455a752b3eb13bd33afb9ba8af31b  frontend/.cache/portal-browser/webkit/desktop-admin-login.png
7458a0faa12f9d2caafdb389531dd957d789eb619db7b7f05fc1210d77ca7dd9  frontend/.cache/portal-browser/webkit/desktop-admin-order.png
c4c9a5348867024d22b3b3bf97e8922ef643dc1d38cf2a626e0a2e7fbbcb80b1  frontend/.cache/portal-browser/webkit/desktop-booster-login.png
37566c4513fdd5bf6eef2a143a8366f9bab981108c72e2e8c9608d958f598ebf  frontend/.cache/portal-browser/webkit/desktop-booster-order.png
adc12b1db2b4142c397ebda5dc480f4670f6be08129808ffe7a2cf269522cb32  frontend/.cache/portal-browser/webkit/mobile-admin-login.png
f7e045aeb4b9cb472eb93d7a2a42791aa95dcf41ce449f2e9bcaa95edf2f0c74  frontend/.cache/portal-browser/webkit/mobile-admin-order.png
51b01549c7a2b3e2bf2bd3b33d14fa1ec9e8eda59c24b3669f6fd479e7978ad8  frontend/.cache/portal-browser/webkit/mobile-booster-login.png
8973aaae8011010b64ec7abe7d88a743f6b4b700665393352ee1a9a9f4d044d8  frontend/.cache/portal-browser/webkit/mobile-booster-order.png
793622ebb2218a3068254b5e6a10730ea8d4f995a47bd9e4e06062907154434c  frontend/.cache/portal-browser/webkit/result.json
6e7db7284169b26c9689c3e8afb71e534d0598ffb9f547783959a49cc6654f71  frontend/.cache/portal-browser/webkit/desktop-trace.zip
ab4655b514de36218950c36fb0f298b4d891e3d407c2154fd0551028aa5eae58  frontend/.cache/portal-browser/webkit/mobile-trace.zip
```


## Earlier review/fix rounds

The deployment reviewer first identified a possible unmatched-route loss of role
context. The actual browser runner reproduced it; explicit catch-all routes now
keep trusted root-loader data and role-correct recovery navigation. A native admin
search form retaining `/admin/orders` was also corrected and exercised. The final
independent senior review above examined the corrected builds.

The separate security review corrected legal-version startup headers and
encoded/dot-segment legacy aliases. New server tests cover these regressions.
Full backend/database/deployment qualification remains independent of this UI
review, as described in [the portal delivery record](../../portal-subdomains-2026-10-08.md).
