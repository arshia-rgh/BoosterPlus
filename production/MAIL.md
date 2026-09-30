# Self-hosted email

Requested by the owner on 30 September. This configuration uses the pinned Docker Mailserver release (Postfix, Dovecot and Rspamd), not a third-party SMTP relay. It is infrastructure authentication, separate from PLAYORA's passwordless customer/staff sign-in.

## Hosting prerequisites

Use a static public IPv4 with outbound TCP25 permitted and configurable PTR. Confirm these with the host **before purchase**. Domain ownership/DNS access is needed. Domain/hosting providers retain their own onboarding rules; self-hosting email does not guarantee those providers will never request verification.

Incoming TCP25 receives domain mail and delivery-status notifications. Authenticated submission on587 is private to API/worker. IMAPS993 binds to loopback and is accessed through an SSH tunnel for the operator's support/postmaster mailbox. No public mail admin UI, open relay, POP3, cleartext IMAP or trust-by-Docker-subnet. The original web-only 80/443 exposure gains this explicit mail25 exception.

Set `MAIL_MODE=self-hosted`, `MAIL_HOST`, `MAIL_POSTMASTER` and `DATA_DIRECTORY` in the private deployment manifest. Use `SMTP_HOST` equal to `MAIL_HOST`, port587, `SMTP_TLS=required` and a dedicated authenticated sender in the backend runtime file. Never use a staff member's mailbox password as the application credential.

Create the private `mail/config`, `mail/data`, `mail/state`, `mail/logs` and `data/gateway` directories under the installation directory. The gateway directory and its mail-certificate leaf directory must be owned by the gateway UID1000 before starting containers. The data preparation command does not choose a domain.

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
