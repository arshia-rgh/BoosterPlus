# Candidate 16 GB production profile

The owner selected ParsPack Germany, eight vCPUs, 16 GB RAM and 150 GB NVMe for the actual initial production host. `HOST_PROFILE=single-16gb` opts into this resource budget. The original `single-64gb` remains the default. Neither profile is a capacity guarantee; complete server qualification and the unchanged load/recovery targets are required before activation.

The profile uses the same pinned images, TiDB/PD/TiKV storage engine, private TLS, role/authentication boundaries, malware scanning, self-hosted mail, explicit migrations and signed release path. It does not simulate payments or remove services. Changing resource budgets requires fresh capacity and recovery evidence.

## Memory and CPU

| Service | Container limit |
| --- | --- |
| PD | 512 MiB |
| TiKV | 3.5 GiB |
| TiDB | 2 GiB |
| Object storage | 768 MiB |
| Object gateway + public gateway | 384 MiB |
| API, worker, storefront and admin | 384 MiB each |
| Malware scanner | 1.5 GiB |
| Self-hosted mail | 2 GiB |
| Explicit migration job | 256 MiB |
| Explicit BR backup job | 1 GiB |

Steady limits total 12.125 GiB; including both one-shot jobs totals 13.375 GiB. Host prerequisites require at least another 2 GiB for the kernel, Docker and host processes, without counting swap. Limits are ceilings, not measured usage or reservations. TiKV's memory target/cache and TiDB's quota are explicitly below their container ceilings. The smaller CPU ceilings bound individual data services; their sum is not a dedicated-CPU promise. Do not run compilation, the disposable full gate or a second restore cluster alongside live production on this host.

## Disk and backup budget

Require at least 135 GiB usable filesystem capacity and 80 GiB free at initial qualification. Alert below 72 GiB free (or 20%); reject media capture below 64 GiB free. Capture retains its existing 32 GiB hard bound, leaving at least 32 GiB free before concurrent writes. TiKV's 10 GiB reserve is unchanged. Limits are conservative capacity checkpoints, not reserved partitions: measure growth, backup duration and concurrent writes; upgrade before they threaten recovery. A capture exceeding 32 GiB fails closed and requires a reviewed larger-data recovery design.

Off-host encrypted backups, independent recovery keys and measured 15-minute RPO/four-hour RTO remain required. Complete the first isolated restore before activation. Subsequent restore drills need a separate host or an explicit planned outage with the primary stopped; never contend two complete clusters with live workloads to fit the RAM budget. Do not count local copies or provider snapshots as verified off-host application recovery.

## Selection and qualification

Set `HOST_PROFILE=single-16gb` in the protected deployment manifest. `compose()` merges `compose.small.yaml` after data/mail/PITR, retaining all isolation controls and replacing only matching database configuration mounts. Host preflight uses the same explicit selection:

```sh
HOST_PROFILE=single-16gb DATA_DIRECTORY=/srv/playora make -C production host-check
```

`preparation-check` validates both profiles and rejects missing services, missing memory limits, over-budget compositions and mismatched database configuration. `runtime-config-test` parses the new configurations with the exact pinned database binaries. These checks do not qualify startup under load. Run the full domain/concurrency gate, real profile startup, representative fixtures, HTTP/chat/backlog load, OOM/restart observation and encrypted recovery before claiming a pass. Keep `PAYMENTS_ENABLED=false` and outgoing transfers disabled until all launch requirements and owner acceptance pass.

References: [TiKV8.5.7 configuration template](https://github.com/tikv/tikv/blob/v8.5.7/etc/config-template.toml). Memory limits and cache targets remain subject to measurements on the purchased shared-vCPU host.
