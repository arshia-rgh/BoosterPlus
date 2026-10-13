# PLAYORA retention and deletion plan

**Internal draft for owner review — 13 October 2026. Deletion stays disabled.**

This plan provides concrete proposed periods and the handling rules needed before an owner-entered retention policy can be enabled. The numbers are operational proposals, not statements about a statutory minimum or proof that cleanup is running. No financial retention law can be inferred from a competitor's address or an undisclosed PLAYORA operator.

## Proposed schedule

| Category | Proposed period and start | Required treatment |
| --- | --- | --- |
| Eligible profile and preferences | Within 30 days of verified closure request | Remove/anonymize information no longer necessary; honor any shorter legal deadline |
| Ordinary closed support chat/email and attachments | 365 days after last substantive interaction | Erase or anonymize; extract only genuinely required evidence to a restricted case record |
| Closed dispute records | Review at 730 days after final closure | Erase/anonymize unless a documented claim or actual legal requirement needs specified evidence longer |
| Routine security and audit records | 365 days from event or closure of related investigation | Minimize identifiers and remove obsolete diagnostic material; distinguish technical audit integrity from personal-data retention |
| Payment, refund, payout and accepted commercial evidence | Review at 730 days after all relevant obligations settle | Retain only necessary evidence; confirm applicable accounting/tax/claim requirements before disposing of it |
| Credentials and transfer secrets | As soon as the authorized purpose ends; maximum target 30 days after completion absent a specific hold | Revoke access and securely remove unnecessary copies; rotate customer-controlled access where appropriate |
| Rejected or withdrawn account submissions | Up to 365 days after closure for ordinary support; private access removed earlier | Keep only proportionate dispute/fraud evidence; remove public-facing copies after withdrawal |
| Inactive optional alerts and favorites | Until withdrawn/removed or eligible account closure | Stop optional notifications promptly; retain only minimum suppression/consent evidence needed |
| Public reviews | While relevant and lawfully published, reviewed on request | Assess attribution separately; anonymize/remove identifying data when appropriate without falsifying aggregate history |
| Temporary uploads, expired challenges and drafts | Their documented technical expiry, with cleanup verified | Expiry prevents use; it is not evidence that database/file copies were physically erased |

Financial and dispute review periods are not automatically extended by a routine read of a record. A changed obligation or new case must be real and documented. If an actual applicable rule requires longer retention, record the rule, category and next review date. If information is no longer necessary and no rule requires it, do not retain it simply because a software counter has not expired.

## Active matters and holds

An active order, unpaid refund or payout, account transfer, dispute, security investigation or legal obligation can prevent destruction of the evidence needed for that matter. Record the case, purpose, data categories, authorized reviewers and next review date. Review holds at least every 90 days, release them when their basis ends and separate unrelated data that can be erased earlier.

Protecting an accepted order is not a reason to keep reusable game passwords. Store an appropriately limited event or verification record instead whenever it supplies the necessary evidence. A hold must not silently restart a whole-account retention period forever.

## Handling a request now

Requests remain available through support@playoragames.com while self-service deletion is disabled. Verify account control proportionately and identify the relevant independent portal identity. Closing a customer profile does not automatically delete a separate staff account or erase required staff attribution.

Explain whether the request can be completed, which limited records must remain and why, the expected date or review criterion, and how to challenge the decision. Aim to respond within one calendar month and obey shorter applicable deadlines. A proposed 30-day grace period must never delay a request beyond a legal deadline; explain any optional cancellation period clearly.

Account-data access, restriction and corrections must remain possible even when financial evidence has a justified retention requirement. Do not report deletion complete until profile, relevant files, search/public representations and retention exceptions have been checked. Record a minimal receipt without copying the deleted material into it.

## Backups and restoration

There is no qualified off-host backup/recovery destination for the current deployment. Provider snapshots must not be treated as validated application recovery or as proof of deletion. Inventory any existing local snapshots or exports and restrict them to their documented purpose.

For a future backup service, propose a 30-day rolling retention period with encrypted storage, limited restoration access and recorded expiry. Confirm the provider's actual behavior before adopting that number. Deletion decisions and suppression records must be reapplied before restored data returns to normal service. A backup retained for recovery must not be used as an ordinary customer database. Public blockchain records are outside PLAYORA's deletion control.

## Mapping to the existing editor

The editor has numeric fields `financial_days`, `dispute_days`, `audit_days`, `support_days` and `grace_days`. Proposed review values are **730, 730, 365, 365 and 30**, respectively, with `preserve_evidence=true` and `enabled=false`.

These fields currently impose minimum waiting periods before a requested profile erasure, using category record timestamps. They are not maximum retention schedules or independent automatic erasers. Financial/audit evidence is deliberately preserved by the existing workflow. Entering the proposed values cannot implement the category-specific promises above and could hold an entire profile too long. **Do not publish an enabled policy from these values alone.**

Before activation, qualify selective profile anonymization, category/file cleanup, proportionate hold handling, historic agreements and identity separation. Confirm financial/legal periods for the actual operator and implement the corresponding evidence lifecycle. Demonstrate erasure and restoration behavior on synthetic records, including active obligations and an old account with no continuing need. Then publish a dated owner-approved policy and communicate its real behavior.

## Public explanation for the retention editor

Use the following copy only with the correctly implemented, approved policy; it does not make the current feature enabled:

> We keep necessary records for your active orders, payments, disputes, security and applicable legal obligations. Ordinary support material is normally removed or anonymized after 365 days; closed disputes and limited commercial evidence are reviewed after 730 days, subject to documented continuing requirements. Eligible profile information is removed or anonymized within 30 days of a verified closure request, with shorter legal deadlines respected. Specific holds affect only necessary evidence and are reviewed regularly. Closing a profile does not erase independent blockchain records or another portal identity. We explain retained categories, reasons and your review options. Contact support@playoragames.com for a privacy request even when automated deletion is unavailable.

Backup field copy:

> There is currently no qualified off-host backup/recovery service for this deployment. Existing copies must be inventoried and restricted; we do not claim backup erasure or recoverability without evidence. Before adding backups, PLAYORA will document actual retention and expiry, limit restoration access and ensure deletion decisions are reapplied before restored data returns to normal service. Independently maintained blockchain records cannot be erased by PLAYORA.
