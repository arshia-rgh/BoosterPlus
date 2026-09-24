# Design review and handoff

Status: review edition prepared; owner acceptance pending. Product development and R10/R11 remain paused.

## Review the visual direction first

Open [the atlas](http://127.0.0.1:4177/design/index.html) with the local command in README.md. Start with P01, G01, P04, P09/P10, C01, C03, C12, S04, B03, A01, A12 and A16. Compare desktop and phone using the width controls. The prototype uses supplied art as layout references; it is independently designed rather than a restyled copy of the exports.

The atlas includes 113 views, 30 connected journey specifications and 555 named state treatments. Every one of the 55 current route paths has a design mapping. Many states share a visual pattern (for example, a persistent error panel); this is not a claim of 555 independently drawn compositions.

It is a **reviewable annotated prototype**, not a production-equivalent app. Some secondary cards describe the intended content/behavior; those annotations must become real data and final microcopy during implementation. The specification drawer contains the full contract. The atlas retains fictional example drafts in memory only; it does not persist real multi-screen form data, authenticate, enforce permissions, upload files, send messages, query a provider, create money movements or implement completed character animation. Route/state coverage does not imply those real scenarios were executed.

## Task-based owner review

| Task | Start | What the reviewer should be able to explain |
| --- | --- | --- |
| Find the appropriate service | P01 / P02 | Where to choose a game and whether it is actually available |
| Build a custom request | P04 → P05 | Current/target goal, play mode, which options matter, estimate versus final quote |
| Buy a fixed package | P07 → P08 | Exact scope, eligibility, price, and why staff quote approval is not required |
| Read a quote | C03 | What changed, exact amount, expiry and what acceptance commits to |
| Pay by crypto | P09 → P10 / states | Asset, network, exact amount, expiry and what to do while confirming |
| Recover from payment trouble | P10 → C08 → C09 | Why a screenshot/extra payment is not a solution; what staff are reviewing |
| Buy an account | P12 → P14 → C23 | Reservation versus ownership transfer; secure delivery and issue reporting |
| Sell under both arrangements | S02 → S04 / Buy-first state → S06 | Amount/fees, payout trigger, obligations and absence of a wallet |
| Use chat on a phone | C11 → C12 | Who can see the message, where to type/send, how to retry and read older content |
| Separate seller/buyer privacy | S07 / A37 / C12 | The audience of each conversation and location of private handoff |
| Fulfill assigned work | B01 → B03 → B04 | Readiness, schedule, evidence and admin completion approval |
| Triage work | A01 → A02 → A03 | Most urgent decision, payment status, next responsible person |
| Configure a new game | A10 → A14 | Required fields/rules, draft vs live state, invalid conditions and publication boundary |
| Resolve an outgoing transfer | A16 / A17 → A19 | Approval vs execution vs confirmed receipt; reconciliation before retry |
| Review identity/access | I03 / I05 / A08 | Every-sign-in staff MFA, recovery limits and role change consequences |
| Handle deletion | C18 → A35 / A36 | Why it can be disabled/held, what remains retained, and when erasure is irreversible |

Ask reviewers to describe the next step before prompting them. Record observed hesitation and incorrect assumptions. Do not claim conversion improvement, task-time results or “best UX” without observation. Prefer fixing a recurring misunderstanding over adding ornamental effects.

## Remaining business content, not layout blockers

- Final win-rate meaning, measurement window, exclusions and remedy. Keep the field unpublished until decided.
- Actual service/rank/hero/region configuration, prices, capacity and delivery commitments for each enabled game.
- Approved payment routes/fees, refund/cancellation/dispute terms, account transfer criteria and seller offer amounts/deadlines.
- Owner-entered retention rules, approved legal/business contact copy and language choices.
- Final artwork/voice/sound rights and per-game crop approval; final motion needs a separate media review.

These decisions do not justify inventing public guarantees. Their locations, disabled/absent states and publication dependencies are designed.

## Artifact verification

Reproducible local integrity checks:

```sh
python3 docs/redesign/sync_design.py
python3 docs/redesign/check_design.py
node --check docs/redesign/design/atlas.js
make check-repository
```

Edit `design/screens.json` and `design/flows.json`, then run `sync_design.py` to refresh the human-readable specifications and data.js. The sync/check scripts are scoped to this documentation artifact and add no project dependencies. `check_design.py` verifies unique IDs/states, navigation targets, exact data synchronization, local asset references and all existing route mappings.

Browser review uses the Codex in-app browser, explicitly waits for the selected screen’s design ID before inspecting it, then checks the rendered frame. A rapid repeated hash-navigation run was interrupted when the selected option did not update the location/frame (rapid-navigation throttling was suspected, not proven); it is not a passed check. Resume through fresh page navigation and record only completed, verified frames. Initial 320px checks found signed-in header and dashboard-row overflow; the reviewed stylesheet corrects both.

The final verification receipt below records the actual completed checks. These are design-artifact checks, not frontend/backend business-flow tests, cross-browser conformance, physical-device software-keyboard testing or production security qualification.

## Acceptance boundary

- [ ] Owner accepts overall storefront, workspace and operational visual hierarchy.
- [ ] Owner walks key customer, seller, booster and administrator journeys and approves the interaction design.
- [ ] Remaining commercial copy and final artwork decisions are either resolved or remain visibly blocked.
- [ ] Specific design corrections are incorporated and the accepted version is recorded.
- [ ] A new implementation plan is agreed from this design package; the superseded roadmap is not restarted automatically.
- [ ] R10/R11 remain separately held until explicitly authorized later.

## Verification receipt — 21 September 2026

- Structured integrity passed: 113 unique views, 30 linked journey definitions, 55/55 current routes and 555 unique named state treatments. Local data.js matches the editable JSON. JavaScript syntax check passed.
- In-app browser rendered-frame checks passed for all 113 views at 320, 390, 768 and 1440px: **452 layout checks**, each confirming the selected ID, one H1 and no canvas/page horizontal overflow. A final targeted pass rechecked the five adjusted signed-in/payment headers at 320px and the full mobile admin menu.
- All 555 named state treatments were selected and checked at phone width for the correct state heading and no canvas overflow. This verifies their presentation, not actual backend transitions or independent per-state business behavior.
- All 30 journey selectors expose linked steps. Chat’s demo-send feedback and staff audience feedback were checked; neither transmits messages. The specification panel closes with Escape and returns focus to its trigger.
- Desktop hero/configurator/admin/invoice and narrow chat/dashboard compositions were visually inspected. Chat was compacted so its composer stays in the conversation frame. The narrow header and dashboard overflow found during review were fixed and rechecked, not waived.
- Repository checks passed, including the policy/secret scanner, contract equality and workflow lint. No application dependencies, backend logic, deployment files or live provider data were changed. The tracked documentation gate is required again at commit.

Not qualified here: real iOS/Android keyboard behavior, human screen-reader use, complete WCAG conformance, authenticated product integration, live transfers, character animation quality, art publication rights or human comprehension results. Those remain explicit design/implementation/launch review boundaries. No production site was deployed.

## 23 September — homepage and game-hub revision

Verified the changed P01/P02/G01–G06 layouts at 320, 768 and 1440px in the in-app browser: 24 combinations, each with one H1, no horizontal document overflow and no broken loaded images. Inspected homepage/service/catalog and narrow game-hub screenshots. Exercised all 25 available All services/category selections across six game profiles; hidden panels match selection. Checked related promotion filtering, All services reset and browser Back, all five Choose your game links including repeated same-hash clicks, destination focus, and the non-linked paused card. Browser error log was empty. Reduced-motion handling was reviewed in source; physical-device/assistive-technology and owner visual acceptance remain open.

Design integrity (113 screens, 30 journeys, 55 routes, 555 named treatments), JavaScript syntax, formatting and root repository checks passed. This revision does not requalify application functionality. New shop/news downstream screens and three dedicated game artworks remain explicitly pending; see [the revision brief](HOMEPAGE_GAME_HUB_REVISION.md).

### Follow-up — service chooser replaces All services

The later owner refinement removes global links from game navbars too. Verified all 19 category entries and returns across six games: only the selected panel is visible; the chooser hides; the small back link restores it. Accounts exposes buying/selling actions internally. Keyboard Enter moves focus into the service; browser Back restores chooser focus. Desktop and 390px screenshots reviewed; narrow chooser/detail show no horizontal overflow. Previous All services checks above are historical. Detailed per-game downstream marketplace/submission templates remain a separate design pass.

## Shared experience follow-up — 23 September

- All 113 screens checked at 390px: one H1, no horizontal document overflow, Contact us footer present, no Games/Accounts/Sell an account/How it works links in top navigation.
- All six game profiles checked for the same hero/background asset, three FAQ disclosures and exactly one offer rail before the chooser. Wild Rift rail is hidden while paused; direct nested request shows no order fields. Artwork inspected locally and settled MLBB/WoW compositions inspected in-browser.
- Homepage FAQ disclosure and horizontal review arrow movement exercised. Reduced-motion preview disables ambient and emblem animations; footer Pause/Resume changes background play state. No captured browser errors.
- Embedded MLBB custom form, account listing and account detail retain game hero/statistics/background with one H1. Edited EU selection survives overview/back; Visitor reset returns the sample default. In-game draft values are memory-only design controls.
- Signed-in panel exercised: expand, Escape collapse, active/empty/unavailable states, hide on Visitor, order link to C05, support link to C11, collapse on navigation and availability on subsequent screens. Phone panel reviewed at 390×844; desktop layout reviewed at 1100px. No real account access or provider requests occurred.
- `node --check`, Prettier, design integrity/asset hashes and root repository checks are the stage checks. Existing application suites are unchanged and not requalified. Physical-device/assistive-technology and owner visual acceptance remain open. Publisher assets are local design references; deployment rights remain unqualified.

## 24 September panel navigation gate

See [PANEL_UX_REVISION.md](PANEL_UX_REVISION.md) and the [four-round senior review](reviews/2026-09-24-panel-workspaces.md). Changed-scope verdict PASS. Reproduce the route/fixture checks with `node docs/redesign/check_panels.mjs`, then explore C01/B01/A01, open named records, change sections and return to filtered lists. Existing screen IDs for record subviews now resolve into the same record shell.

## Complete review — 24 September

The [complete current-design review](reviews/2026-09-24-complete-design-review.md) supersedes earlier qualification for the changed journeys and shared state handling. Run `node docs/redesign/check_panels.mjs` for all 33 route/fixture assertions. The source of the clickable recovery and journey refinements is `design/journeys.js`; it remains a design artifact with no provider/API or persistent storage integration.
