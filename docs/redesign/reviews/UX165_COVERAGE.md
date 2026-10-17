# UX165 — current product and multi-role journey coverage

16 October 2026 · Senior product manager inventory · Baseline `95f094a` (deployed application `20fe17e`) · **Plan/inventory, not a test-pass receipt.**

**Current status — 18 October 2026: broader exploration paused by the owner.** Use [UX165_PAUSED_CHECKPOINT.md](UX165_PAUSED_CHECKPOINT.md) for the reconciled checked/not-checked record. The owner requested fixing and deploying findings already discovered; the incomplete family/branch rows below are a future-resumption inventory, not a requirement to continue exploring now. Only focused fix verification and scoped senior design review continue. Historical worksheets and earlier “execute next” instructions remain as evidence, superseded by this stop decision; no incomplete row is marked passed.

The owner requested five independent customer testers, one administrator/owner tester, one booster tester, and product/design/research/engineering review of their findings. Every customer tester must cover every customer family below; emphasis assignments add depth rather than remove shared coverage. Synthetic users transact with one another in an isolated environment. Production may be inspected read-only, but real customers, messages, invoices, payments, payouts, publication and policy changes are outside this review's execution boundary.

This is a finite inventory of known routes, state transitions and recovery classes. “All flows” means every listed family and meaningful branch, with explicit evidence or an explicit untested limitation. It does not mean every possible text value, timing permutation, browser/device or future catalog configuration.

## Current scope and baseline

The current three route manifests declare **98 route entries: 83 canonical user-facing destination templates, one XML sitemap, 11 legacy staff aliases in the storefront manifest, and three fallback declarations**. Optional `admin?` and `booster?` prefixes are compatibility aliases of their independent portal routes, not shared identities. Canonical public hosts remain `playoragames.com`, `admin.playoragames.com`, and `pro.playoragames.com`.

The historical `COVERAGE.md` lists 55 routes / 115 views / 31 journeys / 573 named states. Keep it as design history; it is not a current runtime coverage total. Current additions include portal-local security/session/recovery, chat forms, news/shop authoring, manual payout records and newer seller/publication behavior. The route inventory below is derived from `frontend/app/routes.ts`, `frontend/admin-app/routes.ts`, and `frontend/booster-app/routes.ts`; a machine-readable receipt with source hashes is at `.cache/ux165/product/route-inventory.json`.

Current commercial/security rules are acceptance constraints, not proposed changes:

- Independent customer, admin and booster identities, including the same email in different portals. Staff sign-in requires email/Google plus an authenticator. A sensitive action can require one recent factor in its contextual modal; never silently bypass verification.
- Custom estimates are provisional; staff issues a quote for explicit acceptance. Fixed packages are predefined. Verified payment precedes fulfillment. Provider navigation/return is not evidence of payment.
- Account base price, buyer 5% commission, seller 10% deduction, fixed crypto quote, consignment versus buy-first, accepted historical agreements, dispute holds and owner-only manual payout controls remain intact.
- Consignment publication does not require credentials. Admin-requested chat forms collect ordinary and protected answers. Purpose, recipient and assigned-booster sharing control access.
- Manual shop fulfillment and staff-managed news remain the shipped product. Supplier integration, guaranteed instant delivery, wallets and automatic booster compensation are excluded.
- Checkout is enabled; automatic outgoing transfers and customer deletion remain disabled. Disabled-state explanations and valid next actions must be reviewed, not enabled to make a test succeed.
- Preserve the green/champagne theme and accepted login scene. No new motion-control button. Device reduced-motion settings still apply.

## Test team and handoff story

| Persona | Every tester's shared obligations | Deep emphasis | Required interaction |
| --- | --- | --- | --- |
| C1 — custom-boost customer | C01–C20 plus X01–X12 where applicable | Rank/WR/delivery/hero/role dependencies, live estimate, quote revision, paid progress | Creates custom order; administrator quotes; booster performs work; customer reviews proof and completes/reports a problem |
| C2 — fixed-package/shop customer | C01–C20 plus X01–X12 | Fixed terms, shop variants/recipient fields, unavailable stock, hosted checkout recovery | Buys fixed boost and manual shop item; follows staff fulfillment and exception path |
| C3 — account seller | C01–C20 plus X01–X12 | Intake/photos/skin detail, seller terms, revisions, withdrawal, payout progress | Submits an account; administrator approves/offers/publishes; accepts exact terms; C4 buys; sees eligible/manual payout receipt |
| C4 — account buyer | C01–C20 plus X01–X12 | Listing trust/terms, price breakdown, reserve race, secure delivery, inspection/dispute | Buys C3's synthetic listing; receives protected access form in chat; accepts delivery or raises a synthetic case |
| C5 — returning/support customer | C01–C20 plus X01–X12 | Mobile/keyboard, first-time confusion, recovery, retry, notifications, accessibility | Opens presales and order support; resumes drafts after sign-in/connection loss; checks no access to C1–C4 private records |
| A1 — administrator and owner | A01–A21 plus X01–X12 | Staff queues, configuration, quote/seller offers, publication, finance, exact owner boundary | Supports all five customers and B1; switches to separate synthetic administrator and owner identities for permission checks |
| B1 — invited booster | B01–B09 plus X01–X12 | Assigned work, secure access, progress/proof, scheduling, reassignment | Fulfills C1/C2 paid synthetic jobs; cannot see seller commercial terms, owner finance or unassigned credentials |

Seven role testers should remain independently identifiable even if the concurrency limit requires batches. Product, designer, researcher and engineer review the same finding log. One finding has one owner and one resolution; duplicate observations add evidence. Testers must record what they understood before reading internal implementation notes, then record exact route, viewport, steps, expected outcome, actual outcome and screenshot/trace. Distinguish a software defect, a product ambiguity, a cosmetic issue, a fixture limitation and an optional idea.

The cross-role story must be recorded as one linked synthetic scenario, with per-actor object IDs retained privately. Merely creating each actor's screens from unrelated fixtures is not evidence of a complete customer→staff→booster or seller→buyer handoff. Do not publish credentials or private synthetic challenge values in the report.

## Customer families — each of C1, C2, C3, C4 and C5

| ID | Journey and required checkpoints | Important alternate branches / completion criteria | Existing test source to reuse as a checklist, not a current pass |
| --- | --- | --- | --- |
| C01 | Home → service explorer → choose game → game hub → selected service → return | Keyboard/previous/next; five sections; other game disabled/unpublished; featured offer; game hero preserved; back/refresh/deep link | `home.spec.ts`, `game-shell.spec.ts`, `game-configuration.spec.ts`, `loading.spec.ts` |
| C02 | Google/email signup or return sign-in → original intended page | Consent; missing/invalid email; no code/wrong/expired code; resend before/after 120 seconds; Google cancel/error; changed email; session expiry; independent staff identity; no lost draft | `identity.spec.ts`, `identity-fixtures.ts`, `tests/portals/browser.test.mjs` |
| C03 | Lost email modal → recovery request/code/review state; settings → sessions/recovery | Close/Escape/focus return without expanding login card; preserve modal draft; expired code; blocked/pending review; optional customer MFA/recovery codes; current session revocation; no staff bypass | `identity/email-recovery-dialog.test.tsx`, `identity/portal-flow.test.tsx`, `action-verification.spec.ts` |
| C04 | Custom boost configuration → live estimate → submit request | Current/target rank validity; WR no preference/range/below/above/exactly100; one/multiple hero-role rules both input orders; region/server both input orders; delivery-hour range; missing dependent fields; stale estimate/rate error; minimum/final quote caveat; coupon terms; unauthorized/expired draft | `mlbb-catalog.spec.ts`, `catalog-refinement.spec.ts`, `live-estimate.spec.ts`, `orders.spec.ts` |
| C05 | Fixed package discovery → detail → select declared variant if any → accept fixed terms → create order | No accidental custom form; sold out/limited time/count/discount expiry; deleted or changed package; consent; immutable selected terms; order creation duplicate/back/retry | `orders.spec.ts`, `catalog.spec.ts`, `shop-promotion.spec.ts` |
| C06 | Custom order overview → staff quote → accept/reject/request clarification | Original estimate distinct from final quote; revised/expired quote; stale version; hold/cancel; unreviewed request cannot pay; immutable accepted quote; next actor/action visible | `orders.spec.ts`, `order-workspace-journey.ts`, `orders/customer-workspace.test.tsx` |
| C07 | Payment section → exact asset/network/amount → hosted checkout → return/reconcile | New/reused invoice, double-click/network timeout, provider unavailable, below minimum, pause, expiry, cancelled/partial/overpaid/confirming/finished, wrong asset/network, return URL with no verified payment; no duplicate purchase | `payments.spec.ts`, `hosted-checkout.ts`, `payments/checkout-lifecycle.test.tsx` |
| C08 | Order list/filter → persistent overview/messages/progress/payment/help → completed job | Paid→assigned→running→hold/resume→proof review→completed; order ID/status/next action always retained; user can find original preferences and accepted agreement; refresh/Back restore context; preorder cannot expose delivery | `order-workspace-journey.ts`, `fulfillment.spec.ts`, `mobile-panels.spec.ts` |
| C09 | Presales support and order support → reply/attachments → secure form | Distinct thread/order context; sent/pending/failed/deduped message; connection/poll failure; read/unread/history; no private internal note; form required/malformed/ordinary/protected fields; response sent once; recipient restriction; mobile keyboard and scrolling | `support.spec.ts`, `chat-form-journey.ts`, `support/forms/forms.test.tsx` |
| C10 | Cancel or report service problem → case → decision/appeal/refund progress | Before/after payment; active case/duplicate; deadlines, holds and accepted terms; customer explanation; staff-rejected/approved/appealed/closed; refund proposed/recorded/failed; no promise of automatic payment or premature success | `payments.spec.ts`, `payments/cases.test.tsx`, `payments/refunds.test.tsx` |
| C11 | Sell an account → game/intake → details/skins/photos → save/submit | Required fields and inline jump; game/region/server dependency; 4MiB boundary/wrong format/rejected scanner/network retry; upload only versus submitted draft; declarations; edit/return/draft restoration; prevent duplicate submission | `submissions.spec.ts`, `selling-flow.spec.ts`, `submissions/form.test.tsx`, `submissions/images.test.tsx` |
| C12 | Seller review clarification → approved commercial terms → accept/decline → listing progress | Rejected/needs information; offer expired/revised/stale; consignment vs buy-first; exact 10% deduction/crypto route; explicit acceptance; no credential/publication blocker; withdraw before/after obligations; next actor visible | `resale-journey.ts`, `selling-flow.spec.ts`, `seller-offer-validation.spec.ts` |
| C13 | Seller chat requested form → buyer sale/delivery progress → payout receipt | Account not sold; disputed/held; buy-first payment prerequisite; eligible consignment; destination confirmation/unsupported route; admin request private credentials only when needed; manual sent/confirmed immutable receipt; no available-balance/wallet claim | `resale-journey.ts`, `manual-payout.spec.ts`, `payments/manual-payout.test.tsx` |
| C14 | Marketplace/game accounts → filters/cards/gallery → buyer terms → purchase | 5% fee/base/total clear; game/region/availability; single/reserved/sold listing; stale price, another buyer wins, self-purchase restriction if enforced; unavailable listing; filter/back context, no private seller details | `resale-journey.ts`, `resale/market-filters.test.tsx`, `resale/purchase.test.tsx` |
| C15 | Paid account purchase → delivery chat form → inspect/accept or dispute | Unpaid denial; wrong recipient/other order denial; re-verification modal preserves context; masked fields/reveal; delivery not ready/revised; inspection deadline/hold; account-protection terms and case next action | `resale-journey.ts`, `chat-form-journey.ts`, `resale/delivery.test.tsx` |
| C16 | Game shop → search/filter/product/variant/quantity → recipient details → pay → manual delivery | User/Zone/region/server errors, min/max quantity, stock change, price/terms updates, unavailable region; actual manual delivery status versus unsupported “instant” claim; partial/failed/cancelled fulfillment; evidence/scanner pending | `shop-purchase.spec.ts`, `shop-promotion.spec.ts`, `shop/purchase.test.tsx`, `shop/delivery.test.tsx` |
| C17 | Game news → type/filter → article/images/links → next article/game | Patch/buff/nerf/guide taxonomy only where configured; empty/published/corrected/unpublished; no private scheduled draft; cover/inline images and small-screen reading; safe link behavior | `news.spec.ts`, `news/list.test.tsx`, `news/content.test.tsx` |
| C18 | Favorite/reorder/availability subscription → notifications/preferences | Existing/deleted/changed catalog; favorite duplicate/remove; reorder requires current quote/terms; unavailable service; consent/email preference; subscribe/unsubscribe invalid/expired token; notification read/target inaccessible | `availability-journey.ts`, `orders.spec.ts`, `orders/favorites.test.tsx`, `notifications` component tests |
| C19 | Eligible completed order → write/edit review → moderation result/public reading | Ineligible/duplicate/length/private-data errors; draft preservation; publish/reject/revise/appeal; ratings/statistics not invented; return to order, game and own review list | `review-journey.ts`, review component tests |
| C20 | Account overview/profile/preferences/security/privacy/contact/policies | Empty and populated overview; profile inline errors; email/provider link/change where offered; session expiry/log out; data export; deletion disabled with next action; contact available signed out, support chat sign-in; readable terms and footer, no misleading external links | `account.spec.ts`, `contact.spec.ts`, `admin-policy.spec.ts`, `privacy/pages.test.tsx` |

## Administrator/owner families

| ID | Required workflow and local views | Critical branches and constraints |
| --- | --- | --- |
| A01 | Separate admin login, enrollment, profile/security/sessions/recovery/preferences | Invitation versus no access; Google/email, staff MFA, recovery; same-email customer isolation; fresh authenticator OR email action modal; cancel/error/expiry/replay; staff sign-out only |
| A02 | Dashboard → filtered orders queue → persistent order workspace | Overview; Request & decisions; Quote & agreement; Fulfillment; Messages & proof; Payment & cases; Activity. Preserve filters, order identity, drafts and focus across sections/back/refresh |
| A03 | Review custom request and original estimate → approve/clarify/reject → exact quote | Original estimate visible; final agreement distinct; wrong/missing fields; quote expiry/revision; rejected/stale concurrent update; customer accepts exact version |
| A04 | Paid fulfillment → assign booster → schedule/hold/resume/progress/proof → staff completion | Unpaid denial; both play modes; capacity/conflict, reassignment, stale version; proof scan state; booster cannot finalize owner-only action; customer sees next step |
| A05 | Support queue → conversation → customer reply/internal note/attachment | Explicit audience before send; note never leaks; open/closed/reopened, unread, search/load more, failed retry/dedupe; upload states; stale/lost access; typed draft persists |
| A06 | Chat form builder → preview → send → recipient response → authorized reveal | Ordinary/protected fields, required validation, invalid duplicate names, purpose and recipient, optional current booster sharing; seller/buyer/game access; cancelled/expired/revoked/reassigned; protected values absent from ordinary messages/logs |
| A07 | Submission review → clarify/approve/reject → seller agreement | Administrator can propose exact seller terms; owner-only payout remains separate; 10% fee and fixed asset/network quote; buyer-first/consignment; stale offer; explicit seller acceptance; removed ownership/credential prerequisite stays removed |
| A08 | Listing editor → public images/title/buyer terms → preview/publish/archive | Saved draft/preview/public review blockers actionable; cover image/4MiB/error; 5% buyer fee; credential-free consignment publication; buy-first actual payout prerequisite; reserved/sold listing cannot be casually reused; no private answer exposure |
| A09 | Owner finance → payments/reconciliation/provider evidence | States/exception filters and exact order return; pending/partial/overpaid/expired/wrong currency; idempotent retries; no arbitrary “paid” shortcut; staff denial clear; live transfer untouched |
| A10 | Cases/disputes/appeals/refund review | Accepted policy version/deadlines, active hold, reasons/evidence, customer reply, fresh verification; one decision per version; stale/duplicate/conflict; approved refund not silently marked transferred |
| A11 | Seller payout queue → eligibility/hold → manual transfer record → confirm receipt | Owner only; seller-confirmed destination, correct amount/coin/network/hash; duplicate transaction and wrong route; draft vs actual transfer vs confirmed record; automatic transfers disabled; private destination/history limits |
| A12 | Payment-policy editor/preview/publication/history | Valid asset/network/minimum/fee/dispute fields; cross-section error focus; dirty preview/stale version, fresh verification, retained historical agreements; test only synthetic policy |
| A13 | Catalog game/details/discovery/artwork → services/form/rules → estimates → fixed offers → seller intake → review policy → preview/publish/history | Linked region/server and hero/role rules both directions; exact label=key; bounds/rounding/order of rules; package images/default main art preserved; estimate-vs-order stages; invalid import, draft/dirty preview, conflicts; default unpublished games not accidentally activated |
| A14 | Shop products/editor → variants/recipient form/terms/stock/promotion/publication/history → delivery queue | Manual fulfillment, positive quantity/capacity, regional recipient requirements; immutable paid contract, stock race, failed images/validation; no supplier order or instant promise |
| A15 | Game news list → write/title image/multiple inline images → preview → publish/schedule/correct/unpublish → history | Wrong type/title/slug/game, link safety, empty content, 4MiB/rejected attachment; schedule timezone/past date; stale draft/unsaved navigation; public reader never sees unpublished content |
| A16 | Reviews queue/detail → approve/reject/redact/respond under policy | Reasons and public/private audience clear; preserve authentic negative review; duplicate/stale state; customer appeal and readable return context |
| A17 | Customer/staff directory → invite administrator/booster → role/suspension/recovery decisions → audit | Owner versus administrator permissions; existing same-email namespace accounts; last owner protection; invitation failure/expired/no invitation; recovery review does not bypass MFA; suspended users lose correct portal access |
| A18 | Calendar → availability/capacity and session management | Date/timezone, overlap/conflict, stale slot, cancelled/moved session; affected owner/customer/booster views consistent; no unconfirmed appointment represented as booked |
| A19 | Content & policies/coupons → editor/preview/publication/history | Correct legal kind/version, required fields, dirty/stale preview, future/expired coupon scope/use count/discount; deletion remains disabled; historical agreement preserved |
| A20 | Privacy requests, export, retention view and disabled deletion | Active obligations/holds, identity review, per-section export/privacy; retention settings displayed without enabling deletion; unauthorized admin/booster denial |
| A21 | Reports, operations/jobs, alerts and media | Date/filter/export, empty/error/loading, retried job attempt history/idempotency, unresolved alert next action; scan quarantined/rejected/private media not publishable; permissions and private data limits |

## Booster families

| ID | Required workflow | Critical branches and constraints |
| --- | --- | --- |
| B01 | Invited pro login → email/Google → mandatory MFA | Uninvited/expired/suspended, wrong code/resend cooldown, return intent, same-email customer/admin isolation |
| B02 | Pro overview → assignment queue/filter → order | Assigned/unassigned/held/cancelled/completed; unpaid work inaccessible; list context and clear role/order identity |
| B03 | Assigned order local Overview/Progress/Messages & proof/Sessions | Next action, accepted scope/delivery target, no seller or finance leakage; missing work details; refresh and back retain context |
| B04 | Receive permitted game-access chat form/reveal → start/progress/pause/resume | Fresh verification where required; assigned recipient only; reassignment/revocation strips old access; secure values stay out of ordinary progress text |
| B05 | Post progress/proof and request completion | Required fields, invalid progress, scanned 4MiB attachment, retry/dedupe/stale status; cannot mark payment or final staff approval; customer proof view consistent |
| B06 | Work/customer coordination and staff conversation | Correct visible audience; allowed ordinary/protected fields; private staff notes not leaked to customer; reply/access disabled after permission removal with draft recovery |
| B07 | Calendar/availability/session accept/change | Both play modes; timezone, stale slot/overlap/unavailable; held/cancelled job; customer/admin changes update pro view |
| B08 | Own settings/security/sessions/recovery/preferences | Role-local route and identity, authenticator setup/QR/recovery, fresh-action modal, revoke session/log out; never redirect to customer security |
| B09 | Forbidden staff/customer records and graceful failure | Another booster's assignment/private thread; seller listings/commercial policy/owner payouts; wrong portal link; no authorization data flash; not-found/offline/session expiry recovery |

## Shared branch classes

Apply each class to every relevant family; record a reason for genuinely inapplicable branches. Representative equivalence classes are acceptable; one happy-path screenshot is not branch coverage.

| ID | Class | Required observation |
| --- | --- | --- |
| X01 | Entry and navigation | First entry, deep link, browser Back/Forward, refresh, cross-portal navigation; named origin/return; selected local section persists |
| X02 | State/data | Loading, empty, populated, long content, stale/deleted/unpublished item, page/list pagination, unknown query/ID |
| X03 | Validation | Blank, invalid type, lower/upper boundary, dependent-field invalidation, server field errors; visible error under field and useful first-invalid focus/scroll |
| X04 | Async/connection | Slow request, offline, API failure, reconnect, session expiry during action, retry and retained draft; no false success or endless loading |
| X05 | Identity/permissions | Signed out, correct identity, same email wrong portal, wrong role, suspended/revoked user, other user's ID; no private-data flash |
| X06 | Mutation safeguards | Busy double-click, timeout/unknown outcome, duplicate request, stale version/concurrent change; refresh/read evidence before retry; explicit success receipt |
| X07 | Modal behavior | Named dialog, description, initial focus, focus containment, Escape/close/cancel, focus return, small viewport/internal scroll; no background mutation |
| X08 | Responsive layout | 1440×900, 390×844 and 320px pressure check; 768px where structural change occurs, short laptop/mobile viewport; no clipping/horizontal page scroll or sticky obstruction |
| X09 | Keyboard/accessibility | Keyboard-only navigation, discernible labels, semantic headings/controls, visible focus, text zoom, contrast, live status/errors; device reduced motion; automated checks supplement observation |
| X10 | Content clarity | User can say where they are, what the price/status means, next action, who acts next and why blocked; no duplicate/excess instructions, jargon, raw internal status or misleading link |
| X11 | Images/media | Correct crop/placeholder/alt, long labels, empty/rejected/large upload, progress and retry, private versus public selection, no layout shift causing missed actions |
| X12 | Business boundary | Visible agreement/policy version and money breakdown; no payment bypass, false completion, invisible commission, uninvited staff access or disabled feature enabled by test |

## Existing coverage and the gaps this review must close

Existing source is substantial, including end-to-end files for identity, orders, fulfillment, support, submissions, resale, payments, shop, news, policies, operations and reports, plus targeted component/portal checks. That is prior automation source, not evidence that this new review executed or passed those flows.

1. **Five independent customer perspectives are new evidence.** Existing suites reuse helper-driven personas and assertions. They do not establish that five first-time users independently find and understand every customer family. Each C1–C5 report needs its own C01–C20 row status and natural-language feedback.
2. **Some prerequisite steps bypass the UI.** `resale-journey.ts`, for example, seeds catalog, seller submission/edit/submit and admin review through API calls before driving offer and delivery interfaces. Reuse the synthetic seed infrastructure, but separately inspect actual seller intake/review controls and record which prerequisite steps were API-seeded.
3. **A cross-role continuation needs shared evidence.** Existing helpers exercise buyer/seller/admin contexts, but the requested audit must retain one chain connecting customer actions with staff/booster interpretation and next-action feedback, not disconnected snapshots.
4. **Latest independent-host behavior needs authenticated review.** Recent six-host live checks were intentionally unauthenticated/read-only. Internal route tests do not alone prove every authenticated redirect and staff security action on distinct hosts. Use isolated three-host fixtures; never synthesize a production session.
5. **Catalog-driven branches require realistic variety.** Many fixtures use small synthetic forms. Test published-shape MLBB hero-role, region-server, delivery, WR and fixed-package configurations, plus another game's configurable template without activating unpublished live games.
6. **Full recovery transitions are not evidenced by visual snapshots.** Resend cooldown elapsed, malformed server errors, upload scanner/storage refusal, stale offer, two buyers competing and connection loss after an accepted action need explicit scenario evidence or a stated limit. A mocked response is permitted but must be labeled.
7. **Disabling unsupported actions is itself a flow.** Customer deletion and automatic outgoing transfers should remain unavailable with understandable guidance. Existing historical tests that enable synthetic retention/payout policies cannot establish current live disabled-state UX.
8. **Cross-role secure-form privacy needs both sides.** Inspect creator preview, recipient completion, staff reveal, current assigned booster sharing, unauthorized customer/booster denial and reassignment. Never treat a recipient-only modal screenshot as access-control qualification.
9. **No automated source implies real-provider acceptance.** `hosted-checkout.ts` intercepts the entire NOWPayments navigation on the isolated origin. It can validate redirect and return UX, not provider uptime, real settlement or fees. Google OAuth and external mail provider delivery similarly remain external-service limitations unless separately authorized and exercised.
10. **Human-device and assistive-technology coverage remains bounded.** Chromium/WebKit emulated mobile, keyboard and axe do not equal physical iOS/Android, screen-reader or all network testing. Report exact environments rather than “works on every device.”

## Current runtime route matrix

Each canonical route below must receive at least one rendered observation from its owning role. Customer route families must also be visited by all five customer personas. Sections and exception branches are covered by the family matrices above, not by inventing new URLs. Local `?section=` / `?view=` parameters must stay inside their current order/editor shell.

### Customer and public destinations

Canonical host: `playoragames.com`. Status of each row at inventory creation: **planned, not executed**.

| Path | Flow families | Component |
| --- | --- | --- |
| `/` | C01 | `routes/home.tsx` |
| `/accounts` | C14 | `routes/accounts.tsx` |
| `/accounts/:id` | C14, C15 | `routes/account-product.tsx` |
| `/availability/unsubscribe` | C18 | `routes/availability-unsubscribe.tsx` |
| `/terms` | C20 | `routes/terms.tsx` |
| `/policies/:kind` | C20 | `routes/policy.tsx` |
| `/how-it-works` | C01, C20 | `routes/how-it-works.tsx` |
| `/contact` | C09, C20 | `routes/contact.tsx` |
| `/games` | C01 | `routes/games.tsx` |
| `/games/:slug` | C01 | `routes/game.tsx` |
| `/games/:slug/services/:service` | C04, C05 | `routes/service.tsx` |
| `/games/:slug/packages/:pack` | C05 | `routes/package.tsx` |
| `/games/:slug/reviews` | C19 | `routes/game-reviews.tsx` |
| `/games/:slug/news` | C17 | `routes/game-news.tsx` |
| `/games/:slug/news/:article` | C17 | `routes/game-article.tsx` |
| `/games/:slug/shop` | C16 | `routes/game-shop.tsx` |
| `/games/:slug/shop/:id` | C16 | `routes/game-shop-product.tsx` |
| `/games/:slug/accounts` | C14 | `routes/game-accounts.tsx` |
| `/games/:slug/accounts/:id` | C14, C15 | `routes/game-account.tsx` |
| `/availability` | C18 | `routes/availability.tsx` |
| `/reviews` | C19 | `routes/reviews.tsx` |
| `/reviews/:id` | C19 | `routes/review.tsx` |
| `/login` | C02, C03 | `routes/login.tsx` |
| `/sell` | C11–C13 | `routes/submissions.tsx` |
| `/sell/new` | C11 | `routes/submission-new.tsx` |
| `/sell/:id` | C11–C13 | `routes/submission.tsx` |
| `/orders` | C06–C10, C15, C16 | `routes/orders.tsx` |
| `/orders/:id` | C06–C10, C15, C16 | `routes/order.tsx` |
| `/favorites` | C18 | `routes/favorites.tsx` |
| `/support` | C09 | `routes/support.tsx` |
| `/support/:id` | C09, C13, C15 | `routes/conversation.tsx` |
| `/notifications` | C18 | `routes/notifications.tsx` |
| `/privacy` | C20 | `routes/privacy.tsx` |
| `/account` | C20 | `routes/portal.tsx` |
| `/account/settings` | C20 | `routes/portal.tsx` |
| `/account/security` | C03, C20 | `routes/portal.tsx` |
| `/account/sessions` | C03, C20 | `routes/portal.tsx` |
| `/account/recovery` | C03 | `routes/portal.tsx` |
| `/account/preferences` | C18, C20 | `routes/portal.tsx` |

### Administrator and owner destinations

Canonical host: `admin.playoragames.com`. Status of each row at inventory creation: **planned, not executed**.

| Path | Flow families | Component |
| --- | --- | --- |
| `/login` | A01 | `../app/routes/login.tsx` |
| `/account/settings` | A01 | `../app/routes/portal.tsx` |
| `/account/security` | A01 | `../app/routes/portal.tsx` |
| `/account/sessions` | A01 | `../app/routes/portal.tsx` |
| `/account/recovery` | A01 | `../app/routes/portal.tsx` |
| `/account/preferences` | A01 | `../app/routes/portal.tsx` |
| `/customers` | A17 | `../app/routes/customers-admin.tsx` |
| `/media` | A21 | `../app/routes/media-admin.tsx` |
| `/alerts` | A21 | `../app/routes/alerts-admin.tsx` |
| `/content` | A19 | `../app/routes/content-admin.tsx` |
| `/privacy` | A20 | `../app/routes/privacy-admin.tsx` |
| `/accounts` | A08 | `../app/routes/accounts-admin.tsx` |
| `/accounts/:id` | A08 | `../app/routes/account-listing-admin.tsx` |
| `/finance` | A09–A12 | `../app/routes/finance-admin.tsx` |
| `/reports` | A21 | `../app/routes/reports-admin.tsx` |
| `/jobs` | A21 | `../app/routes/jobs-admin.tsx` |
| `/reviews` | A16 | `../app/routes/reviews-admin.tsx` |
| `/reviews/:id` | A16 | `../app/routes/review-admin.tsx` |
| `/news` | A15 | `../app/routes/news-admin.tsx` |
| `/news/:id` | A15 | `../app/routes/news-editor-admin.tsx` |
| `/shop` | A14 | `../app/routes/shop-admin.tsx` |
| `/shop/orders` | A14 | `../app/routes/shop-orders-admin.tsx` |
| `/shop/:id` | A14 | `../app/routes/shop-product-admin.tsx` |
| `/catalog` | A13 | `../app/routes/catalog-admin.tsx` |
| `/coupons` | A19 | `../app/routes/coupon-admin.tsx` |
| `/submissions` | A07 | `../app/routes/submissions-admin.tsx` |
| `/submissions/:id` | A07 | `../app/routes/submission-admin.tsx` |
| `/orders` | A02–A04 | `../app/routes/orders-admin.tsx` |
| `/orders/:id` | A02–A04, A10 | `../app/routes/order-admin.tsx` |
| `/support` | A05–A06 | `../app/routes/support-admin.tsx` |
| `/support/:id` | A05–A06 | `../app/routes/conversation-admin.tsx` |
| `/` | A02 | `../app/routes/admin.tsx` |
| `/calendar` | A18 | `../app/routes/admin-calendar.tsx` |

### Booster destinations

Canonical host: `pro.playoragames.com`. Status of each row at inventory creation: **planned, not executed**.

| Path | Flow families | Component |
| --- | --- | --- |
| `/login` | B01 | `../app/routes/login.tsx` |
| `/account/settings` | B08 | `../app/routes/portal.tsx` |
| `/account/security` | B08 | `../app/routes/portal.tsx` |
| `/account/sessions` | B08 | `../app/routes/portal.tsx` |
| `/account/recovery` | B08 | `../app/routes/portal.tsx` |
| `/account/preferences` | B08 | `../app/routes/portal.tsx` |
| `/support/:id` | B04, B06 | `../app/routes/conversation-booster.tsx` |
| `/calendar` | B07 | `../app/routes/booster-calendar.tsx` |
| `/orders` | B02 | `../app/routes/booster-orders.tsx` |
| `/orders/:id` | B03–B07 | `../app/routes/booster-order.tsx` |
| `/` | B02 | `../app/routes/booster-home.tsx` |

### Compatibility, machine and unavailable routes

| Surface | Required behavior |
| --- | --- |
| Storefront `/booster/login` | Redirect/map to pro portal with safe return context; never reuse customer identity. |
| Storefront `/booster/account/settings` | Redirect/map to pro portal with safe return context; never reuse customer identity. |
| Storefront `/booster/account/security` | Redirect/map to pro portal with safe return context; never reuse customer identity. |
| Storefront `/booster/account/sessions` | Redirect/map to pro portal with safe return context; never reuse customer identity. |
| Storefront `/booster/account/recovery` | Redirect/map to pro portal with safe return context; never reuse customer identity. |
| Storefront `/booster/account/preferences` | Redirect/map to pro portal with safe return context; never reuse customer identity. |
| Storefront `/booster/support/:id` | Redirect/map to pro portal with safe return context; never reuse customer identity. |
| Storefront `/booster/calendar` | Redirect/map to pro portal with safe return context; never reuse customer identity. |
| Storefront `/booster/orders` | Redirect/map to pro portal with safe return context; never reuse customer identity. |
| Storefront `/booster/orders/:id` | Redirect/map to pro portal with safe return context; never reuse customer identity. |
| Storefront `/booster` | Redirect/map to pro portal with safe return context; never reuse customer identity. |
| Optional `/admin` prefix on admin host and `/booster` prefix on pro host | Each optional-prefix alias resolves to the same portal-local destination; canonical links use the dedicated hostname. |
| `/games/:slug/news/sitemap.xml` | Published article URLs only; correct unknown-game response. Machine output, not a visual screen. |
| Unknown storefront/admin/pro routes (`*`) | Portal-appropriate not-found context and safe return; no unrelated account switch or private data. |

## Evidence and completion ledger

Every tester reports each family as **observed pass**, **finding**, **not applicable (reason)**, or **not executed (reason)**. Each row carries environment, actual viewport/browser, synthetic fixture state, interaction steps, evidence path and relevant issue IDs. Do not inherit another tester's pass. Seeded API prerequisites are labeled separately from UI steps. Existing automation may support a finding's regression test but cannot stand in for the requested independent role feedback.

Finding priority and ownership:

- P0: private-data/credential exposure, authorization bypass, false paid/financial duplication or irreversible incorrect action. Stop that scenario and escalate to engineering/root immediately.
- P1: a core task cannot complete or a user can make a consequential wrong decision because the status, price, audience, validation or next action is unclear.
- P2: task is possible but confusing, easily missed, unnecessarily repetitive, inaccessible or broken on supported narrow/keyboard layouts.
- P3: cosmetic inconsistency with a clear reproducible usability consequence; optional aesthetic preferences are separated from defects.

Product triage resolves conflicts against the preserved rules, names the required user outcome and identifies impacted flow families. Designer specifies focused interaction/layout corrections; researcher confirms the problem was observed rather than assumed; engineer checks behavioral/security consequences. Root implements assigned fixes. The original role tester reproduces again, and a separate senior designer performs the required scoped rendered fix/review loop. No issue is closed only because code was edited or a screenshot looks better.

A complete report lists the union of reproducible findings, duplicate feedback, actual fixes, regression checks and unresolved/untested limits. It must not say “every possible flow passed,” “no bugs remain,” or “production payments verified” without evidence. This inventory authorizes neither a full automated gate nor production mutation; standing focused checks and existing deployment/recovery rules remain.


## Continuation worksheet — 18 October 2026

The original isolated API has ended and its private encryption keys were not retained. **Do not attempt to resurrect encrypted records with a different key or describe fresh records as the same persisted journey.** Retain the October16 source manifests, traces and actual actor receipts. The replacement environment must carry a new run identifier and an explicit prerequisite manifest. No production data or configuration is needed.

### What may be retained and what must be new

| Evidence class | Reuse decision |
| --- | --- |
| Completed October16 actual actor steps on unchanged behavior | Retain as dated actual evidence; do not rerun merely because the fixture expired. Their exact source is part of the receipt. |
| A confirmed fix reviewed by its original actor on candidate1 | Retain that scoped result; final designer checks newly affected/shared surfaces on the final candidate. It does not establish later backend behavior. |
| Fresh fixture prerequisites | May be seeded through existing test services/API helpers and must be labelled **setup, not UI execution**. Record IDs/state/terms/audience, never secret values. Avoid SQL edits that bypass invariant creation or fabricated production payment success. Use the existing isolated signed provider-event path where paid state is required. |
| A remaining actor action | Execute through that role's normal UI on the new fixture. Label it a continuation of the scenario design with new records, not a continuation of the old persisted object. |
| Rare failure/expired/stale branch | Exact-response frontend fixture is acceptable when clearly labelled; it proves presentation/recovery, not persistence or enforcement. Domain tests can separately prove enforcement. |
| Old missing fixture endpoint, stale code, selector timeout, absent current availability | Setup limitation. Correct the prerequisite or helper and preserve failure evidence. Never report it as a product failure or passing journey. |

### Minimal fresh fixture setup recipe

The engineer/admin coordinate setup once. Personas need the current object map privately; they should discover the resulting object through its normal queue/list when that discovery is the reviewed task.

1. **Identity and catalog:** independent C1–C5 customer identities, owner and separate administrator, one current booster and a disposable alternate booster. Normal staff sign-in/MFA. Publish the current rich synthetic MLBB configuration, active fixture help wording, one review-enabled disposable boost offer, a manual shop product and one article. Retain an intentionally paused service/unpublished item for negative states. Publish a synthetic policy matching the existing fake provider route; outgoing transfers and deletion remain disabled.
2. **Seller/buyer chain:** accepted consignment withUSD100 base, seller10%/USD90 net and buyer5%/USD105 total; published listing with scanned public cover and buyer terms; a C4 purchase verified only by the isolated provider-event path. The seller has not yet provided access. Admin requests seller-access normally; C3 answers; admin issues buyer delivery; C4 inspects/acknowledges. Then C3/owner exercise eligible manual payout and a separately held/duplicate case. Do not require credentials to prepare the consignment listing.
3. **Customer2 receipts:** a completed, eligible fixed boost and a completed manual-shop order, with proof and a customer case requiring a staff decision/appeal response. Clearly identify which completed prerequisites are recreated setup. C2 actually reads the outcome, submits feedback/review and exercises remedy navigation; administrator actually handles the new review/appeal.
4. **Customer1 co-play:** paid, assigned play-together custom order preserving theUSD21.84 estimate/accepted quote context; enabled coordination; a new future availability window, since the October16 window is past. C1 proposes, booster/admin confirm and manage a changed/conflicting state, then customer follows the outcome. Do not repeat the previously qualified checkout merely to populate this state; use explicit test prerequisites.
5. **Customer5 support/security:** presales thread containing an ordinary staff reply and an ordinary/protected form addressed to C5. C5 actually responds, verifies masking/reveal and carries out optional MFA/recovery/export/session work. Disposable sessions/staff are used for revocation after shared work finishes.
6. **Secondary customer passports:** where a customer lacks a sale, purchase or eligible review needed for their independent family task, prepare a **separate record owned by that customer**, labelled seeded prerequisite. Do not grant access to the specialist's private object or count that specialist's receipt as this person's execution.

### Independent customer passport

Every C1–C5 report retains its own existing ledger. For each item below, reference an already completed unchanged action or execute the missing representative task. A visit/empty-state screenshot alone cannot close a transactional item. The critical alternate branches in the original matrix remain a shared evidence checklist: assign a named actor/engineering test or mark an explicit limit, never infer every permutation passed.

| Family | Minimum meaningful independent task for each customer; use labelled setup where needed |
| --- | --- |
| C01 | Move through the five homepage services with keyboard, select a game/service and return/refresh without losing game context; inspect one unavailable service. |
| C02 | Normal portal-local email sign-in and consent/return; wrong-code or cooldown correction. Google cancellation/error can be a declared frontend fixture; real Google remains unqualified. |
| C03 | Recovery modal cancel/focus and current optional-MFA state; one security/session action with normal verification. Revoke the persona's session only after their handoffs. |
| C04 | Independently change linked region/server and hero/role preferences, see a live estimate and correct one invalid selection before the request/review step. At least one actor covers every declaredWR mode and stale-estimate branch. |
| C05 | Read immutable package scope, correct a required delivery field, review price/terms and perform purchase or explicit unavailable/revised-contract recovery. |
| C06 | On an owned quoted request, identify original estimate versus exact final quote and perform an accept, decline or stale/expired decision with visible outcome. |
| C07 | On an owned order, understand asset/network/amount and hosted continuation/return. At least one actual isolated chain covers new invoice/unpaid return/verified event; other persona failure states are explicitly labelled if mocked. |
| C08 | Use local sections on an owned populated order, reload/back, find terms/proof/status and correctly identify the next actor. |
| C09 | Send/read an ordinary message, correct required form answers, respond to a permitted ordinary/protected form and inspect masking/audience. Do not place credentials in ordinary text. |
| C10 | On an owned eligible record, open/correct a problem report or inspect a staff decision/appeal and refund-progress boundary. An unpaid cancellation alone does not qualify the paid case branch. |
| C11 | Create an owned draft, correct title/authority/required fields, attach a synthetic image or handle rejection, and distinguish saved draft from submitted review. |
| C12 | On an owned seller proposal, identify fee/net/route and next actor, then accept/decline or correct an expired/revised state. Keep exact-terms consent. |
| C13 | Inspect that owned seller's not-yet-payable versus eligible/held state and perform destination/receipt interaction where available. Never infer wallet or automatic payout. |
| C14 | Filter a populated marketplace, correct invalid price/currency, inspect gallery/base+fee and perform reserve or conflict/unavailable recovery on a listing not owned by that customer. |
| C15 | On an owned paid purchase, read requested protected delivery, inspect/acknowledge or enter the dispute path; a labelled unpaid/other-recipient denial supplements it. |
| C16 | Choose a shop item/variant, correct recipient fields and inspect exact manual-delivery terms; create or follow an owned order to its meaningful next step. |
| C17 | Filter/read a published article with cover/inline content, return to the same game and inspect an unavailable/unpublished result without exposing draft content. |
| C18 | Save/read/remove a favorite, inspect a populated notification and its target, and create/remove a synthetic availability subscription where supported. Consent/expired-link state remains clear. |
| C19 | On an owned eligible completed record, validate/submit/edit or inspect a moderation result. Show ineligibility honestly; use a separate eligible prerequisite rather than changing an existing paid contract. |
| C20 | Save/reload profile/preferences, inspect disabled deletion/contact/policies and complete/export-verification or a relevant protected account action. At least C4/C5 verify exported file contents/ownership, not only a success notice. |

### Per-persona immediate remainder

These are priorities within the passport, not exemptions from the other rows.

| Actor | Reuse as existing scoped evidence | Execute next |
| --- | --- | --- |
| C1 | Actual custom preferences/request,USD21.84 quote acceptance and fixture payment; recovery-copy closure; favorites/profile/article/draft | New-run co-play proposal/confirmation/progress outcome; protected form; completed review/case; missing independent seller/buyer/shop/payout tasks. |
| C2 | Actual fixed/shop checkout, shop delivered proof, opened case, protected fixed-access response | Read fixed completion and case decision; eligible review; C2-01 fixed-summary/current credential-copy recheck; missing custom/seller/buyer/security tasks. |
| C3 | Actual intake/scanned image, exact consignment acceptance, protected form response/reveal/30-second hide, upload-error closure | New seller-access reply; buyer-sale/inspection/payout receipt; independent boost/shop/buyer/security tasks. |
| C4 | Filter closure, actual105USD buyer checkout, required custom form/request, fixed order cancellation, profile/preferences/news | Buyer delivery/inspection/acknowledgement; paid case branch; export with a genuinely new local mail message; seller proposal/payout/security/common gaps. |
| C5 | Actual support conversation, profile/preferences,17.50 estimate, private seller draft, article and export response | Staff reply/protected form, no-MFA correction closure, optional MFA/recovery/session work, actual export file, missing transactions and notices. |
| Admin | Actual invitations/MFA, catalog/policy/article authoring, quote, shop completion, separate-admin proposal/publication, form exchange | Fresh setup plus remaining delivery/payout/case/review/scheduling; the five bounded governance/authoring/operations groups in `UX165_PRODUCT.md`. |
| Booster | Actual MFA, assignment/protected response/reveal, proof/progress/hold/resume/completion request, profile/preferences, uninvited denial; overview/UTC closure | New co-play booking/conflicts; non-UTC calendar; reassignment/revocation of known records; remaining security/session/portal boundaries and corrected sender attribution. |

Final status requires each original role or its clearly named continuation to append actual outcomes and explicit limits. Product cannot convert these remaining tasks into passes by reading code. Final design/research/engineering verdicts remain independent and should be linked to the same final-source closure ledger. No full suite, production deployment or external transaction is authorized by this continuation.
