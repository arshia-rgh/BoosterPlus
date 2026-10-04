# Policy research and implementation notes

Research date:4 October 2026. Internal drafting notes; not customer-facing policy. Primary sources are references for comparison, not copied agreements or evidence that PLAYORA already follows them.

## Findings applied

| Primary source | Finding | PLAYORA decision |
| --- | --- | --- |
| [Eldorado refund policy](https://support.eldorado.gg/en/articles/8409020-refund-and-return-policy) | Distinguishes non-delivery, missing access, reclamation, description mismatch and buyer-caused bans; uses its own balance/dispute arrangements. | Use clear failure categories, but do not import a wallet, escrow model, short warranty window or exclusions inconsistent with the owner's broader guarantee. |
| [PlayerAuctions after-sale protection](https://support.playerauctions.com/hc/en-us/articles/4402691743257-How-does-after-sale-protection-work) | Separates reclamation/previous-owner conduct from buyer-caused harm and relies on evidence review. | Require causal evidence and explain decisions. Do not copy paid-protection tiers, reseller warranty expiry or narrower coverage. |
| [Boosting.pro terms](https://boosting.pro/terms-of-use/) | Separates order start, cryptocurrency confirmation and publisher-account risk; contains store-credit terms. | Clarify fulfillment/payment milestones and risks. Reject mandatory store credit and exclusions that would defeat PLAYORA's full refund. The guessed standalone refund-policy URL was inaccessible; it is not claimed as reviewed. |
| [NOWPayments help](https://nowpayments.io/help) | Refunds can incur network costs. | PLAYORA must fund outgoing fees separately to honor a 100% refund; provider fees do not make the customer guarantee disappear. |
| [NOWPayments global coverage explanation](https://nowpayments.io/help/about-nowpayments/about) | Global coverage remains subject to prohibited jurisdictions. | Worldwide positioning with lawful/provider availability, not “every country without restrictions.” |
| [NOWPayments KYC/AML explanation](https://nowpayments.io/help/security/kyc-aml/how-are-my-documents-stored-after-the-kyc-aml-procedure) | Flagged transactions may be held for verification. | No unconditional no-KYC claim, even though PLAYORA sign-up is passwordless and uses no identity-document workflow. |
| [Riot account protection guidance](https://support-leagueoflegends.riotgames.com/hc/en-us/articles/4402981557267-Protecting-Your-Account) | Riot identifies boosting, trading and sharing as terms violations. | Game help must disclose publisher restrictions; no “safe from bans” claim. A non-buyer-caused ban remains covered by the owner's stated refund policy. |
| [Blizzard EULA](https://www.blizzard.com/en-gb/legal/2c72a35c-bf1b-4ae6-99ec-80624e1b429c/blizzard-end-user-license-agreement) | Publisher licensing and account conditions remain separate from a third-party service agreement. | Do not imply publisher endorsement or that a PLAYORA sale changes publisher rights. Verify the current applicable game terms when publishing each offering. |
| [EU withdrawal guidance](https://europa.eu/youreurope/citizens/consumers/shopping/returns/index_en.htm) | Online services/content can have withdrawal rights and specific exceptions. | No “crypto is irreversible, therefore no refunds” clause. Separate required early-performance consent must be recorded where applicable. |
| [European Commission marketplace enforcement](https://commission.europa.eu/topics/consumers/consumer-rights-and-complaints/enforcement-consumer-protection/coordinated-actions/market-places-and-digital-services_en) | Trader identity/address transparency can be required. | Location-neutral marketing is not a replacement for legally required operator disclosures. Applicability is not determined from the server location. |
| [ICO transparency](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/) and [storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/) | Notices should explain actual processing; retention must be purpose-based, justified and reviewed. UK guidance is under review. | Describe the implemented data flows; selected operational retention periods are proposals, not universal statutory requirements or claims that cleanup is active. |
| [Google privacy policy](https://policies.google.com/privacy) | Google describes its independent processing. | Link its policy and accurately describe the existing OpenID/email-only integration. |

Research did not use unrelated `nowpayments.org` pages as authority for the configured `nowpayments.io` provider. A fetched provider terms PDF failed to render; coverage/verification statements above rely on successfully retrieved official help. Search snippets and inaccessible pages do not establish a complete contract review.

## Proposed policies versus actual implementation

| Promise | Qualification or implementation required before publication |
| --- | --- |
|24/7 support and all-service fulfillment |Owner-supplied business commitment. Confirm actual shift coverage, handoff/escalation and provider-outage notices. Availability testing cannot prove human staffing. |
|Package/order-specific WR and other conditions |Require explicit immutable fields for match scope, metric, target, exclusions, deadline type and proof. Validate quote revisions cannot weaken an accepted guarantee. |
|Full affected-order refund after incomplete performance |Verify admin policies cannot substitute a partial-performance deduction, forced retry, replacement or credit. Test fixed/custom boost, manual shop and account cases. |
|Full original-asset amount; PLAYORA pays outgoing fee |Verify receipt-allocation mapping, multi-payment/refund arithmetic and provider sender-paid-fee support. Maintain a merchant-funded fee reserve. If the provider cannot return the full net amount through an approved route, resolve that before selling; never relabel a short payment “100%.” |
|Post-completion account protection |Check current case opening/appeal windows and refund approval rules. Preserve an actionable support route after order completion; no automatic deadline may silently void the broader promise. |
|Buyer fault needs causal evidence |Capture a reasoned finding and relevant evidence, distinct from a general publisher-rule warning. Avoid automatic denial for ordinary play, password changes or incident timing alone. |
|Buyer refund independent of seller recovery |Test both buy-first and consignment offers, due/paid seller obligations and reconciliation. Staff must not delay a valid buyer refund because recoupment is unresolved. |
|Refund/appeal timing targets |Monitor case queues, staff handoffs, verified address collection and provider holds; do not represent target dates as observed performance. |
|Age 18+ |Reflect eligibility in acceptance/registration copy and operational handling without claiming a government-ID check exists. |
|Privacy response and retention schedule |Map 12-month support/audit and 24-month closed-case defaults to explicit periods/start events. Resolve financial minimums; add needed mailbox/vault/temp-file cleanup and hold reviews. Unit interpretation (calendar months versus days) must be explicit in published settings. |
|Existing deletion disabled |Do not enable erasure merely because a notice has been drafted. Required explicit owner policy, off-host privacy journal and runtime qualification still apply. Support must handle lawful rights requests separately. |
|Worldwide service |Review actually supported game regions and provider eligibility. Do not fabricate jurisdiction-blocking implementation or claim restrictions have been checked for every country. |
|Per-game/service help |Use the help draft on actual supported game/service surfaces. Seed and review content before claiming an article exists; never invent URLs or new services. |
|No advertising data sale/tracking |Validate the deployed dependency/configuration inventory and operator practice, not just current source-code search. |

## Review scenarios for the commercial wording

- A fixed package promises a hero restriction; rank is reached using another hero: full order refund, not only an option surcharge.
- A custom quote accepts a WR condition and it is missed despite some progress: full order refund. A pre-acceptance estimate alone is not the accepted condition.
- A guaranteed delivery deadline is missed: the promise applies. An estimate is clearly distinguished and never quietly upgraded/downgraded later.
- A shop order is partially supplied: full affected-order refund when agreed delivery is not fulfilled, without requiring an unwanted substitute.
- A previous owner reclaims a sold account after the buyer changed its password as instructed: do not void protection just for that security step.
- A publisher imposes a ban for a transfer or prior-owner behavior, and the buyer did not cause it: eligible full account refund after review.
- A buyer independently uses prohibited automation and evidence connects it to the ban: explain the causal finding and appeal route; do not misclassify an unrelated late ban.
- The order is completed and a claim arises later: support remains accessible and the stated protection is not silently time-barred by application defaults.
- An eligible100-unit refund carries a provider fee: the customer receives 100 units, with PLAYORA funding the return fee separately; no “99 units, fully refunded” state.
- Multiple receipts, prior partial refund and overpayment coexist: account for each separately without double paying or erasing an excess-funds obligation.
- A consignment seller was already paid: preserve the buyer obligation and manage seller recoupment separately.
- An optional retention deadline arrives during a specific dispute: preserve only justified evidence, record the hold, review it and avoid deleting financial/claim evidence with a blanket cascade.

These scenarios are a qualification backlog, not results. This turn changes drafts only; it does not implement new refund logic, enable erasure, send messages, move funds or publish policies.
