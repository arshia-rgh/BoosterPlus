# CHECKOUT178 — clearer customer payment review

## Owner scope

Remove the customer checkout overview's processing-fee and exchange-rate facts. Put the complete authored payment policy in a closed, boxed disclosure matching cancellation/dispute/refund terms. Show a PLAYORA preparation modal while the initial checkout is being created, with the exact visible sentence “Preparing your secure checkout.” An independent senior UI/UX designer decides and reviews the changed presentation. Deploy after focused qualification; no full gate.

## Implementation

- The agreed USD price, checkout window, visible consent and real external destination remain. Only the two requested operational overview facts are removed; configuration, accepted policies and financial history are unchanged.
- Both policy disclosures have matching frames, wrapping summaries, keyboard controls and readable insets. Full authored policy/remedy text is retained.
- A native modal dialog uses the existing PLAYORA symbol/orbit, one compact green card and a blurred backdrop. It opens for customer creation/new/creating states, including first entry into Complete payment. It never appears for administrator inspection, existing payment links, missing-link recovery or verified receipts.
- Escape or “View order while we wait” dismisses only the presentation. The attempt keeps reconciling; polls do not reopen the dismissed dialog or create another invoice. After 15 seconds it offers a delayed explanation and direct order support. Ready, unavailable, uncertain, expired and error states release the overlay to the existing result/recovery UI.
- Focus is contained by the native top layer and returned to the visible payment heading or failure feedback. Automatic OS reduced-motion behavior is preserved.

## Qualification and release

Independent senior design review **PASS** after two rendered rounds at 320/390/1440 pixels. Round2 passed all 32 scoped browser/accessibility cases and 28 component cases; the unchanged application source is bound to those receipts. Round4 covers only the final test-callback lint correction. The normal frontend/repository hook and signed release are next. No backend/database/full suite or local tests are claimed.

The original first-round failures (two lint issues, JSDOM dialog teardown ordering and an admin fixture route assertion) and second/third-round test-only timer-callback lint findings remain retained. They are not relabelled as passes. Fixtures intercept all checkout/provider requests; there was no live invoice, purchase, message or funds test.

Reviewed scenarios include both closed/expanded policy boxes, consent and USD total, branded initial preparation, delayed support, native background isolation/keyboard focus, Escape dismissal across polls, new→creating→ready single redirect, unavailable/error/uncertain/settled/closed outcomes, offline reconnection, automatic OS motion preference, staff/existing-link/recovery exclusion, all four purchase kinds and preserved payout/history presentation.

Current production is signed d768cbd at schema50. This task changes frontend presentation/tests only; no migration, backend, policy publication or runtime-setting change. Checkout stays enabled; supplier purchases, outgoing transfers and customer deletion remain disabled. Private receipts are under `.cache/checkout178/` and `/srv/playora-qualification/checkout178/`.

The signed candidate, exact CI/image scans/signatures and server preflight must pass before requesting the owner's fresh exact no-off-host-backup recovery decision. Earlier release exceptions are consumed.
