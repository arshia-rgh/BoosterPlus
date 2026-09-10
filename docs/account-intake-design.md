# Private account intake and review

P09 begins with account submissions before a commercial agreement. This stage lets verified customers save account information, submit ownership declarations, exchange private evidence with administrators, answer clarification, and withdraw. Review approval records **approved pending terms**. It creates no purchase contract, public listing, inventory reservation, transfer instruction, wallet balance, or payout.

## Administrator-declared intake

An optional intake form belongs to each game's versioned catalog configuration. It uses the existing typed field, condition, reference and combination-rule evaluator. Intake-only games can be published. All intake fields use the order stage; attachment and credential field types are unavailable. Ownership screenshots use the private scanned-media conversation. A future accepted-transfer flow must use the encrypted credential service with its own authorization rules.

Creating a draft binds the release ID the seller saw and copies the immutable form into the private submission. New drafts require a currently published, unpaused game with intake enabled. Pausing, archiving, replacing or removing intake stops new drafts; existing drafts may still be edited/submitted against their saved form for administrator review. This preserves the seller's submitted context without offering a commercial commitment. A committed create retry returns its original draft even if the catalog later changes.

Draft validation permits missing required answers and defers combination rules. It still rejects unknown fields, incorrect types, invalid options and oversized values; hidden values are removed. Submission applies all required/conditional fields and combination rules and requires both ordinary ownership/control information and an explicit declaration of authority. The declaration is a seller assertion, not independent proof of ownership or transferability.

## Private lifecycle

| Current state | Seller actions | Administrator actions |
| --- | --- | --- |
| Draft | Save, submit, withdraw | Read only |
| Submitted | Withdraw | Request information, reject, approve review pending terms |
| More information requested | Save, resubmit, withdraw | Reject |
| Review approved pending terms | Withdraw | Request information, reject |
| Rejected or withdrawn | Read history | Read history |

Save and submit are separate explicit actions. The frontend disables submission of unsaved changes. Administrators must supply a seller-visible reason and have recent primary and authenticator verification for each review decision. The backend rechecks live authority in the same transaction as the change. State transitions require the observed version, so competing decisions cannot silently overwrite one another. Rejected and withdrawn submissions cannot be reopened by these endpoints.

The lifecycle history records versions, actions, roles, times and review reasons. It does not duplicate private form values or provide a revision-by-revision answer archive. A future commercial offer must snapshot the exact approved account attributes and terms independently before acceptance.

## Conversations and evidence

Draft creation atomically creates a unique seller–administrator conversation. It has its own submission ID and cannot be linked as an order or enabled for booster sharing. The seller sees public messages in this private conversation; internal administrator notes remain staff-only. The word public on a message audience means visible to members of that conversation, never a publicly accessible listing.

Existing media safeguards apply: isolated private objects, bounded image decoding and normalization, fresh ClamAV scanning, uploader/audience binding and short session-bound downloads with current membership checks. Ordinary review screenshots cannot become fulfillment proof or public listing assets. Public resale images will require a separate explicit redaction/publication workflow.

Any verified account can act as a seller for its own submissions. Staff accounts still require their usual authenticator sign-in. Administrators can inspect the review queue and private drafts; boosters have no access to another seller's submission, conversation or images.

## Consistency and delivery

SQL migration 16 owns the two intake tables and the unique conversation scope. Ent generates queries only. Each mutation uses the existing identity authorization fence and transaction retries. A canonical UUID request key and HMAC payload binding deduplicate draft creation; mismatched retries conflict. Each account may have at most 20 active submissions. Lists use descending creation time/ID cursors, at most 50 entries per page; histories use ascending version cursors, at most 50 events.

Draft/thread creation, lifecycle events and audit writes are atomic. Administrator decisions create generic seller activity notices and reference-only outbox jobs. Seller submission/withdrawal notifies an assigned review administrator if one exists. Unassigned work appears in the review queue; no broadcast mailing is inferred. Email delivery rechecks current ownership, suspension, preferences, read state and notice age. SMTP remains at least once after ambiguous remote acceptance.

HTTP endpoints use existing passwordless sessions, no-store responses, CSRF/origin protection, body limits and persistent rate limits. Strict JSON decoding rejects unknown/trailing fields. Responses omit seller email, actor IDs and storage/provider details. Review text and ownership information must never be included in logs or generic notification email.

## Remaining resale work

Commercial offers and explicit seller acceptance, public listings, unique inventory reservations, verified buyer settlement, secure transfer, disputes, refunds, and direct seller payouts remain in scope. Their dependent flows require the chosen purchase/consignment arrangement, commercial/payout terms, crypto provider and operating policy. Review approval must not be repurposed as settlement evidence. Production qualification, retention/privacy operations and live provider tests remain separate release requirements.
