# PLAYORA transactional emails

## Design and delivery

The shared HTML template uses the green PLAYORA brand, a dark header, readable
light body, one primary action, a visible fallback URL and support/security
footer. Every SMTP message includes a corresponding plain-text alternative.
There are no remote images, external fonts, scripts or tracking pixels. The
verification code is visible once and omitted from the preview text.

`backend/internal/emailtemplate/message.html` defines presentation;
`render.go` validates destinations and escapes all copy. Only HTTPS links are
accepted in production; local HTTP is limited to loopback/localhost previews.
`events.go` holds fixed, privacy-safe event wording. Free-form customer/staff
notes, chats, credentials, wallet destinations and provider responses are never
inserted into these event descriptions.

The existing SMTP adapter sends the HTML and text together. Auth presentation
is encrypted inside the existing expiring message payload, not in queue jobs.
Activity jobs still contain only notification references. Existing workers,
retry rules, suspension checks, current staff authority, alert consent and
notification preferences remain in force. SMTP retries can duplicate messages
after an ambiguous remote acceptance; this is not an exactly-once promise.

## Event coverage

| Trigger | Message and action |
| --- | --- |
| Email verification, recent-auth verification and portal sign-in | Expiring verification code with request/portal instructions; staff second factor remains required. |
| Other identity/security notices | Shared branded HTML and plaintext using the existing approved security copy. |
| `payment_verified` | Payment confirmed; link to private receipt/order. Active fulfillment holds still apply. |
| `payment_reversed` | Review payment status; contact support before paying again. |
| `quote_issued` | Review exact quote, validity and requirements before acceptance/payment. |
| `start`, `shop_delivery_start` | Work/delivery preparation has started; view current progress. |
| `approve_completion`, `account_acknowledge` | Reviewed completion or recorded account handover; private delivery/proof link. |
| `refund_updated` | Review processing/required action; no claim that a transfer has completed. |
| `refund_confirmed` | Provider-confirmed refund transfer, possibly only part of the refund; review exact amount/balance. |
| `seller_payout_updated`, `seller_payout_confirmed` | Distinguish an update from independently confirmed payout; use seller submission link. |
| Service cases and transfer exceptions | Review decision/status; case resolution does not itself mean refund payment. |
| Checkout/account/shop reservation expiry | Old instructions must not be reused; contact support if funds were already sent. |
| Customer support, staff support, booster coordination/assignments | Private update with the correct portal link; no message contents in email. |
| Session reminders and review status | Link to the relevant record without private scheduling/review text. |
| Availability openings | Current eligible offer and signed unsubscribe; explicitly not a reservation. |
| Other or superseded events | Generic update linking to the current record. |

Specific order/submission wording is selected only when the immutable event
belongs to the current recipient's resource and matches its current version.
Older queued events become generic updates; missing/foreign resources are
suppressed. A payment confirmation comes from authoritative reconciliation,
not a browser redirect, checkout creation or unverified webhook. Refund and
seller confirmations require the system's confirmed-transfer event. The email
change does not alter settlement, authorize payouts or enable payment switches.

Activity messages, including payment/refund notices, continue to honor the
existing activity-email preference and suppress already-read or stale notices.
They are optional notifications, not a new mandatory receipt channel. The
private order retains the authoritative financial record. Authentication mail
and individually consented availability alerts retain their separate rules.

## Editing and previewing

Published notification subject, introduction and footer remain editable through
the existing reviewed site-content flow. The standard activity subject becomes
event-specific; a custom published subject is preserved. Mandatory financial
status and preference instructions remain in the message. Structural/template
or event-wording changes require code review and the scoped senior design gate.
Do not silently change accepted order protections through email wording.

From `backend/`, run:

```sh
go run ./internal/emailtemplate/preview
```

Open generated HTML files under `.cache/email-preview/` or serve that directory
on loopback. These samples use synthetic codes, resources and recipients; the
generator has no SMTP delivery path. See the
[scoped review](redesign/reviews/2026-10-04-transactional-email.md).

## Qualification boundary

The owner initially requested this email delta while frozen full qualification95
continued untouched. That run failed because Linux killed the unistore test
database at its 3 GiB cgroup memory limit. The owner then requested fixing the
environment, increasing its limit and running everything together again with
the email changes included. The earlier separate-delta plan is superseded.
The complete normal tracked hook/CI and independent launch activation checks
remain required. A blocked security scan or partial run is never a pass.

The integration additions cover verified payment versus pending evidence,
retry after failure, completed-delivery deduplication, superseded events,
foreign ownership suppression, and independently confirmed refund/seller
transfers. Existing affected identity/portal, notification preference/privacy,
availability unsubscribe/retry and financial reconciliation tests must also
pass. HTML/MIME unit tests cover plaintext parity, escaping, unsafe URLs,
header injection and code presentation.

Actual native-client rendering and real rich-email delivery remain unqualified.
The three previously authorized external test messages are consumed; this work
does not send another real email or count a browser preview as a delivery test.
