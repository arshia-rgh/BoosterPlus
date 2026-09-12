# Crypto processor decision — 10 September 2026

## Decision and owner preference

Use NOWPayments as the first third-party, hosted crypto checkout adapter. This is the engineering recommendation requested by the owner, based on the comparison below. Booster Plus does not need a country or identity-document form merely to implement this adapter. Provider-required merchant onboarding or transaction review remains with the provider. No provider account has been opened, terms accepted, credentials entered or live payment attempted by this implementation.

The owner prefers third-party crypto processing with minimal onboarding and does not want additional country validation. This changes D02 from an unspecified provider to NOWPayments for implementation. It does not establish a particular operating country, supported customer region, settlement asset/network, approved fees, refund policy or provider acceptance of account resale/boosting. Those live settings must not be fabricated. Provider eligibility cannot be inferred from the developer's timezone.

## Comparison

| Processor | Relevant evidence | Assessment for Booster Plus |
| --- | --- | --- |
| NOWPayments | Hosted invoices, payment status API, signed IPN, optional direct wallet settlement; crypto-only FAQ says verification is generally limited to flagged transactions. Current standard advertised rates are 1% same-currency and 1.5% with conversion; network fees may apply. | Selected technical fit: customer pays one order through hosted checkout; merchant can settle externally. No customer or seller wallet is introduced. |
| OxaPay | Homepage advertises signup without documents; hosted merchant invoices cost 1.5%, white-label 2%, with negotiated rates advertised from 0.4%. Supports callbacks and automatic withdrawal. | Viable alternative. Document-free signup does not establish a guarantee against later reviews or account restrictions. Headline 0.4% is not the standard hosted invoice rate. |
| CoinGate | Published merchant verification includes KYB and relevant owner verification. | Less aligned with the requested onboarding preference. |

Sources checked: [NOWPayments integration guide](https://nowpayments.io/blog/integration-guide), [pricing](https://nowpayments.io/pricing), [crypto-only verification FAQ](https://nowpayments.io/help/security/kyc-aml), [OxaPay homepage and inline terms](https://oxapay.com/), [OxaPay pricing](https://oxapay.com/pricing), and [CoinGate verification explanation](https://coingate.com/glossary/kyc). This comparison is an engineering inference from published capabilities, not an independent security audit or merchant approval.

The current NOWPayments footer links to [FD Transfers terms v1.4.2](https://nowpayments.io/doc/fd-tos.pdf?v=1.4.2) and [AML/KYC policy v1.1](https://nowpayments.io/doc/fd-aml-kyc-policy.pdf?v=1.1). They reserve verification and service restrictions. Older agreements and sandbox pricing pages remain indexed; do not treat their historical country lists or 0.5% fee advertisements as current commercial terms. Confirm the actual merchant account's pricing before publishing fees. No fabricated identity, location or provider information is part of the design.

## Technical evidence and boundaries

The current [official API documentation](https://documenter.getpostman.com/view/7907941/2s93JusNJt), [endpoint help](https://nowpayments.zendesk.com/hc/en-us/articles/21345824322717-API-and-endpoint-description), and [official SDK source](https://github.com/NowPaymentsIO/nowpayments-sdk-nodejs/tree/08e14f901804a08914ff88f4f1da7f1820bf2e08) establish the invoice/payment distinction. Creating a hosted invoice returns an invoice identifier and URL; the payment identifier is separate. Payment discovery/reconciliation must account for an invoice that has not yet produced a payment and for multiple attempts.

The SDK uses HMAC-SHA512 over recursively sorted JSON for IPN signatures. A March 2026 marketing integration article instead says SHA256; follow the API/signature reference and verified fixtures, and qualify actual provider callbacks before launch. Do not copy the article's advice to log full request bodies and headers: it conflicts with Booster Plus's secret/data handling rules.

Provider settings can classify short or wrong-asset deposits as finished. A callback is a notification, never sufficient financial authority. Fetch authoritative payment evidence; verify the invoice/attempt mapping, snapshotted commercial amount/currency, expected asset/network, actual received amount and settlement state before a transactional receipt allocation or fulfillment activation. Never compare an outcome cryptocurrency amount directly with a fiat invoice total. Preserve exact decimals; do not use floating-point arithmetic for financial decisions.

The adapter must bound requests/responses, reject redirects and foreign checkout hosts, keep credentials server-side, use timeouts, validate IPN with constant-time comparison, reject ambiguous JSON, and return generic failures without provider bodies or credentials. Duplicate and out-of-order signals must be safe. No browser redirect, uploaded screenshot or staff-entered transaction hash marks an order paid.

Persist an attempt before invoice creation. API timeouts after a write are ambiguous; do not blindly retry invoice creation or release capacity. Reconcile by known provider identity or an explicit audited recovery workflow. No undocumented provider idempotency guarantee is assumed. Use a durable verified inbox, reference-only work items, authoritative reconciliation, unique receipts, atomic order/coupon/capacity updates and explicit financial exception records in the next P07 stages.

## Implemented transport stage

`backend/internal/payments/nowpayments` implements `New`, `CreateInvoice`, `GetPayment`, and `VerifyWebhook`. Configuration selects fixed sandbox/live hosts, requires HTTPS callback origin, keeps API/IPN keys private and makes no network request during construction. The HTTP client has a 15-second deadline, rejects redirects and reads at most 256 KiB. Local USD/EUR/GBP minor-unit totals become exact JSON numbers; optional invoice echoes must agree with the request. Invoice responses are checked against the selected hosted-checkout origin and the returned invoice ID.

Payment observations preserve exact decimal text and separate price, payment and outcome denominations. A callback verification result contains only the payment ID and canonical signal digest. Numeric IDs outside JavaScript's exact integer range, duplicate keys, prototype-related keys, invalid UTF-8, excessive nesting and invalid signatures fail closed. Four independent JavaScript vectors qualify signature canonicalization, including Unicode, precision and property-order edge cases.

This package is a transport boundary. It is not yet wired to server routes, jobs, database financial records or a checkout UI. The public callback path included in invoice requests will be registered with the durable inbox stage before invoice creation can be enabled. There is no production command that bypasses those missing stages, and passing offline fixture tests is not a claim of provider sandbox acceptance.

## Activation and remaining P07 work

Keep checkout unavailable until merchant secrets, supported assets/networks, settlement settings, fee disclosures, policy content and real sandbox qualification are ready. Secrets belong in local environment/secret storage, never chat or Git. Hosted checkout must show exact asset/network and amount instructions; USD/EUR/GBP catalog totals already use integer minor units and remain immutable.

Refunds and seller payouts need their own approval, recipient verification, evidence, limits and reconciliation. They do not create spendable balances. Sandbox acceptance, controlled live payment/refund qualification and business acceptance are still required before public sales. Selecting a provider is not completion of P07 or a production-readiness claim.


R05 now connects the adapter to durable checkout attempts, authenticated reconciliation, receipts, allocations and finance screens; see [payment operations](payments.md). Local fixture verification does not qualify the merchant: sandbox authenticated requests currently return HTTP 403, and external callback qualification remains pending. Checkout stays disabled.
