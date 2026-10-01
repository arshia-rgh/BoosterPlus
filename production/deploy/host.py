"""Read-only qualification of the owner-selected compact Linux deployment host."""
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
from capacity import DEFAULT, budget

GIB = 1024 ** 3


def command(args):
    try:
        result = subprocess.run(args, check=True, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        raise ValueError("Required host tool is unavailable or failed") from None
    return result.stdout


def evaluate(inventory, profile=DEFAULT):
    """Return actionable failures, never a capacity or availability guarantee."""
    failures = []
    limits = budget(profile)
    if inventory["system"] != "Linux" or inventory["architecture"] not in ("x86_64", "amd64"):
        failures.append("Use an amd64 Linux host; the qualified scanner is amd64")
    if inventory["os_id"] != "ubuntu" or inventory["os_version"] != "24.04":
        failures.append("The initial host recipe targets Ubuntu Server 24.04 LTS")
    if inventory["cpu_count"] < limits["cpus"]:
        failures.append("Host CPU allocation is below the selected profile")
    if inventory["memory_bytes"] < limits["memory"]:
        failures.append("Host memory cannot fit the selected profile and its headroom")
    if inventory["disk_total_bytes"] < limits["disk"] or inventory["disk_free_bytes"] < limits["startup_free"]:
        failures.append("Data filesystem capacity/free space is below the selected profile")
    if inventory["filesystem"] not in ("ext4", "xfs"):
        failures.append("Use ext4 or XFS for the persistent data filesystem")
    version = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?", inventory["compose_version"])
    if not version or tuple(map(int, version.groups())) < (2, 30, 0):
        failures.append("Docker Compose 2.30.0 or newer is required for raw env files")
    if inventory["docker_os"] != "linux" or inventory["docker_arch"] not in ("x86_64", "amd64"):
        failures.append("Docker must target this Linux amd64 server")
    if inventory["docker_cpus"] < limits["cpus"] or inventory["docker_memory_bytes"] < limits["memory"]:
        failures.append("Docker does not have the planned CPU/RAM allocation")
    if not inventory["local_docker"]:
        failures.append("Host qualification requires a local Unix-socket Docker context")
    if not inventory["clock_synchronized"]:
        failures.append("Enable and verify network time synchronization before TLS/MFA operation")
    return failures


def inspect(data_directory, profile=DEFAULT):
    budget(profile)
    path = Path(data_directory)
    if not path.is_absolute() or not path.is_dir() or path.is_symlink():
        raise ValueError("DATA_DIRECTORY must identify an existing absolute persistent directory")
    if platform.system() != "Linux":
        raise ValueError("host-check runs on the intended Linux server; this workstation is not a production host")
    os_release = platform.freedesktop_os_release()
    docker = json.loads(command(["docker", "info", "--format", "{{json .}}"] ))
    context = json.loads(command(["docker", "context", "inspect"]))
    endpoint = os.environ.get("DOCKER_HOST") or context[0]["Endpoints"]["docker"]["Host"]
    disk = shutil.disk_usage(path)
    inventory = {
        "system": platform.system(), "architecture": platform.machine(),
        "os_id": os_release.get("ID", ""), "os_version": os_release.get("VERSION_ID", ""),
        "cpu_count": os.cpu_count() or 0,
        "memory_bytes": os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES"),
        "disk_total_bytes": disk.total, "disk_free_bytes": disk.free,
        "filesystem": command(["findmnt", "--noheadings", "--output", "FSTYPE", "--target", str(path)]).strip(),
        "compose_version": command(["docker", "compose", "version", "--short"]).strip(),
        "docker_os": docker["OSType"], "docker_arch": docker["Architecture"],
        "docker_cpus": docker["NCPU"], "docker_memory_bytes": docker["MemTotal"],
        "local_docker": endpoint.startswith("unix://"),
        "clock_synchronized": command(["timedatectl", "show", "--property=NTPSynchronized", "--value"]).strip() == "yes",
    }
    failures = evaluate(inventory, profile)
    # Bounded allowlisted fields only; docker info and context can contain secrets.
    print(json.dumps({"profile": profile, "inventory": inventory, "failures": failures}, indent=2))
    if failures:
        raise ValueError("Host qualification failed; address the reported requirements")
    print("Host prerequisites passed; load, TLS, firewall and recovery qualification remain required")
