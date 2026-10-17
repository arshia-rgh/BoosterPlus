# UX165 — Customer 5: support and account management

16 October 2026. Independent fifth customer agent. **First wave complete; staff-form response, broader transaction continuations and changed-source verification pending.** This is an agent task review, not a human research study or a production acceptance certificate.

## Environment and evidence

Used the actual isolated API/database and built customer UI at `http://playora.localhost:4173`, Chromium at 1440×1000 and 390×844, with the independent `desktop_supportbuyer` synthetic identity. Signed in through the normal email/consent/code interface; codes came only from local Mailpit. Later visits reused the synthetic browser session. External browser traffic was blocked. No production account, email, invoice, transfer or publication was used.

Private evidence: `.cache/ux165/customer5/phase1.json` through `phase6.json`, corresponding screenshots/scripts and engineering trace directories `customer5-phase1`, `customer5-phase2b`, `customer5-phase3`, `customer5-phase4`, `customer5-phase5`, `customer5-phase6`. These are **real local backend attempts**, not success-response UI mocks. The support conversation and seller draft IDs are retained in private `conversation.json` and `seller.json`; do not treat their synthetic existence as production activity.

One first-run script used the wrong observed-field label (`Subject` instead of `Conversation subject`); its timeout was a harness error, not an application failure. The corrected attempt completed. An immediate navigation after a favorite click did not await completion, so that observation is deliberately inconclusive and needs a deliberate retry. Download acceptance is disabled by the review browser: profile export returned an application success/audit receipt, but disk download integrity was not yet qualified.

## Confirmed finding

**C5-01 — P2, recovery page gives no next step to a customer without MFA.**

- Task: find backup/recovery protection for a returning customer who has never enrolled an authenticator.
- Route/state: `/account/recovery`, signed-in customer, no authenticator enrolled; desktop and 390px.
- Observed: page explains replacing a one-time authenticator check and says fresh verification can happen when replacing codes. It offers no codes, no explanation that none exist yet, and no setup action. Opening “Lost your authenticator and recovery codes?” continues discussing removing a second factor that this account never configured.
- Expected: explain the unenrolled state and link directly to customer Security → authenticator setup; preserve enrolled customer/staff recovery protections.
- Evidence: `-account-recovery.png`, `customer-no-mfa-recovery.png`, phase1/phase3 JSON.
- Root accepted and implemented conditional copy plus portal-local setup link in source. **Not yet re-reviewed in the running build by C5.** Do not close as rendered verified yet.

## Independent task feedback

The main customer account destinations and the selected record context remain visible, including mobile navigation. Support's “To: Customer and PLAYORA support” label makes audience clear. The message composer explicitly warns that drafts clear on exit and that credentials belong in protected fields; do not mistake intentional draft clearing for an undisclosed persistence guarantee. Sending a real local message produced a visible “Message sent” confirmation and returned focus to the composer.

Profile and notification preferences saved with explicit success notices. The privacy page truthfully reports deletion disabled. Its category export returned a category-complete result and an audit reference; no deletion request was fabricated. The privacy page is dense, but density alone is not classified as a defect without a task failure.

The realistic custom boost form showed required-field errors and focused the first invalid rank selection. Choosing Philippines first matched its region; choosing Gold Lane limited the available heroes. The local estimate displayed USD17.50 and clearly distinguished it from the later staff quote. Fixed package contents are read-only scope; the selected package still requests applicable recipient region/server information. No customization defect was inferred from those legitimate details.

Every recorded desktop/390px page had no document-wide horizontal overflow. This does not certify all content states or physical devices. Shop was unavailable in the reviewed synthetic game at this time; that is a fixture/business-state limit, not a broken purchase claim. The news guide was published by the admin actor and read inside the retained game shell.

## C01–C20 attempt ledger

“Partial” means the named steps were observed, while the listed branches remain pending. No family below is represented as every possible permutation passing.

| Family | First-wave status | Observed steps and remaining limits |
| --- | --- | --- |
| C01 Discovery | Partial | Rendered homepage, game directory, rich MLBB hub, boost selector, unavailable shop, accounts/news/review children; persistent hero and return controls observed. Explorer keyboard/all five transitions and320px pressure remain. |
| C02 Sign-in | Partial | Normal customer email+consent+local-code sign-in returned to Account; reuse worked. Wrong/expired/resend/Google/error and separate-host denial remain. |
| C03 Recovery/security | Issue found; partial | Viewed security, sessions, unenrolled recovery, expanded lost-authenticator guidance. C5-01 reported. Enrollment/code replacement/session revocation/login-recovery modal branches remain. |
| C04 Custom boost | Partial | Blank validation/focus, rank/stars, server-first region mapping, lane-filtered heroes, delivery bounds entry, valid estimate17.50. Hero-first/multiple lanes, allWR modes, stale failures and order submission remain. |
| C05 Fixed package | Partial | Opened published package_1 with fixed scope/USD50, recipient context and continue action. Purchase/terms/races remain. Invalid package URL produced an explicit unavailable state. |
| C06 Quote | Not reached | No custom order created in this first wave; pending own/shared order continuation. |
| C07 Checkout | Not reached | No invoice created by C5. Provider and return branches pending; real provider outside review. |
| C08 Order workspace | Partial | Own order list empty state; unknown order denied without private details. A populated order's local sections/progress remain. |
| C09 Support/forms | Partial; awaiting admin | Created pre-sales thread through mobile UI, checked empty subject inline validation, sent synthetic question, confirmed send+composer focus. Staff reply and ordinary/protected form requested. Attachment/failure/retry/form branches remain. |
| C10 Cases/refunds | Not reached | No eligible paid customer order yet. |
| C11 Seller intake | Partial | Chose published game, entered private title, created persisted private draft, viewed dynamic account details/photos/permission form. Full intake/skin/uploads/submission/retry remain. |
| C12 Seller proposal | Not reached | Private draft has not been submitted; accepted commercial flow belongs to later continuation. |
| C13 Payout progress | Not reached | No accepted/sold agreement for C5. Owner-only manual mode remains unchanged. |
| C14 Marketplace | Partial | Global/game accounts empty results, filters, buyer/seller paths; no actual listing yet. Purchase/race/fee detail awaits C3/admin publication. |
| C15 Protected delivery | Not reached | No paid account purchase; no credential exposure claim. |
| C16 Shop | Blocked by fixture availability | Game explains shop unavailable and existing purchases remain in Account. Asked admin actor for synthetic manual item; normal published-item purchase branches pending. |
| C17 News | Partial | Published guide list/type controls and article with cover/attribution inside game shell. Search/filter/empty/deleted branches remain. |
| C18 Favorites/alerts/activity | Partial | Empty favorites/alerts/activity states, account email preferences saved/reloaded. Favorite click result inconclusive because harness navigated before completion. Invalid unsubscribe link explained. Filled notifications and subscriptions remain. |
| C19 Reviews | Partial | Own empty reviews explain completed-paid eligibility; game public review empty state read. No completed eligible order, moderation/edit branches pending. |
| C20 Account/privacy/contact | Partial | Profile saved and reloaded; preferences saved/reloaded; privacy export response, disabled deletion, contact, terms, unavailable policy and How it works. Export file integrity, profile invalid cases, sign-out and fully signed-out contact remain. |

## Shared branches observed and pending

- X01: independent direct entries/reloads across account and game children; invalid object return controls. Back/Forward draft restoration not yet complete.
- X02: empty/populated support, empty orders/sales/favorites/reviews/activity; unavailable package/shop/policy/unknownorder. Deliberate latency/stale-state injection not yet done.
- X03: empty support subject and custom required selection errors; custom error focused the first invalid select with `aria-invalid=true`. Boundary/server422 branches pending.
- X04/X06: normal support/profile/preferences mutations succeeded; offline, unknown outcome, duplicates and retry not yet sampled.
- X05: independent customer identity, unknown record denied. Known-other-customer object and staff-origin denial pending.
- X07: no modal exception qualification yet.
- X08: desktop1440 and390px observed; no page overflow.320px/short/zoom/WebKit pending.
- X09: labels/invalid focus/composer focus observed. Complete keyboard/axe/screen-reader qualification not claimed.
- X10: clear record context and estimate/final-price wording; C5-01 is concrete missing next action.
- X11: screenshot/cover rendering observed; upload/scanner/crop variants pending.
- X12: no bypass, production change, financial transfer or disabled-feature enabling. Normal synthetic backend guards remain in effect.

## Next continuation

1. Receive/respond to admin reply/form in the retained synthetic support conversation; validate ordinary/protected fields, recipient handling, failed/retry state and mobile keyboard.
2. Verify C5-01 in changed build and perform optional MFA enrollment/recovery/security actions with private synthetic codes, then sign-out/session isolation.
3. Continue supported shop/account/boost order states, payment fixtures and remaining family branches; explicitly retain untested external-provider/physical-device limits.
