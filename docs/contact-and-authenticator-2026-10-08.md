# Public contact and authenticator QR — 8 October 2026

Status: implemented locally as a separately reviewed follow-up to the staff-host
candidate. Not committed or deployed. The owner supplied WhatsApp and
Instagram destinations and confirmed support-email SPF/DKIM/DMARC all pass.
The owner then supplied Discord user ID `1553760636821962832`. Normal final qualification
remains required, including the new pinned frontend dependency. After the first
staff-host gate failed on a missing browser fixture, the corrected candidate and
this follow-up will receive one fresh combined full gate.

## Public contact

`/contact` is a public page using the existing green brand, shared artwork and
responsive shell. Customer header/footer contact discovery and general public
policy/help links enter this page. The email card opens
`mailto:support@playoragames.com`; account-access help remains available without
sign-in. **Chat with support** enters the existing private `/support` route,
which requires authentication and preserves its return destination. Existing
staff inbox/assignment navigation and order-specific conversations stay local.

Discord, WhatsApp and Instagram have local decorative vectors with visible
channel names. Their exact public destinations belong in
`frontend/app/site/contact-config.ts`. The owner supplied the WhatsApp number and
prefilled message plus the `playora_service` Instagram profile. WhatsApp uses its
digits-only international number format; Instagram omits the sharing query.
The supplied Discord `/users/playora.service` URL was replaced with the owner's
subsequently confirmed `https://discord.com/users/1553760636821962832` profile
link. All three channels now have owner-confirmed destinations.
Configured links announce their new-tab behavior and use `noopener noreferrer`.
No external channel or email app is opened by automated tests. New configured
destinations receive focused rendering, keyboard and independent design review.

## Authenticator setup

The existing authenticated enrollment API already returns the PLAYORA TOTP URI.
The frontend now validates its account, issuer, secret and algorithm parameters
and generates a black/white SVG QR locally with four modules of quiet border.
`qr@0.7.2` is pinned in the frontend manifest/lock with no runtime dependencies;
only its encoder is used by application code. No external QR service, storage,
camera access, secret URL navigation or analytics is introduced.

The setup key is available only through an explicit manual fallback for
same-device/accessibility needs. The pending QR/key clears after verification,
conservative ten-minute expiry, page departure or identity change. The server
still requires a real six-digit code before enrollment succeeds. Existing
authenticator sign-in, mandatory staff MFA and recovery-code protections remain.
There is no backend or database migration in this follow-up.

## Local evidence and limits

- Full local component run: 147 files / 517 tests passed with 100% required route
  coverage. This includes 10 held untracked cameo tests; the intended tracked
  source has 146 files / 507 tests. Focused contact and MFA reruns passed after
  type/lint corrections. All three production SSR builds and size budgets passed.
- Type checks, ESLint, formatting, contracts, repository policy/secret/workflow
  checks and the dependency audit passed during development. Final-source checks
  and the normal applicable hook are still separate from these local results.
- Chromium and WebKit each passed 16 synthetic journeys at 1440, 820, 390 and
  320 pixels: public contact/private chat guard plus customer/admin/booster QR
  enrollment. Scoped axe, overflow, local-only requests, asset/error checks,
  manual reveal/hide and rendered SVG decoder roundtrips passed.
- An independent macOS Vision CPU reader decoded all 24 screenshot QR crops to
  their exact synthetic enrollment URIs. Initial sandbox attempts could not use
  macOS image services; the permitted host execution passed. This is not a
  physical-device/authenticator-app acceptance claim.
- The first browser fixture failed because its blob-based test rasterizer was
  rejected by the existing CSP. It was changed to a local data-image rasterizer;
  production CSP was not relaxed. Failed evidence was retained. The fixture also
  gained an explicit bounded customer-overview response rather than ignoring an
  unexpected request.
- The senior contact review found an orphaned last letter in the email address
  at 320 pixels. An intentional break after `@` keeps the domain intact. Corrected
  browser/keyboard evidence passed in both engines, and independent contact
  round2 and authenticator round1 reviews returned scoped PASS. See the
  [review record](redesign/reviews/CONTACT138_AUTHENTICATOR_2026-10-08.md).
- After adding the owner-confirmed WhatsApp and Instagram URLs, six focused
  contact unit tests, scoped lint and the storefront build/budgets passed.
  Eight refreshed Chromium/WebKit responsive keyboard journeys and independent
  contact round3 review passed. They verify link presentation and destinations,
  not external account ownership, delivery or third-party availability.
- The later Discord link passed seven focused contact tests (including an
  explicit all-unavailable fixture), build/budgets, eight fresh responsive
  Chromium/WebKit keyboard journeys and independent contact round4 review.
  This two-file UI delta arrived after combined round2 was frozen. It remains
  unstaged and will use the normal frontend/repository hook after the full gate;
  it does not change backend behavior or dependencies or overwrite frozen proof.

Private evidence is under `.cache/contact138/`. Screenshots and traces use only
synthetic identities and enrollment keys. No live login, email, purchase,
payment, refund or payout was performed. The earlier portal137 server gate failed
on its own frozen source; it does not qualify this dependency/UI delta. Its logs
and manifest remain preserved. The combined round2 is a fresh normal gate.

## Support-email investigation

Read-only production evidence found no confirmed SMTP, sender-alignment, signing
configuration or MIME defect. Both retained support messages were authenticated,
DKIM-signed and accepted by Gmail using TLS, as were the sampled notifications.
Current SPF, DKIM, DMARC and matching forward/reverse DNS are present. SMTP
acceptance is not proof of the recipient's authentication verdict or Inbox
placement. The owner subsequently confirmed that support-email SPF, DKIM and
DMARC all pass and described email as okay now. Inbox placement was not separately
specified, so this records authentication success without claiming a universal
delivery fix. No further authentication summary is requested.

The support identity has an empty display name. Roundcube already permits
**Settings → Identities → Display name → PLAYORA Support** while keeping the
sender email fixed. That is a presentation improvement, not a proven spam fix;
no mailbox identity or DNS/runtime setting was changed during the investigation.
No additional test email is authorized. Prior delivery-test permissions are
consumed.

Authentication and reputation/content signals both affect classification; there
is no server switch that guarantees Gmail Inbox placement. See Google's
[sender guidelines](https://support.google.com/mail/answer/81126) and
[authentication guidance](https://support.google.com/mail/answer/180707), and
Roundcube's [identity controls](https://docs.roundcube.net/doc/help/1.1/en_US/settings/identities.html).
