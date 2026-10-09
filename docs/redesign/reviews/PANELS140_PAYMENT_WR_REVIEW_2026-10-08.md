# Panels140 payment and win-rate code review

Reviewer: `/root/panels140_payment_review`, independent of implementation.
Base: `23c70774594c488bc6fe1dfe166f06291d81bfb1`. The initial staged
candidate tree was `4d28ba5539fe47c29be65c9464bba0d3cc633ecb`; its frozen
receipt is retained under `.cache/panels140/superseded-preflight-snapshot`.
The final review includes the subsequent strict win-rate validation correction.
The corrected release must receive its own source manifest and qualification.

## Scope and round trip

Reviewed hosted checkout creation, provider minimum checks, ownership and
transaction boundaries, immutable policy use, invoice idempotency, existing
native checkout preservation, redirect validation and customer-triggered focus.
Also reviewed win-rate parsing, legacy pricing compatibility and new-order,
revision, estimate, coupon and reorder validation boundaries.

- **WR1 — corrected:** historical validation also accepted newly submitted
  scalar win rates such as `85`. `ValidateNewAnswers` and `CalculateNew` now
  reject these at new submission and preview boundaries, including legacy
  scalar defaults. They inspect normalized visible answers, preserving ordinary
  decimal fields and hidden/later-stage behavior. Historical `ValidateAnswers`
  and `Calculate` remain available for immutable orders, fulfillment and
  published pricing cases. Existing order-create idempotent replay still occurs
  before new-input validation.
- **WR2 — corrected:** reorder's safe field allowlists omitted `win_rate`.
  All three now include it. Strict reorder validation keeps valid preferences
  and returns a correction issue for old scalar selections rather than silently
  creating another exact-percentage request.
- **Payment scope:** no actionable code/security finding. Provider minimum
  reads occur outside the database transaction; the transaction rechecks
  authorization, ownership, contract, policy and selected route. Invalid or
  unavailable minimum evidence creates no attempt. Existing active attempts
  remain reusable without a fresh provider read. New attempts use hosted
  invoices; persisted native attempts retain their existing behavior. Invoice
  writes retain the durable single-claim boundary. Provider URLs are constrained
  on both server and client; redirects and invoice creation do not establish
  payment success. Polling itself does not move focus.

## Evidence and verdict

Independent checks passed:

- Five focused frontend files, **56 tests**: checkout, provider navigation,
  win-rate parser, widget and dynamic-form behavior.
- Go win-rate validation/pricing tests, including the subsequent strict
  new-selection, defaults, visibility and historical-compatibility additions.
- The direct historical fulfillment handoff regression passed: accepted scalar
  win rates remain valid, while missing required fulfillment details still fail.
- NOWPayments minimum tests using local synthetic HTTP fixtures. The first
  attempt was blocked by the sandbox's loopback-bind restriction; the permitted
  local-fixture rerun passed. No external provider request was made.
- Staged whitespace validation for the original candidate.

Reviewed the added `win_rate_orders_test.go` database regressions for rejected
new orders/revisions without commercial side effects, rich-preference reorder,
unchanged historical read/idempotent replay, and public validation/estimate/coupon
boundaries. These tests were inspected, not executed by this reviewer; their
actual database result must be recorded by qualification.

**Final verdict: PASS — both actionable findings are corrected; no remaining
actionable finding in this code-review scope.**

This is a code/security review with focused automated checks, not the separate
senior visual review or owner-requested manual journey audit. Real-database
tests for the final corrections and the corrected candidate's full gate remain
independent requirements. No complete-gate, live-provider, real-funds, external
email, physical-device or assistive-technology acceptance is claimed. Provider
minimums may change between preflight and invoice creation; conservative
uncertainty/reconciliation behavior remains necessary. The review neither
changes the published payment policy nor authorizes deployment or funds movement.
