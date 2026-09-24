# DI00 — shop and editorial flow addendum

25 September 2026 · Implementation contract and bounded design extension. All examples in the [interactive addendum](design/addendum.html) are fictional, memory-only and disconnected from authentication, provider APIs and real inventory. The existing accepted atlas remains unchanged. Manual staff fulfillment and staff-managed articles are owner-confirmed.

## View inventory and anatomy

| ID | View / proposed route | Main content, action and return |
| --- | --- | --- |
| SH01 | Game shop `/games/:slug/shop` | Retained hero/stats; pinned shop offers; search/type/region filter; product cards with contents, supported region, published price and availability. View product; Back to choose service. Empty/no-match/unavailable are distinct. |
| SH02 | Product `/games/:slug/shop/:product` | Contents, variant/quantity, compatibility, delivery requirements and accepted-policy version; one purchase CTA. Unavailable variant cannot proceed; valid selections retained on Back. No credentials in product browsing. |
| SH03 | Recipient / same product `?step=recipient` | Only configured necessary recipient fields, clear platform/server labels and privacy help; persistent chosen product summary. Validate server-side; never silently normalize a different recipient. Back to options and Review. |
| SH04 | Purchase review / `?step=review` | Exact product/options/recipient mask/quantity/total, currency and included/excluded fees, delivery and cancellation terms; explicit acceptance. Sign in returns to this exact game/product draft. Create order then existing payment section; price/version/stock changes return for review. |
| SH05 | Customer shop order `/orders/:id` | Persistent order ID/status; Overview, Delivery, Messages, Payment, Help local sections. Expected delivery is an agreed estimate, not an invented countdown. Evidence and next action; unpaid actions blocked. View exact owned payment/support/case. |
| SH06 | Admin products `/admin/shop` | Search/game/status/availability filters, named editor links, history and Create product. Empty catalog has a clear first-draft action. |
| SH07 | Product editor `/admin/shop/:id` | Basics, variants, eligibility/recipient schema, availability, terms, promotion and media; draft save, version history, labeled customer preview, explicit publish/pause. Missing terms/rights or invalid prices block publication. |
| SH08 | Staff shop queue `/admin/shop/orders` | Paid, ready, claimed, held and delivery-review filters; assigned staff, last update and exact record links. Unpaid exceptions are visible but never actionable as fulfillment. |
| SH09 | Staff shop record `/admin/orders/:id` | Persistent record sections: Overview, Delivery, Messages, Payment, Help/audit. Atomic claim, recipient access, delivery evidence, hold/release, submit delivery and review completion. Duplicate claim or stale version refreshes safely. |
| NW01 | News index `/games/:slug/news` | Retained game shell; Updates/Patches/Guides and search; editorial cards with dated attribution and patch/version context. No article pricing/stock. No-result clears filters; unpublished articles never appear. |
| NW02 | Article `/games/:slug/news/:article` | Title/summary, author/source, published and updated dates, patch/game context, readable body, optional contents, accessible tables/media and related articles. Back to the same filtered News list. |
| NW03 | Admin articles `/admin/news` | Draft/scheduled/published/unpublished/archive filters, game/type/search, update and author; named editor links and create. |
| NW04 | Editor `/admin/news/:id` | Title/slug/game/type/summary/body/hero/alt/source metadata; explicit dirty/saving/saved/conflict state; Save draft then Preview. No arbitrary scripts/HTML embeds. |
| NW05 | Staff preview / same editor `?section=preview` | Clearly labeled unpublished preview inside admin, matching public content width; revision identity and Back to editor retaining edits. Preview never publishes. |
| NW06 | Publication / same editor `?section=publication` | Exact revision, publish now or schedule with explicit timezone, validity checklist and confirmation; history, correction and unpublish with consequence. Failed schedule/retry and concurrent revision remain recoverable. |

These 15 addendum views supplement the 115 accepted views. Their stable IDs are separate from the historical atlas, and reuse existing identity, payment, support, refund, media and privacy views. They do not imply 15 independent route modules.

## Shop transaction and fulfillment states

Inventory reservations, payment state, fulfillment state and service cases are separate records; a single status label must not erase one dimension. Show the most actionable condition with detail available locally.

| Transition | Actor and mandatory guard | Failure / recovery |
| --- | --- | --- |
| Published product → draft review | Public/customer; published version, enabled game/capability, permitted variant | Missing/paused/sold out gives explanation and Back; no checkout |
| Review → unpaid reserved order | Customer; accepted current snapshot, valid recipient, terms present, available capacity; idempotent request | Price/version mismatch requires new acceptance; concurrent stock loss retains safe draft |
| Unpaid → invoice | Customer; unexpired reservation or successfully renewed capacity, payments enabled | Pause/provider error stays unpaid; retry reuses attempt safely |
| Invoice → verified settlement | Provider evidence/reconciliation only; idempotent verification | Late payment after capacity release enters a paid exception; staff resolves availability or case/refund, never silently overcommits |
| Verified paid → ready | System; eligible snapshot and inventory allocation | Missing recipient or impossible delivery moves to held/needs details; customer sees specific required action |
| Ready → processing | Admin staff; fresh authorization and atomic assignment/claim with expected version | Other staff claim shows current assignee; no duplicate delivery |
| Processing → on hold → processing | Authorized staff; reason/next step and appropriate allocation | Keep original payment/terms; changes affecting contract require explicit customer agreement |
| Processing → delivery submitted | Assigned staff; configured required evidence and delivery fields | Upload/scanning/validation failure cannot be bypassed by a completion click |
| Delivery submitted → completed | Authorized admin review; evidence passes configured policy, customer notified | Return for correction preserves evidence/history. No invented elapsed-time auto-completion |
| Any eligible order → case | Owner customer or authorized admin; allowed case rules | Opening case preserves payment/delivery history; cancellation/refund eligibility is explicit, not implied by button |
| Approved case → refund workflow | Existing authorized finance path and separately activated outgoing transfers | Pending/failed/partial transfer remains explicit; never mark completed from a browser response |

Reservation duration is required product/stock policy, bounded by server configuration and shown before payment. There is no default commercial duration in this prototype. Never extend a reservation indefinitely on every browser refresh. Expiry releases capacity atomically once; a concurrent payment/expiry race becomes a verified allocation or a resolvable paid exception. Inventory decreases and fulfillment claims require transaction-level constraints.

Staff review defines completion in the initial manual-delivery workflow; buyer “Report a problem” stays available under the published case policy. No automatic buyer acceptance, no copied account-sale secret-reveal flow, and no booster access to shop recipient data. Review eligibility is configured per product policy and completed order; until approved/configured, new shop review solicitation stays disabled.

## Editorial state and publication contract

Draft → saved revision → private preview → published now or scheduled. A published article can have an independent unpublished working revision. Publishing a correction atomically swaps the public revision, records an updated timestamp and preserves history. Unpublish removes public reader/search/sitemap access and invalidates caches; the editor retains the draft/history. Archive is an editorial storage state, not proof that a public revision disappeared. Scheduled jobs check current version/state, timezone-derived UTC instant and permission/policy; cancellation/rescheduling invalidates the old job idempotently.

Content uses a constrained document format with validated links/media. Heading levels, image alt text, table captions and source/author attribution are editor fields. Slug collisions produce field errors; changing a published slug creates a same-game approved redirect without exposing unpublished versions. Deleting/unpublishing has a public unavailable page with a Back to news action. Private preview cannot be indexed, shared anonymously, or returned from a public cache.

## Complete journeys and branches

| ID | Journey | Required completion and exception coverage |
| --- | --- | --- |
| SN01 | SH01 → SH02 → SH03 → SH04 → existing scoped login/payment → SH05; SH08 → SH09 → SH05 | Exact accepted order, verified funds, atomic claim, validated delivery, review completion and customer receipt. Invalid recipient, variant/stock/price change, auth return and paused checkout covered. |
| SN02 | Invoice expired/capacity released → late verified funds → SH09 exception → SH05 | Reallocate if actually available or resolve through existing case/refund. Customer never sees fictitious fulfillment; duplicate webhook/claim/refund cannot double effect. |
| SN03 | SH05 Help → existing case/admin finance → SH05 Payment | Delivery issue, evidence, approved/declined case, refund pending/partial/failure and final receipt. No instant refund promise. |
| SN04 | SH06 → SH07 → preview → publish → SH01 | Missing commercial fields/media/recipient schema block publishing; concurrent edits preserve safe draft; pause removes new purchase without abandoning paid orders. |
| SN05 | NW03 → NW04 → NW05 → NW06 → NW01 → NW02 | Sanitized saved revision, explicit publication, searchable public result, retained game context. Editor conflict, missing metadata and unauthorized preview have recovery. |
| SN06 | NW06 schedule/correct/unpublish → NW01/NW02 | Durable scheduled execution, cancelled/retried job idempotency, correction history, valid redirect and complete cache/search removal; no draft leakage. |

## Interaction, responsive and privacy acceptance

- Public addendum views retain game art/stats and small service Back. Shop order destinations deliberately enter My account. Staff stays in admin, including all previews; no nav action crosses role unnoticed.
- On narrow widths summaries stack before the final submit; forms have visible labels, inline errors and a focused summary. Product details and article tables may scroll in labeled bounded regions; the page itself never horizontally overflows. One semantic page heading; nested game content uses subordinate headings.
- All buttons explain the concrete operation. “View order PL-S104” names the record; local sections preserve record identity. Form validation never discards safe fields; price/state changes require fresh review. Save errors preserve editor content; navigating away from dirty editors requires an explicit discard choice.
- Use the current green design tokens and restrained motion; no aggressive purchase urgency. Public imagery has attribution/provenance; failures preserve layout and readable text. Reduced motion shows all content without requiring animation.
- Data is scoped by portal/user/record. Recipient details are masked outside authorized delivery contexts and included in retention/export decisions. No account credentials in news/shop mock data; no actual funds, login or API calls in the design addendum.

## Inputs before public publication

Product family/region/platform, price/currency, necessary recipient fields, stock source, reservation duration, delivery estimate, cancellation/refund terms and review policy require explicit configuration. Sample products and article facts cannot be published as real catalog/content. Staff-managed publishing and manual fulfillment are already approved; these requirements do not block the shared platform from being implemented with isolated fixtures. Final owner review includes these added flows before activation.
