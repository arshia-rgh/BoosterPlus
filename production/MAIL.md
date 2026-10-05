# Self-hosted email

Requested by the owner on 30 September. This configuration uses the pinned Docker Mailserver release (Postfix, Dovecot and Rspamd), not a third-party SMTP relay. It is infrastructure authentication, separate from PLAYORA's passwordless customer/staff sign-in.

## Hosting prerequisites

Use a static public IPv4 with outbound TCP25 permitted and configurable PTR. Confirm these with the host **before purchase**. Domain ownership/DNS access is needed. Domain/hosting providers retain their own onboarding rules; self-hosting email does not guarantee those providers will never request verification.

Incoming TCP25 receives domain mail and delivery-status notifications. Authenticated submission on587 is private to API/worker. IMAPS993 binds to loopback and is accessed through an SSH tunnel for the operator's support/postmaster mailbox. No public mail admin UI, open relay, POP3, cleartext IMAP or trust-by-Docker-subnet. The original web-only 80/443 exposure gains this explicit mail25 exception.

Set `MAIL_MODE=self-hosted`, `MAIL_HOST`, `MAIL_POSTMASTER` and `DATA_DIRECTORY` in the private deployment manifest. Use `SMTP_HOST` equal to `MAIL_HOST`, port587, `SMTP_TLS=required` and a dedicated authenticated sender in the backend runtime file. Never use a staff member's mailbox password as the application credential.

Data preparation creates private `mail/config`, `mail/data`, `mail/state`, `mail/logs` and `data/gateway` directories under the installation directory. After configuring the real hostname, run `make mail-prepare` to create its certificate directories as UID1000 before starting containers. The data preparation command does not choose a domain.

Configure a real sender/postmaster mailbox through DMS's `setup email add` interactive prompt; do not put passwords on the command line or paste them in chat. Provision support and abuse/postmaster delivery destinations. Use `setup config dkim` for the selected Rspamd mode according to the pinned release help, keep the private DKIM key in the mounted configuration, and publish only its public TXT record. Exact host provisioning commands are qualified on the server before activation.

## DNS and certificates

- `mail.<domain>` A record points to the server's static IPv4.
- That IPv4's PTR resolves back to the same mail hostname, and forward resolution agrees.
- Sender-domain MX points to that mail hostname.
- SPF authorizes only the actual sending IPv4; add no broad unrelated include.
- DKIM publishes the generated public selector/key.
- DMARC starts with monitored reporting to an owner-controlled address; tighten enforcement after legitimate mail alignment is verified. The chosen policy and report retention are owner decisions.
- Do not publish AAAA until reverse DNS, routing and deliverability for that IPv6 are separately qualified. This recipe uses IPv4 mail deliberately.

The existing Caddy gateway provisions a separate mail-host certificate using the explicitly selected Let's Encrypt issuer. Only the mail certificate's directory is mounted into DMS. DMS does not receive the site's other keys or the Docker socket. Start the gateway and obtain the certificate before starting mailserver; first issuance can require more than the application rollout wait. On renewal, verify DMS presents the new certificate; reload/restart the mail service if needed. Monitor expiry independently of the website certificate.

## Qualification required on the server

1. Validate DNS/PTR, certificate chain/hostname/expiry and TLS-required authenticated submission.
2. Reject unauthenticated external-to-external relay, unknown credentials and sender spoofing. Test without delivering any external message for rejection cases.
3. With owner-selected recipient addresses, send actual login/order fixtures to Gmail/Outlook and inspect SPF/DKIM/DMARC results and inbox/spam placement. SMTP queue acceptance alone is not inbox delivery.
4. Check delayed/bounced delivery, retry age, rate limits, full mailbox/disk and restart persistence. Never send fabricated customer mail.
5. Alert for stuck/deferred queues, expired TLS/DKIM problems and primary-host failure. A primary-server mail outage cannot report itself reliably through the same mail server: use an independent external watchdog/recipient path.
6. Include mail queue/state, mailbox data, hashed account configuration and DKIM private keys in encrypted off-host recovery. Hold restored outbound mail until queue review prevents replay of old login codes/messages. Apply the owner-approved retention policy to messages/logs/backups.

The mail image is an explicit root/writable-filesystem exception because upstream configures and supervises several daemons; daemon identities drop privilege. Capabilities are bounded and no NET_ADMIN, privileged mode or host network is enabled. Mail metadata logs can contain addresses: keep them private, bounded and covered by retention. No blanket claim of log anonymization or deliverability is made.

References: [DMS introduction](https://docker-mailserver.github.io/docker-mailserver/latest/introduction/), [Caddy/TLS integration](https://docker-mailserver.github.io/docker-mailserver/latest/config/security/ssl/), [SPF/DKIM/DMARC](https://docker-mailserver.github.io/docker-mailserver/latest/config/best-practices/dkim_dmarc_spf/). Runtime/scanner/image and actual mail-delivery qualification are deferred to the server, not marked passed.


## Current deliverability finding

On 4 October 2026 the owner confirmed the additional DMARC recheck arrived in
Gmail Inbox with SPF, DKIM and DMARC all PASS. This qualifies authentication and
observed placement for that one message. The same recipient had previously
marked a test “not spam,” so this does not establish placement for new recipients
or representative application messages.

Earlier, the owner reported a test message initially arrived in Gmail Spam, then was
manually marked “not spam.” The specific test/message is not yet identified.
That earlier placement was a failure. The owner reported SPF PASS for195.248.241.192, DKIM PASS forplayoragames.com
and DMARC FAIL. The pasted headers identify the second HTML test. Gmail records aligned SPF
and DKIM passes forplayoragames.com but no DMARC result in either
Authentication-Results header, despite the UI displaying FAIL. From, Return-Path
and DKIM signing domains agree. Both authoritative nameservers and four public
resolvers return the expected single initial DMARC record. Cloudflare SOA TTL
and MINIMUM are1800seconds; the second test was inside30minutes of the first
pre-publication test. Cached nonexistence is plausible but not established.
The owner approved one additional test after13:35Asia/Tehran on4October. The
interrupted single-run automation resumed and sent exactly one recheck at13:55
Tehran; its private sender validated time, current DNS and prior receipts, and
refused duplicate sends. Gmail remote SMTP acceptance was confirmed. The extra
authorization is consumed; the owner-reported received results are recorded above.
Do not count manual reclassification as a passing deliverability test.

## Owner additions — 4 October 2026

Deliverability and a support-mail UI are now explicit launch work, not optional
follow-ups. A successful SMTP transaction is insufficient evidence of Inbox
placement. No guarantee of “never spam” is possible because the recipient
provider controls filtering and reputation changes over time.

### Deliverability acceptance

- Keep verified forward/PTR, HELO identity, TLS and a single narrowly scoped SPF
  record. Verify actual message DKIM signatures and From-domain alignment.
- The owner approved initial DMARC `p=none`, without automatic aggregate or
  forensic report collection until report retention is chosen. Inspect actual
  received-message authentication results. Choose the later enforcement/report
  policy explicitly after legitimate senders are verified.
- Inspect Inbox/Spam placement and SPF/DKIM/DMARC results for the actual domain
  and representative application mail. Gmail SMTP acceptance is only one step.
  Record recipient-provider, date, result and relevant redacted authentication
  headers; never commit messages, addresses, login codes or recipient tokens.
- Investigate observed Spam placement before declaring delivery qualified:
  authentication/alignment, IP/domain reputation, message formatting, content,
  rate/burst behavior and bounce responses. Avoid artificial warm-up traffic,
  unsolicited recipients and owner-inbox allowlisting as proof of general
  deliverability. Upgrade sender infrastructure only with owner approval.
- Record queue delay, retry/bounce behavior and ongoing delivery alerts. Do not
  equate a low-volume test with future bulk-volume reputation.
- The two original external tests were authorized: the exact approved plain
  text and HTML message to the protected owner Gmail address. The plain-text
  and HTML tests were submitted, with the earlier failure retained above. The
  additional exact-content DMARC recheck passed all three authentication checks
  and reached Inbox according to the owner. All three authorizations are consumed;
  no other recipient/message is authorized.

### Support inbox UI acceptance

- Provide an owner-selected UI for reading and replying to support mail,
  including Inbox/Sent/Drafts/Spam, search, unread state, attachments and clear
  sender identity. Keep notifications sender credentials separate from support.
- If browser webmail is selected, evaluate a maintained upstream client such as
  Roundcube rather than implementing a new mail parser/editor. Select and pin
  the current supported official image after fresh research and security scan;
  earlier vendor exceptions do not cover any new webmail image/findings.
- Define access protection before exposure: HTTPS, intended operators only,
  session/logout/CSRF/rate-limit behavior, safe HTML and blocked remote tracking
  content. Preserve PLAYORA portal sign-in boundaries; do not reuse a customer
  session for staff mail access or introduce password login to the application.
- Keep IMAP/submission private. Verify service networking, persistent settings,
  restart/backup/restore, certificate renewal and the measured host memory budget.
  A new webmail service must fit measured capacity; do not silently reduce host
  headroom or deploy a floating image to make it fit.
- Test read/search/draft/attachment/reply/failure flows with isolated messages;
  external replies need explicit authorization. Run the senior UI review for
  changed user-facing design and record limitations separately from test passes.

References: [Gmail sender guidelines](https://support.google.com/mail/answer/81126),
[official Roundcube container project](https://github.com/roundcube/roundcubemail-docker),
[Roundcube security releases](https://roundcube.net/news/security/).


### Current host handoff

During qualification, `playora-mail-preparation` uses the actual prepared mail
configuration/state under `/srv/playora/installation/mail`, with the independently
issued mail certificate from the bootstrap gateway. It publishes only SMTP25
and loopback IMAP993. Runtime mailbox credentials remain in the protected owner
input directory; never put them in Git or chat. This temporary project is not
proof of final signed-release or recovery qualification.

Before the final release adopts mail, stop this preparation project without
removing data, verify there is no second MTA using the same files/listeners, and
start the final Compose mail overlay against the same directories. Preserve the
published DKIM key, mailbox hashes and message state. Validate certificate reload,
private authenticated submission and persistence again after the handoff.
