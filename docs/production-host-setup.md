# Initial production host preparation

Date: 1 October 2026. This is a preparation receipt, not launch qualification.

## Selected host and access

The owner purchased ParsPack Germany deVPS6-Linux: eight virtual CPUs, 16 GB RAM and 150 GB storage. The owner reports provider confirmation of NVMe, resource upgrades, unrestricted ports and configurable PTR. The guest exposes a virtual disk; its physical storage technology is not independently established from that device name.

SSH uses the owner's existing `playora` alias. The initial account was root. With explicit owner approval, setup added a dedicated UID1000 `playora` operator using the existing authorized public key, passwordless sudo and Docker access. Both sudo and Docker administration confer full host control. No private laptop key was copied to the server.

Connect as the operator with `ssh -l playora playora`. The owner can later change `User` to `playora` in the local SSH alias. Root remains key-only for recovery during provisioning; password and keyboard-interactive authentication are disabled. A fresh operator connection was verified before reloading SSH, and again after reboot. Do not disable the recovery path until replacement access and provider console recovery are verified.

## Observations and completed setup

- Ubuntu 24.04.5 LTS, amd64, eight vCPUs, 16,768,598,016 bytes available physical RAM; ext4 root filesystem approximately 145 GiB with approximately 141 GiB free after base tools.
- Network time synchronization active. Initial reboot activated kernel 6.8.0-146-generic. After reboot, `systemctl --failed` reported no failed units.
- Initial cloud-init final stage failed because the provider's shell script called unavailable `history`. The private first-boot journal is retained under `/root/playora-host-evidence/`; package installation completed. Do not rerun cloud-init user scripts or erase the historical failure.
- Docker Engine 29.8.2 and Compose 5.5.1 installed from Docker's signed Ubuntu repository; signing-key fingerprint checked. Installed package versions retained privately. Daemon log rotation is bounded and live restore is enabled.
- Go 1.27.1 and Node 24.21.0 installed under `/opt/playora-tools/` from official HTTPS releases with SHA256 verification. These versions match the repository. npm reports 11.19.0.
- UFW enabled with default incoming deny/outgoing allow and SSH 22 allowed for IPv4/IPv6. Only SSH is publicly listening; the DNS stub is loopback-only. Docker-published ports require separate verification because Docker forwarding is not governed solely by UFW input rules. No application ports have been exposed.
- TCP connections to Google's inbound SMTP on port 25 succeed over IPv4 and IPv6; no message was sent. This does not qualify inbox delivery, DNS, reputation, authentication, TLS or relay policy.
- Private directories `/srv/playora` and `/srv/playora-qualification` belong to the operator and use mode 0700. No production database, runtime secrets, mail accounts, public website or funds flow has been initialized.

## Qualification boundaries and outstanding work

The initial deployment configuration and host checks described the earlier 64 GB/1 TB proposal and rejected this smaller host. The explicit 16 GB profile added later passes resource prerequisites only; see the subsequent qualification update below. The complete automated gate, real TiKV capacity measurement, backup/restore drills and the rest of `production/QUALIFICATION.md` remain mandatory before launch. Preserve all security controls and payment evidence requirements.

The committed baseline intended for initial isolated qualification is `8716f16a87a258fc46c157d771b477644783bdcf`. The first source transfer was interrupted by the setup reboot; long uploads subsequently stalled. A small-chunk retry also timed out; no partial bundle is a verified checkout. A server read-only GitHub deploy key is an alternative requiring explicit owner approval and repository installation. No source-access key has been created as of this receipt.

The separate 103 KB deployment-tool archive transferred successfully over SFTP. Its SHA256 is `05d8df5ec60fed4a33696d349f5012dc73155bfb42e29a8de75fc014b46bc174`; both ends matched before extraction. The first extraction attempt failed because the prior interrupted transfer had not created the target directory; creating the private directory and repeating succeeded. On the server, unchanged `make -C production preparation-check` passed all 46 unit tests, Python compilation, merged Compose policies and unsafe-mutation checks. Their mocked release/recovery messages are fixture output, not real release/recovery evidence. Logs are private under `/srv/playora-qualification/preparation-8716f16/evidence/`.

The unchanged `host-check` failed on the expected four old-sizing assertions (CPU, RAM, disk and Docker allocation). Filesystem, architecture, OS, time and Compose checks matched. These failures remain failures until a measured small-host profile is implemented and qualified; the current guard is not evidence that 64 GB is a measured minimum for this workload.

The exact pinned PD/TiKV/TiDB8.5.7 images were downloaded. Restricted, no-network/non-root PD `--version` execution passed. The initial disposable hello-world attempt timed out on Docker registry TLS; later registry probes and pinned image pulls succeeded. Source transfers still showed SSH latency/retransmissions. No arbitrary registry mirror, TLS bypass, database service or application listener was introduced.

The domain remains pending. The owner confirmed there is no off-host backup destination yet. Select an independent destination and recovery-key custody before initializing backups; provider snapshots alone are not a demonstrated application restore. PTR must use the eventual mail hostname, so do not request an arbitrary PTR value now. Domain/mail/OAuth, signed CI artifacts, alert delivery, bounded live financial tests and owner activation remain open.

## Subsequent source access and qualification

Subsequent source-access update: the owner explicitly approved creation of the dedicated unattended deploy key, then added it to GitHub with write access disabled. Verification and a direct clone of `main` at `715899ccc460c0912337e7927904c662a8affd81` succeeded, using GitHub's officially published Ed25519 host key. The full private qualification checkout is `/srv/playora-qualification/source`; the earlier interrupted upload attempts remain historical failures. Do not use the server key to push commits.

The explicit candidate 16 GB profile subsequently passed 50 deployment preparation tests on both hosts, merged Compose budget/security mutations, pinned TiDB/TiKV configuration parsing and host resource prerequisites. The original 64 GB profile continues to reject this host; its earlier failed result is retained. No profile load, actual restore, live mail/payment or public deployment pass is inferred. Tool bootstrap encountered reproducible Go proxy TLS failures; diagnostic comparisons are underway with certificate verification retained.

The profile was delivered and verified on origin/main as `6c5b8beb14fb768f46005a7db21d10af6adeb66b`, with the normal tracked preparation hook passing. The server qualification checkout matches that revision. Its frontend contract, formatting, strict-type, lint and all 136 test-file checks passed. The required npm security audit failed before establishing TLS; therefore the frontend stage gate failed. Separately, both production builds and all nine server tests passed. Private evidence is retained under `/srv/playora-qualification/evidence-6c5b8be/`.

Two default tool-bootstrap attempts failed at the official Go proxy. A temporary installer-only classical TLS key-exchange diagnostic installed some tools but was stopped after further stalled downloads; it is not a successful bootstrap or a production configuration. The isolated backend fixture setup also failed while resolving pinned Go and distroless base images because of TLS handshake timeouts, before starting the application. No certificate verification was disabled and no live runtime credentials were used.

Default Go TLS succeeded with full response-body reads when the diagnostic socket alone limited TCP segment size to 1240, 1200 or 1000 bytes. Ordinary default requests failed. This supports investigating packet-size/path handling but does not establish the precise network fault. The initial host-wide MTU trial was rejected by automatic approval review pending specific owner authorization; that command created no MTU change or rollback timer. Specific approval was requested for a two-minute automatic rollback, independent SSH/default-TLS verification and persistence only after both pass. The interface remained unchanged until the subsequent approval below.

### Approved network correction — 2 October 2026

The owner subsequently explicitly approved the MTU change. Scheduled a two-minute automatic restoration to 1500 before setting `eth0` to 1280. A fresh independent SSH connection and repeated default Go TLS requests succeeded with verified certificates; only then was the rollback timer stopped. `/etc/netplan/90-playora-mtu.yaml` records only the interface MTU, preserving existing addresses, routes and interface matching. `netplan generate` passed and both runtime and merged configuration report 1280. Reboot persistence has not yet been exercised.

With default TLS and no compatibility override, the complete pinned `make bootstrap` passed, including Go security tools and browser downloads. Both previously failing pinned Docker base images downloaded successfully, and a fresh npm audit reported zero vulnerabilities. This resolves the observed download failures; it does not prove the provider's underlying cause. Browser system-library installation passed, and isolated backend fixture setup resumed with successful in-container Go dependency verification. Full application/container/load/restore qualification remains separately required.

To reverse the network adjustment during a planned maintenance window, first ensure provider console access, remove only this task-created Netplan override, validate the remaining configuration and restore the interface's prior MTU of 1500. Re-test fresh SSH and default TLS; the prior download failures may return. Do not change addresses, routes or SSH rules as part of this rollback.

## Laptop replacement and recovery

Keep an encrypted private-key backup and the passphrase in independent custody. For planned replacement, generate a new key on the new laptop, add only its public key through the working operator session, verify a separate connection, then remove the old key. For loss or compromise, use a separately held key or the provider console/rescue system and revoke the lost key. Confirm provider console access before relying on it. Never commit private keys, passphrases, cloud-init user data or provider credentials.
