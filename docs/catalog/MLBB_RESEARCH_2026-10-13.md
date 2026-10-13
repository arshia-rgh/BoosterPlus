# Mobile Legends catalog research and proposed revision

Status: prepared for qualification; not applied to the live catalog. The owner requested a researched custom form, estimates and fixed packages. Research is a representative market comparison, not an exhaustive list of every boosting website. Prices were observed on 13 October 2026 and can change.

## Market evidence

| Source | Observed pricing/scope | Use in this proposal |
| --- | --- | --- |
| [BoostMLBB](https://boostmlbb.pro/en/) | Epic $0.70/star, Legend $0.80, Mythic $0.90, Honor $1.00, Glory $1.10, Immortal $1.20; hero preference +25%. | Transparent managed-service reference for Epic upward. No copied performance, safety or delivery guarantees. |
| [MLBBBoosting](https://mlbbboosting.com/) | Public calculator rates: Epic $0.30/star, Legend $0.35, Mythic $0.63, Honor $0.735, Glory $0.84, Immortal $0.9975. | Lower comparison; demonstrates meaningful variation between sellers. |
| [Boostroom](https://boostroom.com/product/mlbb-rank-boost) | Epic I → Legend V $2.76; Legend I → Mythic $3.18. | These are single-division transitions, not full rank-tier prices. |
| [Itemku](https://www.itemku.com/en/g/mobile-legends/boosting-service) | Many regional seller offers, roughly $0.09–$0.12 for Epic stars and wider ranges at higher ranks. | Marketplace/regional floor; scope, seller and discounts vary, so not a like-for-like global managed-service quote. |
| [RedX](https://redxgame.com/order/manual-top-up/mobile-legends-joki) | Play-together premium +30%; distinguishes player ID and Zone ID. | Benchmark for together premium and account information separation. |

Additional discovery covered [PlayHub](https://playhub.com/MLBB/rank-boost), [Seoultra](https://seoultra.ph/games/mobile-legends-pa-pilot-service/), [TimeSaver](https://timesaver.gg/mobile-legends), [Skycoach](https://skycoach.gg/mobile-legends-boost), [GetBoost](https://getboost.gg/mobile-legends/ml-hot-offers/mobile-legends-rating), [Kingboost](https://kingboost.net/mobile-legends/mobile-legends-rating/), [Boosthive](https://boosthive.eu/mobile-legends/rank-boost) and [Z2U](https://www.z2u.com/mobile-legends/boosting-service-4-4313). Ambiguous “from” prices were not treated as complete-order quotes. No competitor artwork, customer reviews, safety claims or guarantees are copied.

## Game facts and service choices

- The [official hero catalog](https://www.mobilelegends.com/hero/list) exposes EXP Lane, Gold Lane, Mid Lane, Jungle and Roam alongside hero classes. PLAYORA's existing `role` keys now label these five requested lanes. A hero class is not the same thing as its lane.
- The prepared roster has 133 named hero options. Official visible lane results were checked for all Gold Lane entries, Jungle entries through individual class filters, and the visible newer entries for EXP/Mid/Roam. Older additional mappings are curated service choices; this is not a claim of a complete official current-meta mapping. The catalog editor remains the source of supported combinations.
- Selecting a lane filters heroes. Selecting heroes first infers a unique shared lane; heroes without one shared lane disable/clear the lane restriction. Leaving both empty means unrestricted play. Up to five heroes can be requested.
- Regions and usual play locations use a single-parent relationship. Selecting a location first infers its region; selecting a region filters its locations. These are operational scheduling/matchmaking labels, not a claim that MLBB lets players select an official physical shard. Other/unsure requests require staff review.
- Numeric Zone ID is collected separately after payment. See [Codashop's MLBB ID guidance](https://sg.support.codashop.com/hc/en-us/articles/4402948191247-Where-Can-I-Find-My-Mobile-Legends-User-ID).
- From Mythic onward, customers enter the actual stars shown in game: Mythic 0–24, Honor 25–49, Glory 50–99, Immortal 100+. The new optional `unit_start` preserves historical catalog semantics when absent. Rank cost uses interval widths after subtracting that start; e.g. Glory 62 → 75 costs thirteen Glory stars.
- Delivery is an earliest/latest preferred number of elapsed hours, measured after verified payment and required information/access are ready. Custom requests remain subject to the accepted final quote. Requests below 24 hours, above 250 target stars, or an unknown region require manual estimates.
- Win-rate options remain no preference, range, below, above and exactly 100%. No global success/win-rate guarantee is invented. The accepted order defines measurement, feasibility and the final price.

## Proposed estimate rules

Currency USD; minimum estimate $10. Below Epic, proposed rates are $0.20/star Warrior, $0.25 Elite, $0.30 Master and $0.40 Grandmaster. Epic upward follows the managed-service reference in the table. These are PLAYORA estimates, not claimed competitor averages or measured costs.

Lane selection is free, including automatically inferred lanes. Hero restrictions add 25%; playing together adds 30% to the running total. When both apply, the multiplier is 1.25 × 1.30. Win-rate requests have no automatic premium: staff confirm any adjustment in the final quote. No automatic delivery premium or unverified time promise is added.

Examples without hero/together premiums:

| Goal | Estimate |
| --- | ---: |
| Epic V 0 → Legend V 0 | $17.50 |
| Legend V 0 → Mythic 0 | $20.00 |
| Mythic 0 → Honor 25 | $22.50 |
| Honor 25 → Glory 50 | $25.00 |
| Glory 62 → Glory 75 | $14.30 |
| Honor 40 → Glory 62 | $23.20 |

The prepared configuration includes 16 saved price examples, including minimums, combined premiums, free inferred lane, win-rate requests and manual-review outcomes. Backend tests execute those examples rather than assuming the arithmetic is correct. Provider minimums are a separate live checkout check; a low catalog price does not guarantee availability on the selected payment route.

## Fixed packages

| Package | Fixed price | Scope |
| --- | ---: | --- |
| Existing `package_1` | $50 | Preserve existing Epic II 1 → Mythic 1 account-play offer, 24–72 hours; meaningful variant label and new cover. |
| Legend Climb | $18 | Epic V 0 → Legend V 0, account play. |
| Mythic Climb | $20 | Legend V 0 → Mythic 0, account play. |
| Honor Climb | $23 | Mythic 0 → Honor 25, account play. |

The three new packages propose 48–120 elapsed hours after payment/access readiness. They use unrestricted heroes/lanes and no win-rate target. These commercial commitments remain reviewable draft settings until the owner accepts publication. The customer must match the stated starting rank/stars and can enter only routing/scheduling information. They cannot customize the promised target, win rate, play mode, heroes or delivery window. Existing orders keep their immutable accepted release.

## Safe application

`MLBB_PREPARED_DRAFT.json` deliberately has `base_revision: 0`; the admin importer rejects it unchanged. It was prepared from public release 236, while the owner's saved admin draft was already revision 243. Export the latest saved draft through the normal authenticated editor, merge this approved boost revision with newer owner edits, then set its actual base revision. Preserve current game artwork/layout, non-boost services, seller intake/review settings, and existing package details outside the requested changes. Save, preview price examples and publication readiness, and publish with ordinary recent staff verification. Do not write SQL or bypass authentication to apply catalog content.

The import/export interface is local authoring only, bounded to 256 KB, rejects unsupported fields, checks game/revision, clears the reviewed flag and requires a separate explicit apply-to-unsaved-draft step. Unsaved edits block import/export. Publication and historical release preservation remain unchanged.

## Package artwork

Three original AI-generated, MLBB-inspired fantasy illustrations were generated for this task: emerald armored guardian (`mlbb-legend-climb.webp`), parasol mage (`mlbb-mythic-climb.webp`) and moonlit elf (`mlbb-honor-climb.webp`). They are illustrative fan-style artwork, not official promotional images or guaranteed in-game skins. Each is 800×800 WebP, under 165 KB, with descriptive alt text; the existing package reuses the guardian. Original PNGs remain in the local generated-image store. Existing main game artwork remains the default.

## Checkout diagnosis

One owner-approved unpaid $50 live diagnostic invoice was created successfully and was never paid. This exhausts that one-invoice permission. NOWPayments returned uppercase `USD`/`USDTBSC`; PLAYORA accepted only an exact lowercase price-currency echo and therefore discarded the valid hosted checkout URL as ambiguous. The adapter now compares currency codes case-insensitively while retaining strict amount, attempt ID, response type and provider-URL checks. Optional pay-currency echoes are also checked against the requested asset. Whitespace, wrong assets, wrong amounts and wrong URLs remain rejected.

Primary references: [NOWPayments endpoint description](https://nowpayments.zendesk.com/hc/en-us/articles/21345824322717-API-and-endpoint-description), [official API collection](https://documenter.getpostman.com/view/7907941/S1a32n38), [official Node SDK](https://github.com/NowPaymentsIO/nowpayments-sdk-nodejs). The exact observed provider response and send receipt remain private on the authorized server. No API secrets, hosted invoice URLs or recipient information belong in this document.

Previously ambiguous attempts must retain their duplicate-creation safeguards; do not silently retry their invoice POST or mark them paid. After the fix is deployed, the normal expiration/recovery flow permits a fresh owner-led checkout. No additional invoice, external email or funds test is authorized by this work.
