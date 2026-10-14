# Clearer account selling and payout-route release

15 October 2026. Prepared on `main` after `fdb1d89999aaa7256bd8a46e063cef1345809c24`. This combines the pending [payout-route correction](seller-offer-route-fix-2026-10-15.md) with the owner's requested selling-flow improvements. Live application before this release: signed `84b10e3`, schema 42.

## Customer and admin behavior

The visible path is **account review → sale agreement → secure handover → public listing**. Each sale Overview names the next actor, links to the next useful action and explains publication blockers. It distinguishes a received proposal, seller acceptance, listing preparation, actual publication, reservation, sale and a paused game. Progress refreshes without exposing credentials, payout destinations, private listing drafts or staff review notes.

- Submission has three clear parts: account details, optional screenshots and permission to sell. Notes are optional; game-specific help is collapsed. One action saves and submits using the returned version, with a separate save-draft option. Unsent screenshots block submission until sent or removed. Field errors keep input and focus; successful submission returns to the focused review Overview.
- Requested corrections appear beside the editable details. Long accepted agreements sit behind a disclosure. Secure handover reports missing, expired, received, returned-account update and locked states without repeating the overview instructions.
- Admin can prepare a listing immediately after seller acceptance. Publication has a checklist for secure handover, exact price/commission, reviewed images, buyer terms, available game service and, for buy-first offers, confirmed seller payment. Unsaved edits, preview and explicit public-content review remain visible requirements. Moving to a blocker and back preserves context and the originating section.
- Remove the separate manual ownership-verification action and its publication/payout prerequisite. Receipt of protected seller access replaces that operational step; no new ownership-verification record is fabricated. Seller authority declaration, sign-in/recent action verification, encrypted credentials and permissions remain. Historical verification timestamps continue to anchor older accepted payout timing.
- Published/reserved/sold or payout-committed account access cannot be silently replaced. Returned accounts need renewed access. Consignment still requires confirmed buyer payment, delivery, inspection and applicable dispute/refund holds. Buy-first publication still requires the actual recorded seller payment. Nothing automatically publishes an account or sends crypto.
- Future proposal defaults explain handover receipt. Historical accepted agreements, existing published legal policies and exact fixed quotes are unchanged.

The payout fix replaces free-text provider codes with a readable route from the published policy (`usdtbsc`/`bsc` for current USDT on BNB Smart Chain), preserves entries after errors and makes invalid fields actionable. See its separate record for prior qualification.

## Qualification and limits

- Changed backend package race tests passed. A final unit regression verifies that an inspection-time conflict points to buyer terms, not price. The lint-discovered unused validation wrapper was removed; final normal hook qualification is pending.
- Nine scoped race-enabled isolated TiDB scenarios passed in `seller153/db2`: private sale progress and authorization, accepted draft before handover, nonexistent/unreviewed media blocking, publication/reservation, paused service, expired/replaced handover, manual buy-first payout, historic timing/returned accounts, optional notes, seller-route retry, existing consignment/refund holds and submission lifecycle. Exact overlay manifest SHA256 `233ce2216cba2eb45d7cf334d093c83aebdb8725a9e8ef85b85cb01e7bd9c728`.
- The preceding `db1` run passed the manual payout exact-terms/authorization/idempotency scenario, then stopped because the unchanged media-upload fixture lacked private S3 configuration. That failure is retained, not relabeled passed. The upload pipeline was not modified or requalified here; the changed readiness/publish checks were covered by isolated image-metadata cases in db2. The disposable databases were removed.
- After db2, only a pure blocker-label classification and removal of an unused wrapper changed backend runtime source. The classification has its own final unit regression; database enforcement is unchanged.
- Initial focused frontend checks passed 80 component tests across 21 files. Initial browser locator mismatch was corrected. Scoped Chromium/WebKit checks passed selling flows and payout-route validation at 320, 390, 768 and 1280 px, including keyboard focus, overflow, axe, failure/retry and preserved values. Later navigation changes passed six focused cases in each engine. A sandbox-only WebKit localhost/Go cache denial is retained; reruns with the required local access passed.
- Senior rendered review: **PASS** after all nine findings were resolved. [Review record](redesign/reviews/SELLER153_2026-10-15.md).
- Normal focused tracked commit hook, exact CI, image scan/signature, server preflight and deployment/runtime checks are pending. No full-suite pass is claimed or requested. The full targets and updated tests remain available.

Private evidence is under `.cache/seller153`, `.cache/seller152` and `/srv/playora-qualification/seller153`. Tests use isolated synthetic identities, data and providers; no live offer, account publication, external email, invoice or funds transfer occurred.

## Release constraints

No schema migration or dependency change. Preserve schema42, checkout enabled, manual payout recording, automated outgoing transfers/deletion disabled, payment policy revision3, legal/disabled retention revision2, the owner's latest catalog edits, independent identities/MFA, mounted runtime configuration and private webmail. No catalog/policy publication is requested by this task.

Off-host recovery remains absent. All previous exact-release recovery exceptions are consumed. After signed candidate and preflight, obtain the exact release recovery decision before activation. Although schema42 is unchanged, newly accepted offers use handover receipts without the old verification flag, so reverting to the old application after new sale data is written is not qualified; recovery may require a forward fix. Do not describe an untested rollback or missing backup as safe recovery.
