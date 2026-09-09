# Catalog administration (P03)

The independent Go and React projects now share the pinned OpenAPI catalog contract. SQL migration 5 adds publication storage and migration 6 guards visibility during upgrades/rollbacks. They seed Mobile Legends as an **unpublished, unverified draft**. Run migrations through `make -C backend dev-up` or the documented Cobra migration CLI; application startup never migrates the schema. An explicitly acknowledged development rollback first withdraws game visibility in migration 6; rolling back migration 5 then destroys publication history while retaining drafts. Production uses forward fixes; never use that rollback to recover a published production catalog.

## Staff workflow

Sign in with Google/email and an authenticator, then open **Administration → Catalog editor** at `/admin/catalog`. Administrators and owners can manage catalogs. Customers and boosters cannot access drafts, previews or release history.

1. Create a game with a permanent, unique lowercase slug. Edit its name, description, public image and FAQs.
2. Add reference catalogs and ordered options. Stable keys identify ranks, divisions, heroes, roles, regions and servers. Rank divisions are individual ordered entries; each can define the maximum stars/points within it.
3. Add one or more services. Build fields, defaults, collection stages, conditional visibility/requirements, and combination rules through structured controls. No executable formulas or game-specific code is involved.
4. Add fixed packages, choose their service form, and create explicitly priced variants. Configure required information, eligibility, optional capacity and delivery-hour ranges. Zero capacity means unavailable; omitted capacity means no configured limit.
5. Verify actual catalog data, season rules, availability, commercial prices and customer promises, including any win-rate terms. Check the review acknowledgment and save. Any later edit clears that acknowledgment.
6. Preview the saved revision. The server reports invalid references, cycles, impossible conditions and other publication errors. Valid drafts can also validate ordinary sample answers in the preview, including future collection stages.
7. Publish after recent verification of both authentication factors. If verification is too old, save the draft, use **Profile and security** to verify Google/email and then an authenticator again, and return to publish.

Saving changes never alters the current public release. Publication inserts a new complete snapshot and swaps the game's release pointer in the same transaction as the audit record. A revision conflict preserves the editor's unsaved content; review the error, copy needed changes, then explicitly discard/reload to reconcile. Do not blindly repeat stale mutations. Navigation and page-close guards protect unsaved edits.

Pausing disables new selection validation without hiding the catalog. Archiving removes the game from public pages; historical releases remain available to staff and future order snapshots. Restoring keeps it paused until explicitly resumed. Permanent deletion is offered only for a draft with no published history. Services/packages can be removed from a new draft while historical versions retain them.

## Form and publication contract

- One release pins the complete game, references, service forms, package variants and evaluator identifier. P03 uses `manual-review-v1`; it does not calculate an automated estimate or create a quote. P04 introduces versioned pricing rules.
- Stable keys use lowercase letters, digits and underscores, start with a letter, and contain at most 48 characters. Display order is the array order. Changing a key means introducing a different field/option for future releases; prefer editing the label when its meaning is unchanged.
- Supported inputs: select, radio, multiselect, boolean, integer, decimal, short/long text, rank, and an optional attachment descriptor. Numbers travel as exact decimal strings with at most 12 integer digits and 6 fractional digits; no exponent syntax or floating-point money. Numeric steps are relative to the configured minimum.
- Stages are `estimate`, `order` and `fulfillment`. A dependency may refer only to its own or an earlier stage. Public catalog validation accepts estimate/order input; authenticated draft preview can also exercise ordinary fulfillment fields. Neither endpoint stores the submitted answers or creates an order.
- Conditions support equality, membership, numeric comparisons, and bounded `all`/`any` groups. Boolean values in condition definitions are `true`/`false` strings; boolean answers are actual JSON booleans. Membership matches any selected multiselect option. Numeric equality is exact, so `75.10` equals `75.1`.
- Each condition is limited to depth 4, 32 nodes, 8 children per group and 30 comparison values. Validation bounds logical expansion to 64 branches, 256 visibility prerequisites and 4,096 multiselect representatives. Contradictions, unreachable visibility and excessive complexity prevent publication. These bounds protect request resources; split overly complex configurations into simpler services/rules.
- Hidden answers are absent, including stale values from a previous selection. Defaults apply only when visible. Unknown keys/options, future-stage input, malformed values and unsupported upload references are rejected. Validation messages identify keys without echoing submitted private values.
- Combination rules can reject matching conditions, prevent overlapping multiselect choices, or require forward progress through an ordered rank ladder and its unit limits. Availability/scheduling descriptions are data; timezone-aware scheduling and actual delivery tracking arrive with P08.
- Catalog limits: 20 reference catalogs, 300 options per catalog/field, 12 services, 40 fields and 40 combination rules per service, 40 packages, 20 variants per package and 20 FAQs. Catalog mutations are bounded to 256 KiB through both Go and the SSR proxy; identity mutations retain their 16 KiB limit. Lists have stable cursors (50 game summaries or 20 historical releases per page).
- Package amounts are positive whole minor-unit strings, up to 12 digits. P03 recognizes USD/EUR/GBP as two-decimal pricing currencies; no launch currency or live price has been selected. These are price denominations, not fiat checkout methods. Crypto asset/network conversion and verified payment evidence belong to P07.
- Package capacity is **configured availability**, not a reservation or guaranteed stock count. Transactional order/invoice reservations arrive in P05/P07. Delivery ranges describe expected elapsed hours after fulfillment can begin; they are not scheduled slots or a delivery guarantee.

## Media and unresolved launch inputs

Public game art uses approved, already hosted files under `frontend/public/catalog-assets/`, addressed as `/catalog-assets/<filename>`. A neutral SVG is included. Deploy approved public art with the frontend, then select its path and meaningful alternative text in the editor. Remote URLs, path traversal, arbitrary object-storage keys and executable embeds are rejected. Private media is never placed in this directory. The P06 upload pipeline adds private upload ownership, quarantine/scanning and controlled access; P03 does not provide an asset-upload service.

Attachment fields must remain optional. The renderer explains that uploads are unavailable; the server rejects all attempted attachment values until an authorized upload service exists. Game credentials, site secrets and recovery codes must use the later dedicated secure handoff, never generic fields or notes.

The Mobile Legends draft contains both fulfillment modes, starting/target ranks and stars/points, requested win rate, hero/role restrictions, allowed/excluded heroes, delivery priority, region/server, scheduling preferences, player ID, instructions and optional screenshot. Rank/hero/role/region/server catalogs are deliberately empty and unverified. The owner must supply current season data, actual prices, availability, and the win-rate promise/measurement/exceptions/remedy before publication. No test fixture is seeded into a real development or production catalog as a public offer.

## Verification

`make pre-commit` remains the mandatory repository + backend + frontend gate. Catalog unit tests cover typed conditions, contradictions, bounded evaluation, exact decimals, hidden/default/staged answers, rank progression, multiselect incompatibility, price/configuration boundaries and OpenAPI response conformance. Dedicated TiDB tests cover seed privacy, optimistic edit conflicts, one concurrent publication winner, immutable history, archive/restore, role/MFA/session boundaries, recent verification, CSRF, stale releases, malformed/oversized requests, schema readiness and transaction rollback when auditing fails.

Browser tests use an isolated migrated TiDB schema, real SMTP sign-in and staff MFA. They create and publish a synthetic second game through the same admin controls, reject a cycle, check customer forms and eligibility, preserve old prices while a draft changes, reject stale validation, inspect history and archive the game. Desktop/mobile accessibility and layout checks run against the implemented pages. Synthetic catalog prices exist only in these disposable tests.
