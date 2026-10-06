# Private support webmail: loading and compose template

Status: implemented and tested in an isolated synthetic mailbox; the owner approved this exact focused update and pre-backup rollout, which is pending. Application, database and financial switches are unchanged.

## Changes

- The SSH launcher verifies a trusted HTTPS200 response through the tunnel before opening Chrome. Dead tunnels, certificate failures, unsuccessful HTTP responses and bounded connection timeouts produce an actionable error.
- Only bundled CSS/JavaScript/font paths through Roundcube's static-file handler receive compression and a one-day private browser cache. Login, mailbox pages, attachments and other responses retain no-store. Private source/template paths remain404. The SSH-only listener and upstream certificate checks are preserved.
- The composer offers Apply PLAYORA template / Remove PLAYORA template. Plain text explicitly offers rich-text conversion with Roundcube's confirmation. The header/footer surround the current message; no automated send, tracking image, external asset or business promise is introduced.
- Current edits, authored tables, quoted replies, inline images, recipients and attachments remain intact. Draft re-opening handles Roundcube's namespaced IDs. Undo/Redo, keyboard focus, accessible status and conversion-cancel/failure recovery are covered.
- Floating layout-table controls no longer cover mobile Save/Send. The normal Table menu and image resizing remain available. Existing CSS, identity/session rules and vendor security-risk acceptance remain otherwise unchanged.

## Diagnosis and measured evidence

The live server had low CPU use/load; webmail used roughly17MiB of its128MiB limit and returned the login page in roughly80ms from server loopback. PHP OPcache was available. Two separate SSH transfers/readiness attempts timed out from the laptop, while another tunnel returned HTTPS200. This establishes an intermittent connection problem as well as avoidable asset overhead; it does not prove a specific ISP/VPN cause or guarantee a particular end-user latency.

Before the change, the interface stylesheet was160,347bytes and jQuery88,983bytes despite requesting gzip; both had no-store. The synthetic candidate returns26,354bytes and32,443bytes respectively, with gzip and private max-age86400. That is approximately84% and64% less transfer for those two assets. Dynamic/private-path checks still pass. Fresh temporary browser profiles still need their first asset download; later navigation within that profile can reuse assets.

## Qualification

- Local DOM transformation regressions: idempotent apply, remove after editing, nested quotes, authored tables/inline images, Unicode/escaped text, empty content, extra rows/outside edits and namespaced saved drafts passed.
- All70 production unit tests, merged configuration/unsafe-mutation checks and repository secret/contracts/workflow checks passed. Five new tunnel-readiness tests cover valid response, stalled/dead connection, TLS certificate rejection and HTTP failure.
- Maintained Go lint reported zero issues; standalone gosec passed; the live official vulnerability database scan reported no called vulnerabilities. No backend dependency/source changed.
- Pinned real Caddy, PHP/plugin and FPM validation passed on the server, alongside existing deployment configuration validation.
- Headed Chromium/Xvfb at1366×900,768×1024 and375×812 passed actual Tab/Enter access, apply/remove, post-apply typing, Undo/Redo, recipient/attachment preservation, saved-draft reload, no automatic sends and no document overflow/page errors. Additional cancelled and aborted-network conversion tests preserve the text and permit retry.
- The separate senior designer issued PASS after review/fix rounds; see [the scoped review](redesign/reviews/2026-10-06-support-template.md). Physical Mac/VPN responsiveness, assistive technology and rendering in external recipient email clients are not qualified by the synthetic browser checks. No external test email was sent.

Preserved failures: an initial browser test dismissed Roundcube's normal conversion confirmation; the corrected test explicitly accepted it. A transient statusbar assertion was replaced by actual persisted draft ID/reopen evidence. Tests found and fixed tab-order reachability, namespaced draft recognition, nested quoted-template removal and mobile table-toolbar overlap. These failed attempts are not counted as successful runs.

## Rollout and recovery boundary

The current signed application remains2bde066 at schema39. No mailbox migration, password rotation, public login exposure or financial activation is needed. Proposed rollout changes only the versioned webmail plugin and gateway webmail configuration, restarts the private PHP service and the shared gateway (brief HTTPS interruption), and verifies private login/assets plus public application routing. Keep exact previous configuration bytes and file hashes for configuration rollback; do not touch messages, mailbox settings or database contents.

Off-host backups remain absent. The5October one-use login-hotfix exception is consumed. The owner explicitly approved the new webmail-only focused-check/pre-backup exception after reviewing the prepared scope. No new backup PASS or full repository-gate pass is claimed. The normal hook and strict ordinary release defaults are not changed by this implementation.

Runtime evidence currently resides privately under `/srv/playora-qualification/webmail120/`; local rendered copies are under `.cache/webmail120/review-final/`. Reproduce transformations with `make -C production webmail-template-test`, launcher unit tests through `preparation-check`, and the isolated prepared fixture with `webmail-browser-test` / `webmail-cache-test`. See `production/WEBMAIL.md` for fixture boundaries.
