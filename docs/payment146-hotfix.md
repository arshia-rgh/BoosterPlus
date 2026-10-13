# Payment146 — hosted NOWPayments redirect hotfix

13 October 2026. This is a payment-only release, separate from the unpublished MLBB catalog revision.

## Cause and correction

The owner-approved single unpaid USD50/USDTBSC diagnostic invoice returned HTTP200 with valid hosted checkout details and uppercase `USD` and `USDTBSC` currency echoes. PLAYORA compared the response currency with a lowercase request value and classified the valid response as ambiguous, so the customer did not receive the provider redirect.

The adapter now normalizes echoed currency case against the actual requested values. It still rejects wrong amounts, currencies, assets, types, whitespace, mismatched attempt IDs and unsafe provider URLs. Optional pay-currency echoes must match the selected route. It still makes exactly one invoice POST per attempt. Regression source includes the observed response shape using synthetic IDs; no secret or live invoice URL is stored here.

The diagnostic permission is consumed. This hotfix does not authorize another invoice, payment, outgoing transfer or external message. Existing uncertain attempts keep their normal expiration/reconciliation safeguards; they are not blindly resubmitted or marked paid. An owner-led fresh checkout can be attempted after deployment through the normal available action.

## Exact owner instruction

“what happened to payment issue?? have you fixed? if yes deploy it without test (consider it hotfix)”

This is a one-use test waiver for this isolated hotfix. Do not rerun the heavy application/database/browser suite as a release prerequisite. Prior focused provider tests passed before the equivalent final comparison was expressed using the already-normalized request payload; no complete-suite pass is claimed. Keep static/security checks, normal lightweight hosted CI, signed-image provenance, image scans and live configuration/health verification. The normal tracked hook is unchanged; a private exact-tree one-use receipt binds this exception.

## Boundaries and deployment

Runtime changes are confined to `backend/internal/payments/nowpayments/client.go`. The regression file, this note and the repository owner-instruction record accompany it. The broader MLBB catalog/frontend changes, absolute-star semantics and prepared packages are excluded. Their frozen failed gate remains retained under `service145/full1`; no failure is relabeled passed.

Schema41, migrations, dependencies, stored document formats, mounted configuration, host-only identities/MFA, published payment policy revision3 and existing order ownership remain unchanged. Checkout stays enabled; outgoing transfers and deletion stay disabled; webmail stays private. The previous signed72ed594 application remains compatible with the unchanged stored structures, although reverting it would reintroduce this provider-response bug. Off-host backups remain absent, not qualified by this test waiver. Record the exact signed preflight/deployment decision and result separately before claiming the hotfix is live.
