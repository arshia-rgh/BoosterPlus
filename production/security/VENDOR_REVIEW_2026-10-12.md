# Additional vendor image findings — 12 October 2026

Status: **explicitly accepted by the owner** on12October2026: “Accept these exact
40 findings”, in response to this review. The acceptance policy now adds only
these40 fingerprints for these seven immutable images, retaining all earlier
decisions. Fresh qualification is still required. Image pins and production
configuration are unchanged; no security findings are described as fixed.

The fresh infrastructure precheck completed all eight image scans against the
existing pins. It found **519 fixable HIGH/CRITICAL package records**: 479 match
previously accepted fingerprints and **40 additional HIGH records** require a
decision. These are **four distinct advisories** appearing in several packages
and binaries, not 40 distinct vulnerabilities. Earlier scan totals remain
historical evidence; scanner databases and classification can change.

## Exact scope

[VENDOR_FINDINGS_2026-10-12.json](VENDOR_FINDINGS_2026-10-12.json) is the
original unaccepted review inventory, not an acceptance policy. It records every immutable image
reference, full-report SHA256, current count and exact additional finding
fingerprint: target, package path, advisory, package, installed version, fixed
version and severity. Only its40 `unaccepted` entries are covered by the owner's
additional decision. Empty package paths are intentional scanner values. The
inventory retains its original status and SHA256
`6c3d90ebafbbddcffa63a18337912b5e49a1370bbbce1bb4562f47ed61307435`.

| Official image | New HIGH records | Current total |
| --- | ---: | ---: |
| SeaweedFS 4.48 | 4 | 4 |
| Docker Mailserver 16.0.1 | 4 | 202 |
| PingCAP BR 8.5.8 | 6 | 66 |
| PingCAP PD 8.5.8 | 14 | 94 |
| TiDB 8.5.8 | 6 | 66 |
| TiKV 8.5.8 | 2 | 51 |
| Restic 0.19.1 | 4 | 32 |
| Roundcube 1.7.4 FPM Alpine | 0 | 4 |

Roundcube needs no new acceptance under this scan. Its four current records
match existing acceptance; that is not a claim of a clean image.

## Impact and available upstream fixes

- **CVE-2026-78669:** a malicious HTTP/2 peer can cause excessive CPU work in
  clients or servers. Present in vendor Go standard libraries and
  `golang.org/x/net`; upstream fixes are Go1.26.9/1.27.2 and x/net0.60.0.
  [Go advisory GO-2026-6611](https://pkg.go.dev/vuln/GO-2026-6611).
- **CVE-2026-78667:** many small HTTP Range requests can exhaust CPU in affected
  Go file-serving functions. Fixed in Go1.26.9/1.27.2.
  [Go advisory GO-2026-6609](https://pkg.go.dev/vuln/GO-2026-6609).
- **CVE-2026-97031:** crafted TLS ECH extension references can cause server
  memory exhaustion. Fixed in Go1.26.9/1.27.2.
  [Go advisory GO-2026-6607](https://pkg.go.dev/vuln/GO-2026-6607).
- **CVE-2026-84782:** affected OpenSSL DTLS retransmission handling can disclose
  heap data or crash. The scanner reports Rocky's backported
  `1:3.5.8-2.el9_8` as the fix for installed `1:3.5.5-6.el9_8`; this distribution
  version differs from upstream's3.5.9 release. Both `openssl` and
  `openssl-libs` appear in each of the four PingCAP images: eight records.
  [OpenSSL security advisory](https://openssl-library.org/news/secadv/20260929.txt).

The other32 records are Go dependencies in `weed`, `step-cli`, `br`, `pd-ctl`,
`pd-recover`, `pd-server`, `tidb-server` and `restic`. PLAYORA's own Go1.27.2
toolchain does not rebuild or repair these precompiled vendor binaries.

## Deployment exposure and limits of this assessment

The repository's `compose.self-hosted.yaml` puts database services on private
networks with TLS/client identity configuration and no published database
ports. Storage is also private, with the authenticated object gateway between
application clients and storage. Container resource limits, non-root execution,
read-only root filesystems, dropped capabilities and no-new-privileges remain
configured. These reduce exposure or impact; they do not repair the libraries.

The mail findings are in the image's `step-cli` utility, not evidence of a
vulnerable SMTP parser. BR, PD maintenance utilities and Restic are operational
tools; off-host backups are still absent. Their images remain in the required
audit inventory even when the tools are not running. Public SMTP and private
webmail configuration are unchanged.

**Assessment/inference:** private network boundaries restrict direct attacker
access to database and storage services, and normal declared database traffic
uses TCP TLS rather than DTLS. This does not establish that every affected
function is unreachable: compromised internal peers and outbound clients are
still relevant, and per-binary reachability has not been proved. No exploitation
or destructive load experiment was performed. CPU/memory exhaustion could
interrupt service; the DTLS finding includes potential information disclosure
if the affected path is reached. Acceptance must retain these limitations.

## Vendor version check

Read-only registry checks found all seven affected stable tags still resolve
to the same pinned digests. The reviewed official release pages show
SeaweedFS4.48, Docker Mailserver16.0.1, Restic0.19.1 and PingCAP8.5.8 in the
selected stable train. No patched stable replacement was identified in this
check. A newer unrelated train or prerelease is not a tested replacement.

Sources: [SeaweedFS releases](https://github.com/seaweedfs/seaweedfs/releases),
[Docker Mailserver releases](https://github.com/docker-mailserver/docker-mailserver/releases),
[Restic releases](https://github.com/restic/restic/releases),
[TiDB releases](https://github.com/pingcap/tidb/releases),
[TiDB8.5.8 notes](https://docs.pingcap.com/tidb/stable/release-8.5.8/).

## Decision boundary and evidence

The repository requires new image/finding-scoped decisions. The prior broad
choice to use official images and previous exact acceptances did not silently
accept these additional records. The owner selected exact acceptance after
reviewing the choice to wait for patched official builds. The original
unaccepted evidence is preserved separately from the new acceptance entries.
This does not waive tests, scan failures, unrelated findings, recovery
requirements or authorize external messages or funds.

Private server evidence is under
`/srv/playora-qualification/service144/full1/`: `infrastructure-precheck.log`,
`infrastructure-delta.json`, `vendor-tag-recheck.json` and
`source/production/.cache/infrastructure-audits/0.json` through `7.json`.
The precheck ran against baseline6b2cfb959b169ed89bbd47e133ff552f3fcae976.
At the original scan, the full combined application gate had not started.
Subsequent run status is tracked in the service-experience roadmap; this review
never claims an application gate pass or production change.
