# Seller proposals, uploads and customer sessions

Owner request, 15 October 2026. Base source `1fc8482`; current production `79d09a9`, schema43. Implementation and focused qualification are in progress; this document does not claim deployment.

## Scope

- Let administrators, as well as owners, propose exact seller agreements. Keep recent action verification, seller acceptance, immutable accepted terms, idempotency and commission rules. Do not grant payout execution, owner-level role changes or other owner capabilities.
- Diagnose failed seller screenshot uploads end to end. Keep the 4 MiB image limit, ownership checks, CSRF, private quarantine and fail-closed scanning. Present actionable failures rather than suggesting every failure is an expired session; retain the selected file for retry.
- Customer sessions: 90-day absolute expiry and 30-day inactivity expiry. New email and Google sessions use matching persistent host-only cookies. Staff keep 12-hour absolute and 30-minute inactivity limits. Activity and action verification do not extend stored absolute expiry. Revocation, suspension, account version, separate portal identities and recent verification remain enforced. Existing stored absolute expiry is retained; the 90-day maximum applies at the next sign-in.

## Verification plan

Use standing focused checks, not the complete suite. Cover administrator success and role/MFA boundaries, retry/commission integrity, customer idle/absolute expiry and sensitive-action/revocation controls, upload failure feedback/retry and actual storage health. Review changed rendered interfaces with an independent senior designer, then run normal focused hook, lightweight CI, immutable-image scan/signature and production preflight/runtime checks.

No live account publication, customer chat, email, invoice or funds test is authorized. Synthetic storage health probes create and clean up only temporary diagnostic objects. No migration is planned. Off-host recovery remains absent; prior release-specific approvals are consumed.

## Investigation

- Owner-only checks existed in both the proposal API/transaction and the rendered proposal editor.
- All portal sessions shared a 30-minute idle deadline; customer absolute lifetime was seven days.
- The shared screenshot uploader replaced every non-success byte-upload response with one generic sign-in suggestion.
- The live dependency probe reproduced a private-storage write failure independently of customer authentication. Storage logs confirmed no writable volumes because disk free space was below its unchanged 20% safety floor. Removing unused Docker build cache reclaimed 32.88 GB (Docker report), bringing available disk from about23 GiB to51 GiB. No production data, existing release images, failed-test volumes or qualification evidence were deleted. The standard database/storage/scanner probe then passed without a service restart or lowered safety threshold. The release procedure now checks actual temporary-object writes with the current binary before quiescing an existing site, and with the candidate after migration before serving traffic.

The owner retried the same screenshot and confirmed it worked after cleanup. A separate synthetic 4 MiB storage round trip and cleanup passed through the existing verified-TLS private gateway. The senior scoped review passed in Chromium/WebKit at320/390/768/1280px:128 states,12 role/removal probes and8 final accessibility renders. See [review](redesign/reviews/SELLER155_2026-10-15.md).

A factual [cookie notice amendment](legal/COOKIE_SESSION_UPDATE_2026-10-15.md) is prepared for normal authenticated publication; the existing public policy is not silently rewritten.

## Focused evidence

Four race-enabled isolated TiDB scenarios passed: long customer sessions with short staff/recent-action boundaries, existing identity cooldown/terms/revocation behavior, seller route-validation retry, and administrator proposals with MFA/owner restrictions. The first administrator test failed because its generic fixture sent unrelated commerce jobs to the identity email handler. Its fixture now delivers only its own synthetic challenge; only that failed case was rerun. The original failed run and the other three passes are retained under `.cache/seller155/`, with an aggregate receipt binding both runs. No external email was sent.

Focused component checks cover owner/administrator proposals and actionable image errors with same-file retry. Seven deployment lifecycle unit checks include refusing storage failures before traffic is stopped, plus the post-migration storage probe before serving traffic. The normal focused repository hook and exact release checks remain pending.
