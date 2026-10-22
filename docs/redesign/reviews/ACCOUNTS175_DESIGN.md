# ACCOUNTS175 — PLAYORA-owned account listings: design review

Scope: administrators create and publish account listings that PLAYORA itself owns (no seller submission, agreement, handover or payout), and the admin Account inventory separates ownership: **PLAYORA-owned** (staff-created listings plus listings from accepted buy-before-resale seller offers) versus **Seller consignment** (sold for the seller, who is paid after the buyer's delivery and inspection). Affected UI: `frontend/app/resale/inventory.tsx` (inventory list and listing editor), the readiness checklist from `submissions/selling-progress.tsx`, `commission-fields.tsx` help text, image selection, and the public account card/detail (decision: unchanged). Existing seller submission, offer, handover and payout flows and their copy stay as they are.

Reviewer: an independent senior UI/UX designer agent, separate from the implementing agent and the parallel senior software engineer. The reviewer decides and later verifies rendered fixtures; it does not edit application files. Assumed data contract (engineer to confirm): each listing has `ownership` (`playora` | `consignment`) and `source` (`staff` | `buy_first` | `consignment`); staff-created rows have no seller, offer or submission; the buyer price uses the existing rule (account base + 5% buyer commission, half-up cents).

## Round 0 — designer decisions

Grounded in existing primitives: `RecordShell`, `catalog/controls` (`Action`, `Select`, `Text`, `Check`, `ErrorNotice`), `ui/primitives` `StatusBadge`, `ui/action-fields` `ActionFields`, `media/attachment` `UploadImage` (private admin media with scanning), `CoverEditor`/`ReviewedImage`, `BuyerPriceInput`/`BuyerBreakdown`, `ListingPreview`, the shop `CreateProduct` create-then-navigate pattern, the public `offering-paths` 44 px pill style, the `wanted-row` card surface and the `--champagne-detail` token.

### 1. Inventory separation

| ID | Decision |
| --- | --- |
| D1 | **Segmented ownership filter, not ARIA tabs and not grouped sections.** Three real links in a `role="group"` labelled “Ownership”: **All**, **PLAYORA-owned**, **Seller consignment**; the current one has `aria-current="true"` and the filled pill style. Tabs would advertise an arrow-key/panel model we do not implement (PANEL_UX_REVISION); grouped sections would need two cursor-paginated lists with confusing “More” controls. |
| D2 | URL: `?owner=playora|consignment` (absent = All), combined with the existing `?state=`; changing either clears `after`. Unknown `owner` values are replaced (history `replace`) by All. Back/Forward, reload and new-tab work; the editor's return keeps the full query through the existing `inventorySearch` state. Activation keeps focus on the pressed link and `preventScrollReset`. |
| D3 | Default is **All**, so no existing work is hidden; every row carries its ownership chip, so separation is visible without filtering. |
| D4 | Counts appear in each pill (“PLAYORA-owned 4”) **only when the server returns them** for the current status filter; never counted from the visible page. Without server counts the pills show labels only. A polite status line announces “Showing 4 PLAYORA-owned listings.” (with counts) or “Inventory updated.” (without). |
| D5 | Status filter stays a `Select` labelled “Status”, options: All statuses, Draft, Published, Reserved, Sold, Paused (`withdrawn` is displayed as **Paused**, matching the editor's existing “Pause public listing” and “This listing is paused.”). |
| D6 | Rows become cards (wanted-row surface), one `<li>` each, in this order: title link (the record action, existing “Untitled reviewed account” fallback) with a `StatusBadge` for state (Draft neutral, Published positive, Reserved warning, Sold info, Paused neutral; text always present); meta line “{game} ·” ownership chip + source text; outcome line; buyer total “Buyer pays USD 105.00” or “Price not set”. From 900 px the total sits in a right column; below it stacks. |
| D7 | Ownership chip (text, never colour alone): **PLAYORA-owned** = champagne outline (`--champagne-detail` border/text on the card surface, the only champagne on the page); **Seller consignment** = neutral green outline (`#4b6b58` border, `#c7d8cc` text). Source text after the chip: “Created by staff”, “Bought from seller”, “Listed for a seller”. |
| D8 | Outcome line states the rule, not a status the list cannot prove: staff — “On sale: no seller payout.”; buy-first — “On sale: no seller payout. The seller is paid before publication.”; consignment — “On sale: the seller is paid after the buyer's delivery and inspection.” |
| D9 | Empty states (after a settled read). All: “No account listings yet.” + “Add a PLAYORA account” and “Review seller submissions” links. PLAYORA-owned: “No PLAYORA-owned listings yet. Add one, or accept a buy-before-resale seller offer.” Seller consignment: “No seller consignment listings yet. They appear when a seller accepts a consignment offer.” With a status filter the sentence becomes “No {ownership} listings are {status}.” followed by an `Action` “Show all statuses” that keeps the ownership filter. Loading: “Loading inventory…” (`role="status"`); failure: `ErrorNotice` + “Retry inventory”. Pagination labels stay “More inventory” / “First inventory”. |
| D10 | Page header area, in order: intro “PLAYORA-owned accounts are sold for PLAYORA. Seller consignment accounts are sold for their seller.”; action row with primary **Add a PLAYORA account** and secondary link “Seller submissions” (replaces “Review seller submissions and create offers”); then the ownership group; then Status + “Refresh inventory”. Responsive: from 768 px the action row and the ownership group each sit on one line, with Status and Refresh beside the group at 1440 px; at 390 px the pills wrap as whole pills (`white-space: nowrap` each, flex-wrap container, 44 px targets) and the primary action is full width; at 320 px everything stacks with the 16 px gutter and no horizontal page scroll. |

### 2. Creation flow

| ID | Decision |
| --- | --- |
| D11 | Primary button **Add a PLAYORA account** (not “Publish…”: it creates a private draft). It opens an inline panel directly below the action row (shop `CreateProduct` pattern, wanted-new surface), moves focus to the panel's first field and is disabled while open. |
| D12 | Panel: frameless fieldset, legend “New PLAYORA-owned listing”; short note “PLAYORA must own this account. The draft stays private until you publish it.”; fields **Game (required)** — non-archived games, options for games without open account sales read “{Game} (account sales off)” and remain selectable, with “More games”/“First games” paging as in shop; **Public account title (required)** — same limit as the listing editor's title. Actions: submit “Create private draft” (busy “Creating draft…”), secondary “Cancel”. Dirty cancel/navigation shows the existing discard prompt: “Discard this new listing?” / “The game and title have not been saved.” / “Keep new listing” / “Discard new listing”. |
| D13 | Success navigates to `/admin/accounts/{id}?section=details` with `inventorySearch` preserved. The server seeds the approved buyer terms (as “Replace with approved buyer terms” does, inspection 168 hours) and never invents a price, delivery hours, facts or images; the editor shows those as missing in readiness. |
| D14 | Double-submit safety: synchronous lock plus a client `request_key` created when the panel opens, reused for retries after an uncertain failure and renewed only after success or Cancel. Uncertain result copy: “We couldn't confirm the draft was created. Try again; the same request won't create a second draft.” Validation issues focus the first invalid field via `ActionFields`; server problem codes must map to specific copy (no generic outage text for 4xx, per W2-01). |

### 3. Listing editor differences

| ID | Decision |
| --- | --- |
| D15 | Header: `RecordShell` title stays “Account listing”; the status slot shows title, game, ownership chip, state badge and “Refresh inventory item”. Back label is always “Account inventory” for staff rows. |
| D16 | **Ownership panel** at the top of every section (replaces the bare “Inventory state: …” line and the unconditional seller link), a `dl` on the card surface: “Ownership” → chip + source; “When it sells” → the D8 sentence without “On sale:”. Buy-first and consignment add the existing link “Seller agreement and sale progress”. Ownership is read-only; there is no control to change it. |
| D17 | Staff rows hide: the seller link, the conversation image picker and its “Older/Latest review images” paging, “Retry source images”, seller-answer suggestions in `SummaryFields`, and every seller/handover/payout readiness item. Seller rows are unchanged. |
| D18 | Staff images section: heading “Account images”, guidance “Upload screenshots for the public listing. Hide email addresses, player IDs, recovery details and private chat first. JPEG, PNG or WebP, up to 4 MB, at most 8 images.” Upload uses the private admin media pipeline (`UploadImage` scanning, not public catalog artwork); each finished upload is added to the same `CoverEditor` list (“Reviewed image n”, preview, reorder, remove, title image). At 8 images the upload control is disabled with hint “8 images added. Remove one to add another.” Uploading marks the draft unsaved like any edit. |
| D19 | Price: same `BuyerPriceInput` and breakdown. Help text by source: staff and buy-first — “Enter dollars, for example 100.00. The buyer pays 5% more.”; consignment keeps the existing sentence including “A consignment base must match the accepted seller agreement.” |
| D20 | Readiness for staff rows uses a listing-scoped checklist titled “Before publishing”, each a link to its section with an actor of “Admin”: Complete listing details; Check the listing price and commissions; Add account images and choose a cover; Complete buyer terms and delivery timing; Enable account sales for this game (links to the catalog editor); then the existing Save / Preview / Confirm rows and “Ready for your final publication check.” |
| D21 | Confirmation checkbox for PLAYORA-owned rows (staff and buy-first): “I confirm PLAYORA owns this account, and I reviewed every public field and image and removed private information.” Consignment keeps the current wording. Publish button keeps “Publish account listing”, adds busy “Publishing…”; success status for a first publication: “Published. Buyers can now find this account on the {game} Accounts page.” Existing live/paused notices, stale-version banner, leave prompt and reserved/sold lock copy are reused. |

### 4. Public presentation

| ID | Decision |
| --- | --- |
| D22 | **No public ownership indicator.** Every account is sold and supported by PLAYORA under the same published buyer terms and protections; the public projection already hides seller identity and arrangement. A badge would imply consignment accounts are lesser, expose a commercial arrangement and invite unsupported claims (“first-hand”, “verified by PLAYORA”). Staff listings render with the identical card, detail and purchase review. Whether any legal disclosure of agency is required is an owner/policy question, not a UI change in this scope. |

### 5. Rendered fixture states for later rounds

Chromium and WebKit at 320, 390, 768 and 1440 px unless noted; synthetic data only.

1. Inventory All with mixed rows (staff draft, buy-first published, consignment reserved, sold, paused, untitled, 80-character unbroken title), with and without server counts.
2. PLAYORA-owned and Seller consignment filters, each combined with a status; reload, Back/Forward and return from the editor keep the query; unknown `owner` value.
3. Empty states: All, each ownership, ownership + status; loading; failed read and retry; second page.
4. Create panel: open/focus, game list with an “account sales off” option and paging, invalid submit, busy, double-click (one request), uncertain failure and retry, server validation code, dirty cancel and route-leave prompt, success navigation.
5. Staff editor: new seeded draft (readiness shows missing price/images/delivery), images empty / uploading / scan failure / 8-image limit / cover chosen, price breakdown, preview, confirmation, publish busy and success, game-sales-off blocker, stale conflict, reserved/sold lock (1440 and 390 px).
6. Buy-first and consignment editors: ownership panel and unchanged seller sections, help text and checkbox wording (1440 and 390 px).
7. Public Accounts card and detail for a published staff listing beside a consignment listing: identical presentation, no ownership text (390 and 1440 px).
8. Keyboard: Tab order through action row, ownership links, status, rows; visible focus; 200% text zoom at 320 px with no horizontal page scroll and no words broken inside pills.

Verdict for round 0: decisions only, no rendered evidence yet. Implementation proceeds to round 1 review.

## Round 1 — FAIL, thirteen findings

Evidence: the coordinator's full-page captures in `.cache/accounts175/shots-r1e/` (Desktop Chrome and Pixel 7; inventory at 320/390/768/1440; staff editor details/publication at 390/1440; images, 8-image limit, published, sales off, buy-first, consignment, create open/uncertain, empty, error). I also ran my own throwaway probe (`frontend/.cache/r1probe/`, synthetic fixture `tests/fixtures/account-ownership`, Desktop Chrome and Pixel 7) to check focus, live regions, disabled states, validation and computed styles. Full-page captures overlay the sticky record line and sidebar on the content; I treated that as a capture artefact, not a defect.

Accepted reconciliations: images go through the admin artwork pipeline (new purpose `account`); the API uses `ownership=playora|seller` while the URL keeps `?owner=`; server counts are always returned; paused games are labelled “(account sales off)” and Publish stays disabled with the readiness item; images are optional, as for seller listings; the neutral chip reuses the wanted-chip colours; the public pages are unchanged.

Passed in this round: ownership pills with counts, `aria-current`, and the “Showing 7 listings.” status; chips and source labels; the D8 outcome lines, including the added “Seller payout not confirmed yet.”; buyer totals; no horizontal overflow at 320 px; empty, filtered-empty and error states; the create panel layout; the discard prompt and double-click safety (fixture creates 1); the ownership panel for all three sources; seller links and sections hidden for staff rows and kept for seller rows; source-specific price help; the staff checklist without seller items; the buy-first “Complete the agreed seller payout · Owner” item; the sales-off item; the PLAYORA-owned confirmation wording; and the first-publication success copy.

| ID | Severity | What I saw | Required fix |
| --- | --- | --- | --- |
| R1-01 | Major | A new staff draft with no price shows “This saved listing uses its earlier price. Enter an explicit base below to apply the new 5% buyer commission…” (details, 390 and 1440). This is wrong for a listing that never had a price. | Show the notice only when the saved draft has a legacy price (`amount_minor` set and no `commission`). A draft with no price shows nothing; readiness already asks for the price. |
| R1-02 | Moderate | The staff row's Account card summary says “Check the seller’s claims before publication.” A staff row has no seller. | For the staff source: “Customers see these facts before opening the listing. Check each fact against the account before publication.” Buy-first and consignment keep the current sentence. |
| R1-03 | Moderate | The image uploader keeps catalog-artwork copy: label “Choose a replacement image” (even with no images); after upload, “Image added to this draft. Check alternative text and attribution, then save and publish when ready.” (this editor has no alt text or attribution fields); note “Uploads stay private until the page is published. Only upload artwork you may use publicly…”. | For purpose `account` only: label “Choose an image”; success “Image added. Save the listing to keep it.”; note “Images stay private until the listing is published.” (D18 guidance already covers private details). Catalog artwork copy stays unchanged. |
| R1-04 | Moderate | At 8 images the file input is disabled but looks enabled (opacity 1, unchanged “Choose File” button). The hint “8 images added. Remove one to add another.” is a `role="status"` paragraph about 150 px below the input, after the privacy note, and the input's `aria-describedby` doesn't reference it. | Place the hint directly under the “Choose an image” label, above the input, and add it to the input's `aria-describedby`. Dim the disabled control (0.45 opacity, not-allowed cursor, matching admin disabled buttons). |
| R1-05 | Minor | When the create panel opens, focus stays on the now-disabled “Add a PLAYORA account” button (so Chromium has effectively nothing focused) until the game list loads; in the `slow` stage this lasts the whole load. | Move focus to the panel's legend or heading (`tabIndex=-1`) immediately, then to Game once the options load, without stealing focus if the user has moved on. |
| R1-06 | Moderate | The uncertain create result is a plain-text `role="status"` paragraph in body style, and focus drops to `<body>` (probe, both projects). | Show it as a warning notice (`role="alert"`, the wanted-stale warning surface `#5b4f2e` border / `#2a2617` background) above the actions, and move focus to it (`tabIndex=-1`). Keep the entered values. |
| R1-07 | Moderate | After Publish, focus drops to `<body>` and two statuses stack: “This account is live. Publishing again replaces…” and “Published. Buyers can now find this account on the Mobile Legends Accounts page.” | On a first publication show only the success sentence, and move focus to it (`tabIndex=-1`). The “This account is live…” notice returns on later visits or saves. |
| R1-08 | Minor | Submitting with no game marks Game with “Use 1–100 characters.” The labels read “Game” and “Public account title”, without the D12 “(required)” flags. | Game: “Choose a game.”; title: “Enter a title of 1–120 characters.”; labels “Game (required)” and “Public account title (required)”, as in wanted accounts. |
| R1-09 | Minor | “Refresh inventory” and the editor's “Refresh inventory item” use the filled primary style, with the same weight as “Add a PLAYORA account” and “Create private draft”. At 768 px Refresh wraps onto its own row. | Use the secondary outline (as `wanted-admin` `.button.secondary`). Keep Refresh beside Status: at 768 px the pills take one row and Status + Refresh the next. |
| R1-10 | Minor | “Seller submissions” has no link affordance (body text colour, no underline, no hover change). Stacked at 320/390 it sits about 7 px right of the primary button's left edge. Row title links also have no hover change (the focus ring is fine). | Style “Seller submissions” as a secondary compact link-button or an accent-coloured underlined link, flush-left when stacked. Underline row titles on hover. |
| R1-11 | Minor | At 320/390 the meta line wraps after “Mobile Legends ·”, leaving a trailing middot and the chip alone on the next line. | Drop the middot. Render game, chip and source as separate flex items with a gap so they wrap cleanly. |
| R1-12 | Minor | The sticky record line shows the raw state (“draft”, “withdrawn”) while the badge shows “Draft” or “Paused”. | Use the same display label (D5) for `stickyStatus`. |
| R1-13 | Minor | The “Add an account image” heading straddles the upload panel's top border, offset from the panel's text edge (1440 and 390). | Put the heading inside the panel on the same content edge as its text, or remove the panel frame. |

Out of scope, unchanged: the full-page capture artefacts (sidebar background ends and the sticky line overlaps content), and the existing visible “Account listing editor” legend.

Limits: Chromium only (Desktop Chrome, Pixel 7), plus the coordinator's captures at 320/390/768/1440; no WebKit, physical devices or screen-reader software (accessibility judged from focus position, roles, live-region text and accessible names). Public card and detail parity was not rendered in this fixture; I relied on the unchanged public code and the engineer's check that the public JSON has no ownership fields.

**Verdict: FAIL — one major, five moderate and seven minor findings.** Round 2 should send rendered evidence for each finding: a new staff draft's details at 390/1440, staff and buy-first card-summary copy, the uploader before and after an upload and at the limit, create-panel focus in the `slow` stage, the uncertain notice with its focus, publish success with its focus, empty-submit validation, the toolbar at 768/1440, the action row and meta line at 320/390, the sticky line for a paused listing, and the upload panel heading.

## Round 2 — PASS

Evidence: the coordinator's captures in `.cache/accounts175/shots-r2/` (Desktop Chrome and Pixel 7: toolbar and inventory at 320/390/768/1440; create open, slow, validation and uncertain; staff new draft and details; images, after an upload and at the limit; published; sales off; buy-first; consignment; empty; error). I also reran my throwaway probe (`frontend/.cache/r1probe/`, Desktop Chrome and Pixel 7) against the same synthetic fixture to check focus, roles, `aria-describedby`, computed styles and copy after real interactions: a create submit, a sample upload through “Prepare image versions”/“Use this image”, and a publish.

| ID | Verified result |
| --- | --- |
| R1-01 | A new staff draft has no legacy-price notice. The notice text is absent from the details section, and the base price field and readiness item remain. |
| R1-02 | Staff: “Customers see these facts before opening the listing. Check each fact against the account before publication.” Buy-first (and consignment) keep “Check the seller’s claims before publication.” |
| R1-03 | Label “Choose an image”; after an upload “Image added. Save the listing to keep it.”; note “Images stay private until the listing is published.” No alt-text, attribution or “page” wording remains. |
| R1-04 | At 8 images the hint is the first `aria-describedby` reference and sits in the label directly above the input. The control is disabled, at 0.45 opacity, with a not-allowed cursor, and is visibly dimmed. The separate status paragraph is gone. |
| R1-05 | In the `slow` stage the legend (`tabIndex=-1`) has focus immediately, and Game takes focus once the options load. In the normal stage Game is focused. |
| R1-06 | The uncertain result is a `role="alert"` warning (border rgb(91,79,46), background rgb(42,38,23)) above the actions. It is focused and the title value is kept (both projects). |
| R1-07 | After a first publication only “Published. Buyers can now find this account on the Mobile Legends Accounts page.” is shown, and it is focused (`tabIndex=-1`). The “This account is live…” notice is suppressed. |
| R1-08 | An empty submit shows “Choose a game.” and “Enter a title of 1–120 characters.”, focuses Game and shows the summary. Labels read “Game (required)” and “Public account title (required)”, with a quiet flag. |
| R1-09 | Both Refresh actions are secondary outline. At 768 px the pills fill one row and Status + Refresh share the next. At 1440 px everything is on one line. |
| R1-10 | “Seller submissions” is a secondary compact link-button beside the primary at 768/1440, full width and flush-left (x=12, the same as the primary) on the phone. Row titles underline on hover. |
| R1-11 | No middot. Game, chip and source wrap cleanly at 320/390. |
| R1-12 | The sticky line reads “Paused” for the withdrawn consignment and “Draft” or “Published” elsewhere. |
| R1-13 | The uploader is unframed. Its heading and text share the content edge (x=278 desktop, x=30 phone). |

Regression check: no horizontal overflow at 320 px; chips, outcome lines, counts and empty/error states are unchanged from round 1; the ownership panel and the seller-only sections are unchanged for buy-first and consignment; the PLAYORA-owned confirmation wording and the sales-off readiness item remain.

Non-blocking observations (existing shared behaviour, unchanged by this feature):
1. After any publication the shared readiness list keeps the “Before publishing” heading, with Preview and Confirm back at “To do”, because a save resets them. This applies equally to seller listings.
2. “Pause public listing” starts about 4 px right of the neighbouring actions on the phone.
3. Full-page captures overlay the sticky record line and the sidebar background.

**Verdict: PASS — no remaining actionable findings in this scope.** PASS means no issues were found in this review, not that none exist; owner acceptance remains separate.

Limits: Chromium only (Desktop Chrome, Pixel 7), plus the coordinator's captures at 320/390/768/1440; no WebKit, physical devices or screen-reader software (accessibility judged from focus position, roles, live-region text, accessible names and `aria-describedby`). Public card and detail parity was not rendered; it relies on the unchanged public code and the engineer's check that the public JSON has no ownership fields. Synthetic data only.
