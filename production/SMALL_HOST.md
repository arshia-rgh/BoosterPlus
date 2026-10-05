# Candidate 16 GB production profile

The owner selected ParsPack Germany, eight vCPUs, 16 GB RAM and 150 GB NVMe for the actual initial production host. `HOST_PROFILE=single-16gb` opts into this resource budget. The original `single-64gb` remains the default. Neither profile is a capacity guarantee; complete server qualification and the unchanged load/recovery targets are required before activation.

The profile uses the same pinned images, TiDB/PD/TiKV storage engine, private TLS, role/authentication boundaries, malware scanning, self-hosted mail, explicit migrations and signed release path. It does not simulate payments or remove services. Changing resource budgets requires fresh capacity and recovery evidence.

## Memory and CPU

| Service | Container limit |
| --- | --- |
| PD | 512 MiB |
| TiKV | 4 GiB |
| TiDB | 2 GiB |
| Object storage | 768 MiB |
| Object gateway + public gateway | 384 MiB |
| API, worker, storefront and admin | 384 MiB each |
| Malware scanner | 2 GiB |
| Self-hosted mail | 1 GiB |
| Explicit migration job | 256 MiB |
| Explicit BR backup job | 1 GiB |
| Optional private support webmail | 128 MiB |

Steady limits total 12.125 GiB; including both one-shot jobs totals 13.375 GiB. Host prerequisites require at least another 2 GiB for the kernel, Docker and host processes, without counting swap. Limits are ceilings, not measured usage or reservations. TiKV's memory target/cache and TiDB's quota are explicitly below their container ceilings. The smaller CPU ceilings bound individual data services; their sum is not a dedicated-CPU promise. Do not run compilation, the disposable full gate or a second restore cluster alongside live production on this host.

Optional webmail raises those totals to12.25GiB steady and13.5GiB peak, retaining
2GiB host headroom (15.5GiB minimum available host memory). It reuses the public
gateway process through an SSH-only listener; no additional steady gateway is
needed. This new128MiB allocation requires runtime/load measurements before use.

Initial server testing observed a scanner cgroup OOM at the earlier 1.5 GiB limit during signature initialization. A 2 GiB fixture restarted healthy with fresh signatures and passed the smoke check, with no OOM recorded in that run. The candidate budget therefore moves 512 MiB from TiKV to the scanner while preserving total limits and host headroom; TiKV's target/cache shrink with its ceiling. This is a measured scanner correction, not proof of TiKV or whole-profile capacity. Full startup, signature refresh, data load and recovery must qualify the revised profile.

The full real-TiKV business run25 later reached TiKV's import memory guard (about 3.07 GB resident against a 3 GiB cgroup), interrupting index creation. A soft `memory-usage-limit` alone does not bound every allocation. The next candidate retains the same container budget and 2304 MiB soft target, reduces block cache to512 MiB, bounds RocksDB write buffers to256 MiB and uses two import threads. These settings follow the pinned upstream configuration template; sustained workload and capacity qualification remain required. The failed run is not a pass, and SQL deadlines/resource protection are unchanged.

Run26 also failed at the import memory guard after58 passing business scenarios.
A heap diagnostic on the unchanged official TiKV8.5.8 binary attributed about
2080 MiB to the startup backtrace-symbol cache, including about1928 MiB of
decompressed debug sections. The pinned upstream panic-hook implementation
preloads this process-lifetime cache. Cache/memtable tuning cannot remove that
fixed baseline; no binary stripping or custom image is adopted.

The next candidate allocates4 GiB to TiKV with a3072 MiB soft target and1 GiB
to mail, preserving the same aggregate budget. The official mail fixture passed
verified TLS SMTP/IMAP, wrong-password/relay rejection, local delivery and a
20-message, five-concurrent-session burst at a measured605.3 MiB peak, with
zero cgroup limit events/OOMs/restarts. This bounded synthetic result supports
testing the revised budget; it does not qualify public mail or combined load.
The corrected real-TiKV suite and whole-host load/recovery still must pass.

Primary source: [TiKV8.5.8 panic-hook cache](https://github.com/tikv/tikv/blob/v8.5.8/components/tikv_util/src/lib.rs).

## Disk and backup budget

Require at least 135 GiB usable filesystem capacity and 80 GiB free at initial qualification. Alert below 72 GiB free (or 20%); reject media capture below 64 GiB free. Capture retains its existing 32 GiB hard bound, leaving at least 32 GiB free before concurrent writes. TiKV's 10 GiB reserve is unchanged. Limits are conservative capacity checkpoints, not reserved partitions: measure growth, backup duration and concurrent writes; upgrade before they threaten recovery. A capture exceeding 32 GiB fails closed and requires a reviewed larger-data recovery design.

Off-host encrypted backups, independent recovery keys and measured 15-minute RPO/four-hour RTO remain required. Complete the first isolated restore before activation. Subsequent restore drills need a separate host or an explicit planned outage with the primary stopped; never contend two complete clusters with live workloads to fit the RAM budget. Do not count local copies or provider snapshots as verified off-host application recovery.

## Selection and qualification

Set `HOST_PROFILE=single-16gb` in the protected deployment manifest. `compose()` merges `compose.small.yaml` after data/mail/PITR and `compose.small-mail.yaml` only for self-hosted mail, retaining all isolation controls and replacing only matching database configuration mounts. Host preflight uses the same explicit selection:

```sh
HOST_PROFILE=single-16gb DATA_DIRECTORY=/srv/playora make -C production host-check
```

`preparation-check` validates both profiles and rejects missing services, missing memory limits, over-budget compositions and mismatched database configuration. `runtime-config-test` parses the new configurations with the exact pinned database binaries. These checks do not qualify startup under load. Run the full domain/concurrency gate, real profile startup, representative fixtures, HTTP/chat/backlog load, OOM/restart observation and encrypted recovery before claiming a pass. Keep `PAYMENTS_ENABLED=false` and outgoing transfers disabled until all launch requirements and owner acceptance pass.

References: [TiKV8.5.8 configuration template](https://github.com/tikv/tikv/blob/v8.5.8/etc/config-template.toml). Memory limits and cache targets remain subject to measurements on the purchased shared-vCPU host.
