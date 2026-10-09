# Database vendor image review — 8 October 2026

Status: **explicitly accepted by the owner** on 8 October 2026: “yes i approve”,
in response to the exact four findings for the four image digests below. The
acceptance manifest adds only this reviewed delta and preserves all earlier
findings and report metadata. Images, deployment, financial settings and
recovery requirements are unchanged. The original round4 audit failed
correctly before this decision; fresh qualification remains required.

The fresh audit completed all eight image scans. It reports 485 fixable
HIGH/CRITICAL package findings: 481 matched the earlier acceptance, and four
required this additional decision. These four findings are one advisory in
four images, not four distinct CVEs. SeaweedFS remains clean under this scan
policy; mail, Restic and webmail
have no additional unaccepted findings. A successful scan or acceptance is not
a claim that an image has no other vulnerabilities.

## Exact additional finding

| Field | Value for all four images |
| --- | --- |
| Advisory | `CVE-2026-73073` |
| Package | `vim-minimal` |
| Installed version | `2:8.2.2637-26.el9_8.13` |
| Fixed version reported by the scanner | `2:8.2.2637-26.el9_8.23` |
| Scanner severity | `HIGH` |
| Package path | Empty string (`""`) |

Each finding's `Target` is its **complete immutable image reference below**
followed by the literal suffix ` (rocky 9.8)`. All fields above, that exact
target, the empty package path and the immutable image reference define the
scope. The scanner compares these complete fingerprints, including fixed
version and severity; none of the previous accepted entries has this advisory.

| Component | Exact immutable image | Current findings | Previously accepted | Additional |
| --- | --- | --- | --- | --- |
| BR | `pingcap/br:v8.5.8@sha256:15beb655d3276fe64aa6a353f9bf3d828d34272d2470abdf5026457b754f1c45` | 60 | 59 | 1 |
| PD | `pingcap/pd:v8.5.8@sha256:424e896800e42e1b7eb585b604c8daa3454110d0f0df5ab41f7c5f49164d3aef` | 80 | 79 | 1 |
| TiDB | `pingcap/tidb:v8.5.8@sha256:df168c764bf2dfdb166dc37a5c3b0e210d29d5f3ab2d33317fd0fdf7b32037f5` | 60 | 59 | 1 |
| TiKV | `pingcap/tikv:v8.5.8@sha256:ab84580b6795868940231aa778a34b082d19e4417e6d66f755c609bebdbbfd69` | 49 | 48 | 1 |

## Advisory and exposure assessment

The upstream advisory describes command injection through C omni-completion:
a user must open a C file with an attacker-controlled tags file and invoke
completion for a type resolved through those tags. The resulting commands run
as the user running Vim. Upstream rates this Moderate and identifies patch
`9.2.0845`; the enterprise distribution uses its own backported package version.
[Vim security advisory](https://github.com/vim/vim/security/advisories/GHSA-cx73-phcg-3j5g).

Red Hat rates this Important, CVSS 7.3, with local access and user interaction
required. It recommends avoiding untrusted C source/tag files and the relevant
completion operation. We retain the scanner's HIGH classification rather than
substituting upstream's lower rating.
[Red Hat CVE analysis](https://access.redhat.com/security/cve/CVE-2026-73073).

The reviewed repository configuration provides these facts:

- `compose.self-hosted.yaml` starts the PD, TiKV and TiDB server processes;
  `deploy/pitr.py` invokes BR backup/log/validation operations. These normal
  workflows do not invoke Vim or edit C source files.
- Database services use private container networks without published database
  ports, with configured TLS/client identity checks. They run as UID/GID1000,
  with read-only root filesystems, all capabilities dropped and
  `no-new-privileges`. Writable data volumes are still necessary.
- The optional BR tools profile uses the same non-root/read-only/capability
  restrictions. When configured, it receives operations certificates, backup
  keys and an off-host storage identity; its egress network is intentional.
  The image is audited even when that profile is not active.

**Inference:** routine service exposure to this particular editor interaction
is low because the declared workflows do not use it. This is not proof of
unreachability or a fix. An operator or other process could still invoke the
installed editor. Private networking does not prevent a local crafted-file
attack, and a read-only root filesystem does not protect writable database
volumes or prevent reading mounted credentials. Successful execution under the
service user could affect data, confidentiality or service availability.

No exploit was executed, no live runtime was changed, and no assertion is made
that the `vim-minimal` build lacks the affected feature. Package-level scan
evidence is retained; this review is not a false-positive suppression.

## Decision and remediation boundary

The existing 2 October vendor acceptance is bound to earlier exact findings,
not all future findings in an official image. The later mail and webmail
acceptances do not cover these database images or this advisory.

The preferred repair is a stable official image containing the distribution
fix, pinned to its exact digest, followed by fresh security and applicable
database/backup compatibility qualification. Availability and qualification of
such images have not been established by this document. Do not patch a running
container, silently switch tags or substitute an unreviewed custom vendor
build.

Read-only official registry research on 8 October confirmed that all four
current `v8.5.8` tags still resolve to the exact affected digests above; there
is no same-tag rebuilt alternative. Each `v8.5.9` registry lookup returned404.
Complete 8.5 and 9-series tag inventories contained no newer coordinated stable
replacement: TiDB alone has newer dated 8.5.8 builds, and the 9-series tags are
beta. Those alternatives were not pulled, scanned or qualified. This evidence
does not prove that every possible vendor build is unavailable.
[Official TiDB releases](https://github.com/pingcap/tidb/releases),
[official TiDB image tags](https://hub.docker.com/r/pingcap/tidb/tags/).
The private metadata research receipt is
`.cache/panels140-round4/pingcap-image-research/findings.json`, SHA256
`45f18511412fbf94765b7d98686b2068d44c730264cf1e38dd93b159689a33dc`.

The owner chose to accept **only the four additional findings specified here
for these four exact image digests**, replying “yes i approve” to the concrete
reviewed proposal. The manifest retains the prior report fingerprints and adds
these exact fingerprints with this review, the approval wording and fresh
report hashes. New findings, different digests, scanner execution failures,
application checks, real database tests, backups, migration/release approval
and runtime verification remain outside this acceptance. Accepted findings
remain present, not fixed. Replaying the preserved reports verifies the policy
scope; it does not replace a fresh scan or mark the failed round4 passed.

## Preserved evidence

The original failed audit reports remain at:

`/srv/playora-qualification/panels140-round4/source/production/.cache/infrastructure-audits/`

The private local copy is under
`.cache/panels140-round4/infrastructure-failure/source/production/.cache/infrastructure-audits/`.
All four report hashes and complete finding differences were independently
verified against the committed acceptance inventory. Finding hashes below use
SHA256 over the scanner's sorted-key, compact JSON fingerprint.

| Image | Report | Complete report SHA256 | Additional finding fingerprint SHA256 |
| --- | --- | --- | --- |
| BR | `2.json` | `346d10315aea8b2b0a7980d0dd095cd383218ad509f665a42d7daa146a6cd1c3` | `c000a003b98ec724dfc6e65458bae211215d2fd0218d111b805998051c8dd335` |
| PD | `3.json` | `f1b65605d5760a58491252b6e27595095aac5cc9c57b9d0388f282549d9ed7f6` | `c55a512051a40c37ed0eedbac0c7f6446f31be3dfac1853fe9adff206b3ced18` |
| TiDB | `4.json` | `a04bc8e3c3752fc033df8903f61938e9e9fc91e0668018b394dbdfec3c17ddde` | `690d7e18ab18dfacd63352a2c06e5c51cd7a778cf563668b71a99c6905c30453` |
| TiKV | `5.json` | `ecd7eaa07409e9ceebfcf34952cfd627f6201910df5e754b96250853fa0a4a25` | `79b9262675ebe8fa11f62cfa6fabf3919e4dd11024e7151d4e18e4f00da163be` |

The failed round4 remains failed. No completed release, successful real-TiKV
stage or permission to deploy is implied by this review.
