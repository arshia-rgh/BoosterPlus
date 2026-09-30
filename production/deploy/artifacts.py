"""Release manifest policy and detached-signature verification.

The separately held operator key signs exact digest/SBOM/provenance metadata
after authenticated CI review. This is not a claim of a SLSA-certified builder.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile

COMPONENTS = {"backend", "storefront", "admin", "scanner", "gateway"}
REPOSITORY = "arshia-rgh/BoosterPlus"


def bounded(path, maximum=1 << 20):
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > maximum:
            raise ValueError("Release artifact must be a bounded regular file")
        data = stream.read(maximum + 1)
        if len(data) > maximum:
            raise ValueError("Release artifact exceeded its size limit")
        return data


def validate(document):
    if not isinstance(document, dict) or type(document.get("format")) is not int or document.get("format") != 1 or document.get("repository") != REPOSITORY:
        raise ValueError("Unexpected release manifest format or source repository")
    if not re.fullmatch(r"[a-f0-9]{40}", str(document.get("commit", ""))):
        raise ValueError("Release requires an exact Git commit")
    if type(document.get("schema")) is not int or document["schema"] < 1:
        raise ValueError("Release requires an explicit compatible schema")
    if document.get("platform") != "linux/amd64":
        raise ValueError("Release platform must match the qualified amd64 stack")
    for key in ("build_run", "quality_run"):
        if not re.fullmatch(r"https://github.com/arshia-rgh/BoosterPlus/actions/runs/[1-9][0-9]*", str(document.get(key, ""))):
            raise ValueError("Release requires authenticated build and quality run references")
    if not isinstance(document.get("images"), dict) or set(document.get("images", {})) != COMPONENTS:
        raise ValueError("Release must contain all five distinct application artifacts")
    for component, item in document["images"].items():
        if not isinstance(item, dict):
            raise ValueError("Release image entry must be an object")
        if not re.fullmatch(r"ghcr\.io/arshia-rgh/boosterplus-" + component + r"@sha256:[a-f0-9]{64}", item.get("image", "")):
            raise ValueError("Release artifact registry, component or digest is invalid")
        if not re.fullmatch(r"[a-f0-9]{64}", item.get("sbom_sha256", "")):
            raise ValueError("Every artifact requires a bound SBOM")
    return document


def verify(directory, trusted_key, trusted_key_hash):
    directory = Path(directory)
    if directory.is_symlink() or not directory.is_dir():
        raise ValueError("Choose a real release bundle directory")
    if not re.fullmatch(r"[a-f0-9]{64}", trusted_key_hash):
        raise ValueError("Pin the independently provisioned release public-key fingerprint")
    key = bounded(trusted_key, 16384)
    if hashlib.sha256(key).hexdigest() != trusted_key_hash:
        raise ValueError("Release trust key does not match its pinned fingerprint")
    raw = bounded(directory / "release.json")
    signature = bounded(directory / "release.sig", 16384)
    # Use the exact bytes signed by the operator; never reserialize before verification.
    # Verify private snapshots of the bytes read above, avoiding replacement races
    # between the fingerprint, signature verification and JSON parsing.
    with tempfile.TemporaryDirectory(prefix="playora-release-verify-") as name:
        temporary = Path(name)
        for filename, data in (("key", key), ("signature", signature), ("manifest", raw)):
            (temporary / filename).write_bytes(data)
        result = subprocess.run(["openssl", "dgst", "-sha256", "-verify", str(temporary / "key"),
                                 "-signature", str(temporary / "signature"), str(temporary / "manifest")],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30, check=False)
    if result.returncode:
        raise ValueError("Release signature verification failed")
    document = validate(json.loads(raw))
    for component, item in document["images"].items():
        sbom = bounded(directory / (component + ".sbom.json"), maximum=64 << 20)
        if hashlib.sha256(sbom).hexdigest() != item["sbom_sha256"]:
            raise ValueError("Release SBOM was changed or replaced")
    return document


def compatible_rollback(current_schema, target):
    # database.Ready currently permits exactly one schema per binary.
    if type(current_schema) is not int or current_schema != target["schema"]:
        raise ValueError("Rollback rejected: target app is incompatible with the current schema; use a forward fix")


def check_remote_run(run, commit, workflow, event):
    if not isinstance(run, dict) or run.get("head_sha") != commit or run.get("head_branch") != "main" or run.get("path") != workflow or run.get("event") != event or run.get("status") != "completed" or run.get("conclusion") != "success" or run.get("head_repository", {}).get("full_name") != REPOSITORY:
        raise ValueError("Authenticated workflow evidence does not qualify this exact release")


def sign(directory, private_key, password_file):
    directory = Path(directory)
    raw = bounded(directory / "release.json")
    document = validate(json.loads(raw))
    for path in (private_key, password_file):
        resolved = Path(path).resolve()
        if not Path(path).is_absolute() or resolved.is_relative_to(Path(__file__).resolve().parents[2]):
            raise ValueError("Keep signing key/password files at absolute paths outside the repository")
        if Path(path).stat().st_mode & 0o077:
            raise ValueError("Signing key/password files require private permissions")
    if not bounded(private_key, 16384).startswith(b"-----BEGIN ENCRYPTED PRIVATE KEY-----"):
        raise ValueError("Use an encrypted PKCS8 release signing key held outside the repository")
    bounded(password_file, 4096)
    with tempfile.TemporaryDirectory(prefix="playora-authenticated-release-") as name:
        downloaded = Path(name)
        for key, workflow, event in (("quality_run", ".github/workflows/ci.yml", "push"),
                                     ("build_run", ".github/workflows/release.yml", "workflow_dispatch")):
            identifier = document[key].rsplit("/", 1)[1]
            output = subprocess.run(["gh", "api", "repos/" + REPOSITORY + "/actions/runs/" + identifier],
                                    capture_output=True, text=True, check=True, timeout=60).stdout
            check_remote_run(json.loads(output), document["commit"], workflow, event)
        subprocess.run(["gh", "run", "download", document["build_run"].rsplit("/", 1)[1],
                        "--repo", REPOSITORY, "--name", "release-bundle", "--dir", str(downloaded)],
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=180)
        if bounded(downloaded / "release.json") != raw:
            raise ValueError("Manifest is not the exact artifact downloaded from the authenticated build")
        for component, item in document["images"].items():
            filename = component + ".sbom.json"
            local = bounded(directory / filename, 64 << 20)
            if hashlib.sha256(local).hexdigest() != item["sbom_sha256"] or local != bounded(downloaded / filename, 64 << 20):
                raise ValueError("SBOM is not the artifact from the authenticated build")
        result = subprocess.run(["openssl", "dgst", "-sha256", "-sign", str(private_key),
                                 "-passin", "file:" + str(password_file), "-out", str(downloaded / "release.sig"),
                                 str(downloaded / "release.json")],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30, check=False)
        if result.returncode:
            raise ValueError("Release signing failed")
        # Never silently replace an existing release signature.
        with (directory / "release.sig").open("xb") as stream:
            stream.write(bounded(downloaded / "release.sig", 16384))
    return document
