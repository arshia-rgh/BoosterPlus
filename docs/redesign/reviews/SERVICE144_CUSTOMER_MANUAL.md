# Service144 independent customer and seller review

> Historical r11 observations follow. The senior reviewer adjudicated these findings and verified their fixes on later frozen candidates. All actionable findings from this report are closed; see [the final broad adjudication](SERVICE144_BROAD_ADJUDICATION.md). Original failure evidence and coverage limits below are preserved.

Date: 12 October 2026 (Asia/Tehran). Reviewer: `service144_customer_manual`. This is an independent rendered review of the frozen application; it is not a full-suite result or live acceptance.

## Source and isolation

- Frozen UI snapshot: `.cache/flow-review141/snapshots/service144-r11`; snapshot manifest SHA256 `a1b8e3eb1ab2c19aa649c416f4ecbfd636ace56e81695bae22ace815d59a9010`.
- Parent's full candidate manifest: `3213df383932993df3a44ec4cc86027dab77bfbe653746474086c80ab1903377` (156 files). The full run subsequently stopped in its early unit precheck; these observations do not change that result.
- Own synthetic runtime/dataset: `service144-customer-manual1`, customer origin `http://playora.localhost:65249`.
- Evidence directory: `.cache/flow-review141/evidence/service144-customer-manual1/`. Includes browser traces, screenshots, JSON observations, explicit fixture snapshots and request journal. Helpers are private `customer144-*.mjs` files. Shared datasets and application source were not edited.
- Chromium 1440×1000 and390×1000; WebKit390×1000 and320×1000; OS reduced motion, enlarged text200% on selected form/article/chat views; actual links, buttons, keyboard activation, native selects and file inputs. No external identity provider, email, message delivery, payment, publication or production mutation.

## Finding requiring senior decision

### C01 · P2 · Idle selected screenshot disables the explicit discard route

1. Open a draft seller submission's Account details on390px WebKit.
2. Select a valid JPEG in Account screenshot1, without clicking Upload image. The local preview appears; no upload request is active.
3. Follow Your account sales to leave the submission.
4. The Keep your submission drafts? guard correctly appears, but Discard drafts and leave is disabled. Stay on submission works. The user must stay, find the screenshot input again and remove the file before they can leave.

Expected: explicit discard should work for idle selected files/ordinary unsaved drafts. Keep it blocked for genuinely in-flight work or a write outcome that must be reconciled. This affects the new screenshot step and is more confusing after an upload validation error.

Evidence: `seller-cosmetics-media-r2-draft-guard-viewport.png`, the corresponding JSON/trace, and repeated `seller-cosmetics-media-r3` journey. Source observation: `submissions/images.tsx` sends `busy || pending` as the draft boundary's busy state; `media/attachment.tsx` reports pending as soon as a file is selected. No implementation edits were made by this reviewer.

Historical r11 status: **open for senior decision/recheck at that time**. The final adjudication linked above closes C01 after corrected rendering. Parent notified during review. The rest of the observations below do not close C01.

## Changed-flow observations

| Area | Observed behavior | Limits |
| --- | --- | --- |
| Customer passwordless entry | Code field receives focus, resend begins at120 seconds, remains disabled at119 seconds and enables at120; another request restarts the timer; documented invalid-verification response is understandable | Synthetic challenge only; real Google/email and successful session establishment not qualified |
| Linked custom choices | Server-first derives region; changing region clears incompatible server. Flexible hero keeps role ambiguous; mixed-role heroes disable the role; clearing conflicting heroes restores choice | Explicit test mappings; no assertion about the owner's live catalog mappings |
| Requested delivery hours | Reversed range error focuses maximum hours and remains readable at320px WebKit/200% text; no horizontal document overflow | Synthetic validation response; final quote/order creation not performed |
| Fixed offers | Fixed role/heroes/region are readable but not editable; customer only supplies server/player. Review retains fixedUSD25 price, explicit agreement consent and no-payment-yet explanation. Sold-out variant blocks continuation | No order/invoice creation or real inventory concurrency |
| Checkout recovery | Missing link shows automatic-checking guidance, offline state explains reconnect/refresh, recovered valid link is available after refresh/reload, expired link is removed | Provider navigation was not performed. This independently checks continuation/expiry, not every new-invoice redirect race |
| Seller skin collection | Restores category/count/names, adds groups with focus, quantity/name mismatch focuses exact quantity, removal restores a usable group focus | Synthetic server validation; no seller offer acceptance |
| Seller screenshots | Four-MiB-plus-one-byte input rejected by Upload image with exact4MB guidance; valid local preview works, second slot appears, local section switch retains selection, leaving record warns | No real upload/scanner/storage or screenshot message delivery. C01 remains open |
| Discovery | News/account/shop/fixed-offer image regions and text fit phone; desktop news shows three columns. Non-boost services do not display the custom action. Game hero persists during service selection | Account binary responses explicitly mocked to local JPEGs. Initial missing image fixtures are retained as fixture gaps, not application failures |
| News | Gallery shows images/captions/attribution and a readable missing-artwork fallback; stacks and wraps at390px/200% text | Existing local artwork and explicit failed image; no author publication/upload here |
| Customer protection | Privacy export requests a contextual email-verification dialog; focus remains inside it, Escape cancels and returns focus to its trigger on the same page | No verification email, successful export or deletion |

Selected screenshots personally inspected include linked-hours200% focus, customer order payment section, privacy dialog, recovered checkout, fixed-offer review, seller leave guard, news gallery200%, account tiles and desktop news grid. Recorded screenshots without an explicit inspected outcome are evidence for later review, not a claim that every pixel of every page was evaluated.

## Existing journey coverage and gaps

Read `FLOWS.md` and `journey-evidence.json`. This table maps all31 journey IDs without claiming end-to-end coverage of all of them.

| Journeys | Independent coverage | Unexecuted branches |
| --- | --- | --- |
| F01 | Game→boost→custom chooser/form; relationships, error focus, requested hours; existing submitted order and local sections | Request submission, quote acceptance, full fulfillment/completion |
| F02 | Fixed package→delivery details→review; sold-out variant | Create order, coupon conflict, real checkout |
| F03 | Account discovery/detail and protected-delivery section read | Reservation conflict, actual secure secret reveal/acknowledgement |
| F04 | Missing hosted link, offline/reconnect, refreshed continuation, expiry | Funds exceptions, new-invoice automatic redirect, settlement/reconciliation |
| F05 | Existing help/case/refund information rendered | New case, appeal, cancellation/refund mutations |
| F06–F07 | Seller draft fields/skin groups/screenshots, local navigation, leave guard, agreement/payout information | Commercial acceptance, buy-first ownership transfer, seller funds |
| F08 | Customer login/resend/invalid-code recovery | Successful email/Google callback and saved-draft return |
| F09 | Admin reviewer owns this journey | Not independently checked here |
| F10 | Customer profile/security/sessions/recovery sections; privacy verification cancellation | Identity link/unlink, factor enrollment/revocation, successful sensitive mutation |
| F11 | Rendered customer thread, unsent draft retained across offline refresh/reconnect, readable composer at390px/200% text | External message send/delivery and staff-side handoff |
| F12–F13 | Order progress/session information and account/shop delivery sections | Booster/admin transitions; booking/rescheduling mutations |
| F14–F17 | Admin/booster reviewers own these journeys; customer-facing outputs above | No staff administration or financial operations here |
| F18 | Favorites list and availability information rendered | Add/remove favorite, reorder or stale/current-catalog conflict |
| F19 | Reviews list rendered | Submit/edit/withdraw review or staff moderation |
| F20 | Activity and alert list rendered | Preference writes, actual notification delivery |
| F21 | Retention hold/deletion-disabled wording, export verification dialog/cancel | Export content/download, deletion execution |
| F22–F24 | Staff reviewer scope | Not checked here |
| F25 | Unknown route404 with recovery destinations, offline checkout/chat, retained order context | Full offline/service outage/session-expiry matrix |
| F26–F30 | WoW/LoL/Valorant/Dota2/Wild Rift game landing/service navigation surfaces render at390px | Each game-specific form/order flow requires dedicated configured fixtures |
| F31 | Booster reviewer owns entry/MFA/eligibility | Not duplicated here |

Addenda: shop list plus completed shop delivery/help; public news gallery and failure fallback; seller/private media input; independent customer security navigation. Customer, admin and booster host isolation is not inferred from customer-only mocks.

## Chat follow-up

`customer-chat-r3` passed the bounded rendered checks: initial customer/support messages displayed; unsent text retained while offline; refresh recovered messages without discarding the draft; composer and send control fit at390px/200% text. The stream endpoint intentionally returns503, so polling recovery is shown truthfully. No Send message action was performed. The two earlier interruptions were explicit fixture issues (inconsistent latest sequence and a read receipt returning an object instead of the required null), preserved in the evidence. The final composer screenshot was personally inspected.

## Failures, warnings and fixture limits

- Initial exploratory interruptions included guessed routes/selectors, a synthetic ordered-rule missing required contract fields, and `invalid_code` instead of the application's documented `invalid_verification`. Corrected own fixtures/selectors and reran relevant views; preserved original traces/logs. These are not product findings.
- The first seller script incorrectly expected a leave guard for a same-record section switch. Actual behavior retains the selected file correctly. The corrected journey verifies retention, then leaves the record and reproduces C01.
- Initial account image endpoints and unfiltered conversation/read endpoints were missing explicit fixtures and returned501. Image fixtures were supplied locally for the later discovery round. These initial branches cannot be marked successful backend flows.
- One broad mobile-navigation run emitted `ResizeObserver loop completed with undelivered notifications.` with no observed layout loss or horizontal overflow. A bounded repeat with route-attributed page-error capture (`panel-r3-webkit-390`) completed all20 recorded surfaces without reproducing the warning or showing a page error. The first warning remains evidence; no product defect or fix is claimed from a non-reproduction. Other completed changed-flow runs reported no page errors.
- These fixtures do not prove backend ownership/security enforcement, durable uploads, real provider/email behavior, mobile hardware keyboards, screen-reader behavior, touch behavior on physical devices, or all combinations of live catalog content. The actual full gate and owner acceptance remain separate.

## Reviewer disposition

One actionable new UX finding, C01, requires senior decision and a rendered recheck. No other confirmed application issue was found in the bounded scenarios above. This does not certify unexecuted journeys, backend enforcement, the interrupted full gate or production readiness.
