# Direct crypto checkout

R05 implements direct order checkout, durable financial evidence and staff reconciliation. It introduces no customer or seller wallet. The finance screen is `/admin/finance`; customer receipts and checkout are within each order. Source belongs to the backend and frontend projects; production runtime configuration remains under `production/`.

## Merchant configuration

Keep the four live merchant credentials in ignored, mode-0600 host configuration, never `.env.example`. The API destination is fixed to `https://api.nowpayments.io/v1`; sandbox is not supported. Remove the obsolete `NOWPAYMENTS_MODE` setting (a stale sandbox value is rejected at startup). `NOWPAYMENTS_ACCOUNT_ID` is a locally generated, stable UUID identifying the live merchant. Retain it across key rotations; use a new UUID for a different merchant. Historical sandbox records keep their original namespace and cannot be matched to live records.

Set `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_EMAIL` and `NOWPAYMENTS_PASSWORD`. Payment discovery requires the dashboard login to obtain a short-lived bearer token in addition to the API key. Tokens are kept only in memory, with fixed HTTPS destinations, bounded bodies, deadlines and refused redirects. See the [official authentication reference](https://github.com/NowPaymentsIO/nowpayments-sdk-nodejs#authentication-and-automatic-jwt-refresh).

`PAYMENTS_ENABLED=false` pauses new checkout. Orders remain unpaid; it neither skips the payment step nor grants fulfillment. Existing financial records continue to reconcile, including in local HTTP development. Both store and adapter refuse invoice creation while disabled.

`PAYMENTS_ENABLED=true` requires complete live configuration, public HTTPS `PUBLIC_ORIGIN`, a published payment policy and matching authenticated provider evidence before fulfillment. Missing or invalid credentials fail startup; provider errors never fall back to simulated success. `PAYOUTS_ENABLED` separately controls owner-approved real outgoing transfers and defaults false, allowing refunds while new sales are paused. Local Compose forwards protected configuration to API and worker only; the production frontend validator rejects merchant credentials.

The callback is `PUBLIC_ORIGIN` plus `/api/v1/webhooks/payments/nowpayments`. Invoice creation supplies that callback explicitly. Configure the same public URL in the provider dashboard for dashboard-triggered IPNs. An empty dashboard URL does not make localhost reachable. The temporary test endpoint and signed provider callback qualification remain pending; no public tunnel is started implicitly by `make dev-up`.

For live IPN retry settings, five recurrent notifications one minute apart are a recommended starting point, not a provider requirement. Duplicates are safe. The provider documents a three-second callback deadline; the handler budgets two seconds for durable receipt and returns an error if persistence fails. See [IPN setup](https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup). Only HMAC-authenticated notices are accepted; customer sessions/CSRF are deliberately not required on the callback. Customer/staff mutations retain normal identity, CSRF and rate limits.

### PLAYORA dashboard values — 8 October 2026

In NOWPayments **Payment Settings → Instant Payment Notifications**, use:

| Setting | Value |
| --- | --- |
| Webhook format | **Classic way** |
| IPN callback URL | `https://playoragames.com/api/v1/webhooks/payments/nowpayments` |
| Number of recurrent notifications | `5` |
| Timeout / interval | `1 minute` (`60` if the field is explicitly in seconds) |
| IPN secret | Keep the existing secret matching private server configuration |

The callback remains on the customer host when admin and booster move to their
own subdomains. Invoice creation already supplies this exact URL. The retry
values are PLAYORA's recommendation; the provider describes these as retries
after callback-processing errors, not scheduled customer emails. Do not put a
secret into the URL or rotate the secret merely to set the URL.

Classic way matches the existing independently signed webhook fixtures, with
numeric IDs/amounts and mixed JSON values. The parser retains JSON types while
checking HMAC; it does not mark an order paid from callback amounts. The focused
webhook signature, malformed-input and deduplication tests were rerun successfully
after the owner asked about this dashboard option. All-Strings is not required
for this configuration; no backend code or credential changes were made.
The owner subsequently confirmed completing these NOWPayments dashboard settings.
That is owner-reported configuration completion, not verified callback delivery
or a funded transaction result.

The owner then narrowed the initial payment route to **USDT on BNB Smart Chain
(BEP-20)** only. In the PLAYORA policy editor, use asset code `usdtbsc`, network
`bsc` and display label `USDT — BNB Smart Chain (BEP-20)`. This supersedes the
earlier TRON/Solana selection for new publication. The local draft was updated;
all approved refund, compensation, fee and dispute terms remain unchanged.
Asset codes can be checked through the provider's
[supported-coins list](https://nowpayments.io/supported-coins) and authenticated
`GET /v1/full-currencies` or merchant-enabled coin endpoints documented in its
[API reference](https://nowpayments.zendesk.com/hc/en-us/articles/21345824322717-API-and-endpoint-description).
Changing this local draft does not publish it or alter merchant wallet settings.

The owner subsequently authorized saving and publishing this exact starter
policy through the admin panel and completed normal sign-in/MFA in the in-app
browser. The policy was saved as revision2, previewed and published as revision3,
agreement `e1957da6-a9dd-4e66-b78b-4cd2ed4df190`. The editor confirmed **Payment
policy published** with checkout enabled and outgoing payments disabled. The
submitted policy exactly matches the local document; all observed text/number
fields also match. Private UI receipt and screenshot are under
`.cache/contact138/payment-policy-published/`. Later revisions remain editable
and create new agreements; existing accepted orders keep their saved terms.
No invoice, transfer, provider wallet change or direct database write occurred.
One subsequent read-only `GET /v1/merchant/coins` check also confirmed `usdtbsc`
in this merchant's enabled-currency list. That response does not expose receiving
wallet details; wallet presence is unverified, not reported missing. The earlier
full-currencies check confirms network `bsc` and payment availability.

Read-only production checks on 8 October found `PAYMENTS_ENABLED=true` and
`PAYOUTS_ENABLED=false` in both API and worker, with all required provider
credential fields present. At that initial check there was **no published
payment policy**; the later authenticated publication above resolves that
missing-policy prerequisite. The [starter policy](legal/PAYMENT_POLICY_DRAFT.json)
is now published through **Admin → Finance → Payment policy**. Publication does
not qualify a successful live invoice, signed provider callback or funds transfer.
Those still require the owner's controlled manual test.

## Financial behavior

- A published policy snapshot, route and accepted order contract bind each attempt. Policy publishing and manual reconciliation require recent staff factors. Repeated checkout requests reuse the single active attempt; a route or policy change cannot silently modify it.
- Invoice creation is claimed before the provider call. An ambiguous response or interrupted claim creates an exception. Queue retries never repeat that financial POST. Authenticated discovery repairs missing callback references and ambiguous invoice correlation when a payment appears.
- Callback status and browser redirects never settle an order. Every payment ID is read from the authenticated provider API. Leases and versions fence stale concurrent observations; observations remain immutable.
- Fiat minor units and crypto decimal receipts remain separate and exact. Each contract has at most one allocation. Settlement atomically queues the order and redeems a held coupon. Extra receipts, overpayments, wrong routes, inconsistent evidence and unknown references appear in finance review.
- Confirmations are not final settlement. Timely detected funds may finish after the local window. Funds first observed after the deadline require timing review. Expired unused attempts retire the unpaid contract and release held coupon/capacity; a later deposit cannot reactivate it. Starting over uses current-catalog reorder and new acceptance, rather than reusing an expired payment link.
- A provider reversal preserves original receipt/allocation history and holds work. No staff control can invent a paid state. R06 adds customer cases and outgoing refunds; an R05 exception is not an executed refund.

## Verification and qualification limits

`make pre-commit` includes both project gates, root security checks and isolated deployment checks. The TiDB integration suite covers ownership, strict input, CSRF, duplicate/forged/missed callbacks, cancellation races, exact/partial/extra/wrong-route funds, expiry/reversal, unavailable inbox storage and stale observation fencing. Browser tests use a compiled test-only provider and real SQL/queue/HTTP services; there is no payment simulation route in the runtime app.

On 12 September 2026 the owner supplied a support response stating that NOWPayments sandbox is no longer available and recommending near-minimum controlled production tests. This supersedes earlier sandbox acceptance requirements. The owner replaced the protected credentials with live credentials and requested production-only integration. The owner subsequently withdrew the proposed bypass: the payment switch only pauses checkout.

Authentication (`/auth`), merchant coin configuration (`/merchant/coins`), and a read-only estimate (`/estimate`) each returned HTTP 200 with their expected response fields using the live configuration. Only status and field-presence evidence was printed; credentials, tokens and account response bodies were not logged. No invoice or outgoing transfer was created. These checks establish live credential connectivity, not financial qualification. Actual signed callbacks, merchant-enabled routes and controlled funded payment/refund/payout behavior remain to be qualified before public paid launch. Use amounts near the current route-specific minimum in the [provider status page](https://nowpayments.io/status-page); fixture success cannot replace that check. R10/R11 release and live-launch approval remain deferred.

## Service cases and refunds (R06)

The order's service-review panel and the open-case queue in `/admin/finance` keep cancellation, partial-work, missed-appointment and missed-target decisions separate from money movement. Published checkout policies now include operator-entered remedy text and dispute/appeal windows. Each checkout and case retains the accepted snapshot. Historical agreements without that snapshot require explicit customer acceptance of a resolution; staff cannot manufacture a retroactive appeal deadline.

Opening a case atomically holds active work. Staff decisions can retain an outcome, continue service, arrange rework or cancel service. Customers can reply, appeal within the agreed limits, or accept a resolution; staff finalization must wait for the applicable appeal window. Pending refunds block closure. Case holds prevent work progression, completion, new bookings and credential revelation. Cancellation releases capacity, cancels outstanding bookings and deletes stored game-access secrets; it cannot revoke credentials from a game provider or erase earlier access.

Refund proposals reserve exact crypto amounts against a confirmed receipt. All outstanding proposals and failed/uncertain attempts count against the cumulative limit. Customers confirm the destination address, asset/network, memo/tag and terms after recent primary authentication. Owners need recent primary authentication and authenticator verification to approve a precise revision. Unissued proposals can be cancelled; a possibly issued attempt retains its reserve. Retry of an authenticated failure requires fresh matching provider evidence and new owner approval, never an automatic repeated POST. Issuance and provider authorization also recheck every earlier attempt; a changed or stale failure blocks the retry, and a late confirmation remains visible for financial review.

The outgoing worker validates the address, claims the attempt before a single financial POST, and reconciles the provider reference independently. An owner submits a current provider authenticator code only after a matching authoritative read; codes are cleared from the UI and never persisted or queued. API acceptance or verification does not establish completion. Only matched authenticated outgoing status does. Ambiguous writes, conflicting evidence and discovered unknown transfers remain visible for finance review. Workers continue read-only reconciliation when outgoing creation is paused.

These implementations use controlled fixtures for fault and browser tests. A funded live payment, signed public callback, actual provider transfer and real destination receipt have not yet been qualified. The provider's supported merchant settings and route-specific minimums/fees must be checked before executing a controlled real test.
