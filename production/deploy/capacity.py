"""Explicit resource budgets; prerequisite checks are never load qualification."""
GIB = 1024 ** 3
DEFAULT = "single-64gb"
SMALL = "single-16gb"


def budget(name=DEFAULT):
    if name == DEFAULT:
        return {"cpus": 16, "memory": 60 * GIB, "disk": 900 * GIB,
                "startup_free": 200 * GIB, "warning_free": 100 * GIB,
                "capture_free": 100 * GIB}
    if name == SMALL:
        # All service limits, including one-shot BR and migrations, total 13.375
        # GiB. Reserve another 2 GiB for the kernel, Docker and host processes.
        # Capture retains its 32 GiB hard bound plus 32 GiB free headroom.
        return {"cpus": 8, "memory": 123 * GIB // 8, "disk": 135 * GIB,
                "startup_free": 80 * GIB, "warning_free": 72 * GIB,
                "capture_free": 64 * GIB}
    raise ValueError("Unknown HOST_PROFILE; choose single-64gb or single-16gb")


def selected(manifest, staging=False):
    name = manifest.get("HOST_PROFILE", DEFAULT)
    budget(name)
    if name == SMALL and (staging or manifest.get("DATA_TOPOLOGY") != "self-hosted-single"):
        raise ValueError("The small host profile requires the real self-hosted topology")
    return name


def memory_limit(service):
    # Compose releases render normalized byte counts as either JSON numbers or
    # decimal strings. Reject units, booleans, floats and unbounded input.
    value = service.get("mem_limit")
    if isinstance(value, str) and value.isascii() and value.isdigit() and len(value) <= 12:
        value = int(value)
    if type(value) is not int or not 0 < value <= 64 * GIB:
        raise ValueError("Every small-host service needs an explicit positive memory limit")
    return value


def check_model(model, name):
    budget(name)
    if name != SMALL:
        return
    services = model["services"]
    required = {"api", "worker", "storefront", "admin", "gateway", "scanner", "migrate",
                "pd", "tikv", "tidb", "storage", "object-gateway"}
    if not required <= set(services):
        raise ValueError("Small-host budgeting cannot omit required application/data services")
    total = 0
    for service in services.values():
        total += memory_limit(service)
    if total > 107 * GIB // 8:
        raise ValueError("Small-host memory budget exceeded; preserve host headroom")
    for service, filename in (("tikv", "tikv.small.toml"), ("tidb", "tidb.small.toml")):
        from pathlib import Path
        expected = Path(__file__).resolve().parents[1] / "config" / filename
        mounts = [m for m in services[service].get("volumes", []) if m.get("target") == "/config/" + service + ".toml"]
        if len(mounts) != 1 or Path(mounts[0].get("source", "")) != expected or not mounts[0].get("read_only"):
            raise ValueError("Small-host database limits require their matching read-only configuration")
