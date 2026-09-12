# Direct crypto checkout

R05 implements direct order checkout, durable financial evidence and staff reconciliation. It introduces no customer or seller wallet. The finance screen is `/admin/finance`; customer receipts and checkout are within each order. Source belongs to the backend and frontend projects; production runtime configuration remains under `production/`.

## Merchant configuration

Keep credentials in ignored, mode-0600 host configuration, never `.env.example`. Set `NOWPAYMENTS_MODE` explicitly to `sandbox` or `live`; keys and dashboard credentials must belong to that environment. `NOWPAYMENTS_ACCOUNT_ID` is a locally generated, stable UUID identifying that merchant. Retain it across API-key rotations; use a new identifier for a different merchant. Mode forms part of the namespace, preventing sandbox/live evidence collisions.

Set `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_EMAIL` and `NOWPAYMENTS_PASSWORD`. Payment discovery requires the dashboard login to obtain a short-lived bearer token in addition to the API key. Tokens are kept only in memory, with fixed HTTPS destinations, bounded bodies, deadlines and refused redirects. See the [official authentication reference](https://github.com/NowPaymentsIO/nowpayments-sdk-nodejs#authentication-and-automatic-jwt-refresh).

`PAYMENTS_ENABLED=false` permits read-only reconciliation, including in local HTTP development. Both the store and adapter forbid invoice creation while disabled. Enabling requires a public HTTPS `PUBLIC_ORIGIN` and an explicitly published payment policy. No default commercial fee policy, asset list or rate promise is published. Local Compose forwards the protected configuration to API and worker only. The production frontend configuration validator rejects merchant credentials.

The callback is `PUBLIC_ORIGIN` plus `/api/v1/webhooks/payments/nowpayments`. Invoice creation supplies that callback explicitly. Configure the same public URL in the provider dashboard for dashboard-triggered IPNs. An empty dashboard URL does not make localhost reachable. The temporary test endpoint and signed provider callback qualification remain pending; no public tunnel is started implicitly by `make dev-up`.

For sandbox retry settings, five recurrent notifications one minute apart are a recommended starting point, not a provider requirement. Duplicates are safe. The provider documents a three-second callback deadline; the handler budgets two seconds for durable receipt and returns an error if persistence fails. See [IPN setup](https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup). Only HMAC-authenticated notices are accepted; customer sessions/CSRF are deliberately not required on the callback. Customer/staff mutations retain normal identity, CSRF and rate limits.

## Financial behavior

- A published policy snapshot, route and accepted order contract bind each attempt. Policy publishing and manual reconciliation require recent staff factors. Repeated checkout requests reuse the single active attempt; a route or policy change cannot silently modify it.
- Invoice creation is claimed before the provider call. An ambiguous response or interrupted claim creates an exception. Queue retries never repeat that financial POST. Authenticated discovery repairs missing callback references and ambiguous invoice correlation when a payment appears.
- Callback status and browser redirects never settle an order. Every payment ID is read from the authenticated provider API. Leases and versions fence stale concurrent observations; observations remain immutable.
- Fiat minor units and crypto decimal receipts remain separate and exact. Each contract has at most one allocation. Settlement atomically queues the order and redeems a held coupon. Extra receipts, overpayments, wrong routes, inconsistent evidence and unknown references appear in finance review.
- Confirmations are not final settlement. Timely detected funds may finish after the local window. Funds first observed after the deadline require timing review. Expired unused attempts retire the unpaid contract and release held coupon/capacity; a later deposit cannot reactivate it. Starting over uses current-catalog reorder and new acceptance, rather than reusing an expired payment link.
- A provider reversal preserves original receipt/allocation history and holds work. No staff control can invent a paid state. R06 adds customer cases and outgoing refunds; an R05 exception is not an executed refund.

## Verification and qualification limits

`make pre-commit` includes both project gates, root security checks and isolated deployment checks. The TiDB integration suite covers ownership, strict input, CSRF, duplicate/forged/missed callbacks, cancellation races, exact/partial/extra/wrong-route funds, expiry/reversal, unavailable inbox storage and stale observation fencing. Browser tests use a compiled test-only provider and real SQL/queue/HTTP services; there is no payment simulation route in the runtime app.

On 12 September 2026, sandbox `/status` returned HTTP 200, while credential-bearing `/auth` and `/estimate` returned HTTP 403. Credential values and response bodies were not logged; no invoice or outgoing transfer was created. The cause has not been established. This is not successful provider qualification. Actual signed callbacks, supported merchant networks, real sandbox invoice behavior and outgoing sandbox flows must be qualified before activation; fixture success cannot substitute for them. R10/R11 release and live-launch approval remain deferred.
