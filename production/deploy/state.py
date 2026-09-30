"""Private durable operation receipts and process-scoped deployment locking."""
from contextlib import contextmanager
import fcntl
import json
import os
from pathlib import Path
import re
import stat
import tempfile


def directory(path):
    path = Path(path)
    if not path.is_absolute() or path.is_symlink():
        raise ValueError("Operation state requires a real absolute directory")
    path.mkdir(mode=0o700, parents=False, exist_ok=True)
    info = path.stat()
    if not stat.S_ISDIR(info.st_mode) or info.st_mode & 0o077 or info.st_uid != os.getuid():
        raise ValueError("Operation state must be private and owned by the operator")
    return path


@contextmanager
def locked(path, project):
    root = directory(path)
    if not re.fullmatch(r"boosterplus-[a-z0-9-]{1,48}", project):
        raise ValueError("Invalid operation project")
    descriptor = os.open(root / (project + ".lock"), os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        info = os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_mode & 0o077 or info.st_uid != os.getuid():
            raise ValueError("Unsafe deployment lock file")
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError("Another deployment/backup operation holds the project lock") from None
        yield root
    finally:
        os.close(descriptor)  # Kernel releases the lock after crashes as well.


def write(root, name, document):
    if not re.fullmatch(r"[a-zA-Z0-9_-]+\.json", name):
        raise ValueError("Invalid receipt name")
    root = directory(root)
    descriptor, temporary = tempfile.mkstemp(prefix=".receipt-", dir=root)
    try:
        with os.fdopen(descriptor, "w") as stream:
            json.dump(document, stream, sort_keys=True, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        target = root / name
        if target.is_symlink() or (target.exists() and not target.is_file()):
            raise ValueError("Unsafe receipt destination")
        os.replace(temporary, target)
        directory_descriptor = os.open(root, os.O_RDONLY)
        try:
            os.fsync(directory_descriptor)
        finally:
            os.close(directory_descriptor)
    finally:
        Path(temporary).unlink(missing_ok=True)


def pending(root, project):
    path = Path(root) / (project + "-release.json")
    if not path.exists():
        return None
    from artifacts import bounded
    value = json.loads(bounded(path))
    if value.get("project") != project:
        raise ValueError("Release receipt belongs to another project")
    return value if value.get("state") != "complete" else None
