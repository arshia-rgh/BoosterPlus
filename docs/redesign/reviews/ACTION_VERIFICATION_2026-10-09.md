# Contextual action verification and service visuals

Scope: the pending combined panel release, specifically the new in-page verification dialog, removal of standalone verification navigation, structured-link styling and service icon family. Production remains unchanged.

Independent senior UI/UX reviewer: `action_modal_senior_review`.

## Review rounds

1. Code review found stale Security/new-tab recovery links and both-factor instructions, post-send input focus, cancellation focus, private reveal feedback after switching apps, interactive hover on paused cards and vague action labels. These were corrected. Protected reveals still conceal on blur and require a new intentional reveal after a verification interruption.
2. Rendered desktop/mobile review found inconsistent browser-default primary-button borders. Code review requested verification-specific rate-limit cooldowns and inline six-digit validation. Explicit button styling, independent send/verify timers and connected errors were added.
3. Final review found successful continuation still restored trigger focus and the expiry countdown announced every second. Successful continuation now leaves focus to the resulting UI; the ticking countdown has `role="timer" aria-live="off"`, with separate sent/expired status transitions.
4. Reviewer verified the final corrections and returned **Scoped UI/UX review approved**, with no remaining actionable findings in this scope.

## Verification evidence and limits

Local isolated browser run `.cache/action-verification-browser4.log`: six Chromium desktop/mobile journeys passed across customer/admin/booster contexts, including focus containment, Escape/return focus, retained form selection, invalid-code correction, authenticator or email continuation, exactly one mutation and Axe dialog checks. Screenshots are private local `frontend/.cache/action-dialog-{portal}-{project}.png`. That run preceded the two final bounded corrections. The rebuilt final candidate subsequently passed the same six journeys in `.cache/action-verification-browser5.log`, including refreshed screenshots.

Local focused unit tests cover no replay after cancellation, sign-out, route/account/realm changes, uncertain network responses, second freshness rejection, concurrent attempts and submitted-body mutation; staff sign-in MFA remains mandatory. Backend database and full repository qualification are separate, pending requirements, not implied by this design verdict. Real devices, actual assistive-technology operation, production authentication, external mail and live financial qualification are not represented by browser fixtures.

The initial browser attempts failed at keyboard cycling and cancellation focus. Those failures remain in the private logs and were corrected; they are not relabeled as passes. Performance-budget failure from eager dialog CSS was resolved by loading dialog content/styles only on demand and keeping component styles in their own bundles.
