# Private support mailbox UI

Operator webmail uses the accepted official Roundcube1.7.4 FPM Alpine image,
pinned by digest. This is infrastructure access, separate from customer/admin/
booster sign-in. The entry requires SSH-key access; the mailbox still requires
its own password. No public mailbox login is added.

## Preparation and activation

Set `WEBMAIL_ENABLED=true` with `MAIL_MODE=self-hosted`. After the private mail
installation is prepared, run `make -C production webmail-prepare` as UID1000.
It copies only the exact upstream code into `mail/webmail/code`, creates a private
session key and initializes the vendor SQLite settings schema explicitly.
Preparation refuses an existing directory; an interrupted preparation must be
inspected rather than resetting mail settings. It does not touch mailbox contents
or send any message. Roundcube startup does not install packages or update code.

The optional Compose overlay adds a128MiB PHP worker and uses the existing
gateway for HTTPS/static assets. One on-demand worker bounds concurrent work;
capacity is measured separately. Vendor code/configuration/key are read-only,
PHP runs as UID82 with no capabilities, and no FPM/IMAP/submission port is exposed.
Port18443 is bound only to127.0.0.1 on the server. TLS uses the existing real mail
hostname and its public certificate, with ordinary verification retained.

## Open on the owner's Mac

With Chrome installed and the existing SSH alias working:

```sh
make -C production webmail-open
```

This opens a separate temporary Chrome profile and an SSH tunnel. Only that
window maps `mail.playoragames.com` to local loopback; system DNS and the normal
browser remain unchanged. Log in as `support@playoragames.com` (or `support`).
Use the support mailbox credential supplied through
the protected operator channel. This password is separate from PLAYORA's
passwordless customer/admin/booster accounts. There is no password-reset link in
webmail; a deployment operator resets a mailbox through the mailserver tooling.
No mailbox password belongs in Git or chat.
Quit the separate Chrome process or press Ctrl-C in the terminal to close access.
HTTPS verification must never be disabled to suppress a certificate error.

Other clients can use SSH dynamic forwarding and a dedicated browser SOCKS
configuration with DNS through the proxy, then visit
`https://mail.playoragames.com:18443`. Never publish the listener to avoid
configuring a tunnel.

## Operation and recovery

The UI provides Inbox, Sent, Drafts, Junk, Trash, search and attachments using the
mailbox protocol. The official Elastic skin supports its responsive widescreen
layout; double-clicking a message opens its full view. Remote images and HTML rendering are blocked by default;
attachments are untrusted files. Session idle lifetime is15minutes. Sending or
replying externally requires explicit authorization when an agent operates it.
All currently approved external test sends are consumed.

Settings and the session key live under `mail/webmail/`, covered by the existing
cold installation backup when backups are enabled. Cold backup stops webmail
with the other services. For online point captures, SQLite needs a consistent
snapshot before webmail recovery can be claimed. No backup/restore guarantee is
made: the owner deferred off-host backups until after initial launch. Restored
application drills explicitly disable webmail and mail so they cannot send.

Do not regenerate the session key silently, change the published DKIM key, or
run two mail servers against the same mailbox files. Requalify UI/state, TLS,
memory, restart and image findings on updates. See the exact accepted risks in
[the vendor review](security/WEBMAIL_REVIEW_2026-10-04.md). Initial runtime and
senior UI review evidence remain pending until explicitly recorded.
