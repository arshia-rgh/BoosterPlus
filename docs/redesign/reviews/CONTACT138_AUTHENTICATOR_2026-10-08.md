# Public contact and authenticator QR review

Date: 8 October 2026. Local implementation only; deployment and normal final
qualification are not implied by design review.

## Scope and independent reviewers

- `/root/portal_backend`: senior UI/UX review of the public contact page,
  customer header/footer and public help links, and the private-chat handoff.
  This reviewer did not implement contact.
- `/root/portal_visual_review`: senior UI/UX review of QR-first enrollment in
  customer/admin/booster contexts, manual fallback and verification continuity.
  This reviewer implemented the separate contact draft, not MFA.

The implementation began as a separate working delta from frozen portal137.
The owner supplied WhatsApp and Instagram URLs, then Discord numeric profile ID
`1553760636821962832`. Reviewers did not invent destinations. Existing
green branding, portal identity and mandatory staff MFA remain. A fresh combined
round2 full gate follows the first portal gate's browser-fixture failure.

## Contact roundtrip

Round 1: **FAIL** for C138-01. At 320px, the primary email address placed the
last `m` of `.com` on its own line. The reviewer also required actual keyboard
evidence rather than only mouse activation.

Fix: a soft break after `@` and a nonbreaking domain keep the email readable.
The original mailto target and accessible/copyable address remain unchanged.
The revised browser check traverses email, chat and access-help links by keyboard,
checks visible focus, excludes unavailable social cards from tab order, and
presses Enter on chat to exercise the existing support sign-in return path.

Round 2: **PASS — no further actionable findings in the reviewed contact scope.**
The reviewer independently inspected corrected narrow and focused screenshots
in Chromium/WebKit and the source/receipts for all eight contact journeys.
Desktop1440×1000, tablet820×1180, mobile390×844 and narrow320×740 were covered.
Both links have visible3px focus outlines without clipping or overlap. WebKit
uses macOS Option-Tab for link navigation, recorded separately from Chromium
Tab. The initial plain-Tab fixture failure is retained, not counted as a pass.

Contact source fingerprints:

- `contact.tsx`: `28decab420eaa40ee0a62a83b11f4ae026ae600df1e20f628828f7de58149353`
- `contact.css`: `9b878323ac5fa93eaacbec6c89b1d5ce006a6491e915ea2f393644fcfe3b506a`
- `contact-config.ts`: `3ac5e9558a48c044d2f61676bf0d131890cad70bf499f006dafe4806853e4f79`

Round 3: **PASS — owner-confirmed WhatsApp and Instagram destinations.** The
independent contact reviewer inspected both engines' current narrow views,
desktop and social-focus screenshots, exact source/receipt hashes and all eight
new keyboard journeys. Visible action text, icons and new-tab labels distinguish
working links; actual tab traversal reaches WhatsApp then Instagram and skips
unavailable Discord. Focus remains visible and unclipped. The 320px email break,
private-chat return, overflow and scoped axe checks remain passed.

The WhatsApp destination preserves the supplied message with a digits-only
international number. Instagram uses the supplied profile without a sharing
query. No third-party page or message composer was opened by these tests. Six
focused contact unit tests, scoped lint and the storefront build/budgets also
passed. The revised `contact-config.ts` SHA256 is
`d097da8b290cacde0d863d9ea172ca38c195beecfce8a5e2e98662b72f1f9a61`.
Private evidence: `browser/contact-social-links/{chromium,webkit}/` and
`contact-social-links-result.json` under `.cache/contact138/`. Earlier review
hashes above remain historical evidence for their reviewed version.

Round 4: **PASS — owner-confirmed Discord profile.** The independent contact
reviewer checked the exact numeric profile URL, visible and accessible new-tab
labels, safe anchor attributes and desktop/320px renders. All eight fresh
Contact journeys pass; Discord is first in the social-link keyboard order, with
unclipped visible focus. The explicit all-unavailable component fixture retains
coverage for missing destinations. No external page was opened or message sent.
The latest `contact-config.ts` SHA256 is
`999dcb7581d0b2b23241f559949927d64c2451bb7f7012427ff3841d50b3821f`.
Evidence is in `browser/contact-all-links/{chromium,webkit}/` and
`contact-all-links-result.json`. This late UI delta is separate from the frozen
combined round2; normal frontend/repository qualification remains pending.

## Authenticator review

Round 1: **PASS — no remaining actionable findings in the MFA scope.**
The reviewer inspected24 representative Chromium/WebKit full-page images across
all three roles and all four widths, collapsed/expanded manual states, source,
flow tests and trace frames. The trace frames distinguish normal scrolling from
an apparent fixed-header overlap in a long screenshot; the full QR remains
visible in the actual scan viewport. No application correction was required.

The black/white QR has an intact quiet border and renders at262–288 CSS pixels.
Issuer/account labels remain readable; instructions lead to the six-digit
verification field. The44px manual-fallback control has native button semantics,
expanded state and a controlled region. Its key is absent until requested and
removed when hidden. Browser evidence verifies heading focus, numeric entry,
no overflow, scoped axe results, loaded assets and no secret persistence or
external requests. Failed-code, success, expiry and page-departure component
tests preserve verification and cleanup behavior.

Both engines passed16 final synthetic journeys each: four contact and twelve
enrollment journeys. Same-package SVG decoding passed; an independent macOS
Vision CPU decoder also matched all24 final screenshot crops to their complete
synthetic enrollment URIs. Earlier sandbox failures to access macOS image
services remain recorded; the permitted host reader passed. No live secret was
used in an image, trace, URI fixture or report.

## Evidence and limits

Private evidence: `.cache/contact138/contact-design-review.md`,
`mfa-design-review.md`, `browser/{chromium,webkit}/`, archived earlier browser
attempts and `vision-result.json`. Receipts bind reviewed source/build hashes.

The reviews cover the changed UI and affected navigation only. They do not
certify missing social destinations, external app handling, Inbox placement,
live authentication, physical-camera scans, screen-reader traversal, production
rollout or absence of undiscovered issues. Real database/browser and normal
dependency/image/release qualification remain separate. No external social
navigation, email send, live sign-in or financial action occurred.
