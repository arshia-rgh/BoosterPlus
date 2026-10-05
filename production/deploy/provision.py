"""Offline first-install material. No application migration or external request."""
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess

COMPONENTS = ("pd", "tikv", "tidb", "storage", "object-gateway", "operations")


def private_write(path, value):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as stream:
        stream.write(value)


def openssl(*arguments):
    try:
        subprocess.run(["openssl", *map(str, arguments)], check=True,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
    except (OSError, subprocess.SubprocessError):
        raise ValueError("Certificate operation failed; incomplete material was retained privately") from None


def prepare(directory, *, qualification=False):
    root = Path(directory)
    if not root.is_absolute() or root.parent.is_symlink() or not root.parent.is_dir():
        raise ValueError("Choose an absolute installation path below an existing real directory")
    # Exclusive creation is intentional: retrying must never rotate keys under live data.
    root.mkdir(mode=0o700)
    old_umask = os.umask(0o077)
    try:
        for name in ("pki", "secrets", "data", "operations", "mail"):
            (root / name).mkdir(mode=0o700)
        for name in ("pd", "tikv", "tidb", "storage", "gateway"):
            (root / "data" / name).mkdir(mode=0o700)
        for name in ("master", "volumes", "filer"):
            (root / "data/storage" / name).mkdir(mode=0o700)
        for name in ("config", "data", "state", "logs"):
            (root / "mail" / name).mkdir(mode=0o700)
        pki = root / "pki"
        openssl("req", "-x509", "-newkey", "rsa:3072", "-nodes", "-sha256", "-days", "3650",
                "-subj", "/CN=PLAYORA private data CA", "-keyout", pki / "ca.key", "-out", pki / "ca.crt",
                "-addext", "basicConstraints=critical,CA:TRUE,pathlen:0",
                "-addext", "keyUsage=critical,keyCertSign,cRLSign")
        # Public CA only is mounted into UID 65532 app containers; signing key stays private.
        (pki / "ca.crt").chmod(0o644)
        for name in COMPONENTS:
            path = pki / name
            path.mkdir(mode=0o700)
            # PD also verifies its own client endpoint through loopback.
            names = name + (",IP:127.0.0.1" if name == "pd" or (qualification and name == "tidb") else "")
            private_write(path / "extensions.cnf", "basicConstraints=critical,CA:FALSE\n"
                          "keyUsage=critical,digitalSignature,keyEncipherment\n"
                          "extendedKeyUsage=serverAuth,clientAuth\nsubjectAltName=DNS:" + names + "\n")
            openssl("req", "-newkey", "rsa:3072", "-nodes", "-subj", "/CN=" + name,
                    "-keyout", path / "server.key", "-out", path / "request.csr")
            openssl("x509", "-req", "-in", path / "request.csr", "-CA", pki / "ca.crt",
                    "-CAkey", pki / "ca.key", "-set_serial", "0x" + secrets.token_hex(16),
                    "-days", "90", "-sha256", "-extfile", path / "extensions.cnf", "-out", path / "server.crt")
            shutil.copyfile(pki / "ca.crt", path / "ca.crt")
            (path / "request.csr").unlink()
            (path / "extensions.cnf").unlink()
        credentials = {name: secrets.token_hex(32) for name in
                       ("root", "runtime", "migration", "s3_admin", "s3_runtime", "s3_backup")}
        # Only generated hexadecimal values enter SQL. No user input or shell expansion.
        sql = "SET GLOBAL tidb_redact_log = ON;\n"
        sql += "ALTER USER 'root'@'%' IDENTIFIED BY '" + credentials["root"] + "' REQUIRE SSL;\n"
        sql += "CREATE DATABASE playora CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;\n"
        for name in ("runtime", "migration"):
            sql += "CREATE USER 'playora_" + name + "'@'%' IDENTIFIED BY '" + credentials[name] + "' REQUIRE SSL;\n"
        sql += "GRANT SELECT, INSERT, UPDATE, DELETE ON playora.* TO 'playora_runtime'@'%';\n"
        sql += "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES ON playora.* TO 'playora_migration'@'%';\n"
        private_write(root / "secrets/initialize.sql", sql)
        identities = []
        for name, actions in (("admin", ["Admin"]),
                              ("runtime", ["Read:playora/media/*", "Write:playora/media/*"]),
                              ("backup", ["Read:playora", "List:playora"])):
            identities.append({"name": "playora-" + name,
                               "credentials": [{"accessKey": "playora-" + name,
                                                "secretKey": credentials["s3_" + name]}],
                               "actions": actions})
        private_write(root / "secrets/storage.json", json.dumps({"identities": identities}))
        values = {
            "DATABASE_DSN": "playora_runtime:" + credentials["runtime"] + "@tcp(tidb:4000)/playora?tls=true",
            "MIGRATION_DATABASE_DSN": "playora_migration:" + credentials["migration"] + "@tcp(tidb:4000)/playora?tls=true",
            "ADMIN_DATABASE_DSN": "root:" + credentials["root"] + "@tcp(tidb:4000)/mysql?tls=true",
            "MEDIA_S3_ENDPOINT": "https://object-gateway:8443", "MEDIA_S3_BUCKET": "playora",
            "MEDIA_S3_ACCESS_KEY": "playora-runtime", "MEDIA_S3_SECRET_KEY": credentials["s3_runtime"],
            "STORAGE_ADMIN_ACCESS_KEY": "playora-admin", "STORAGE_ADMIN_SECRET_KEY": credentials["s3_admin"],
            "STORAGE_BACKUP_ACCESS_KEY": "playora-backup", "STORAGE_BACKUP_SECRET_KEY": credentials["s3_backup"],
        }
        private_write(root / "secrets/provisioned.env", "".join(key + "=" + value + "\n" for key, value in values.items()))
        private_write(root / "PREPARED", "playora-single-host-v1\n")
    finally:
        os.umask(old_umask)
    return root


def main(directory):
    if os.getuid() != 1000:
        raise ValueError("Prepare as the dedicated UID 1000 deployment account used by data containers")
    prepare(directory)
    print("Private data-service material prepared; no services started and no schema migrated")
    print("Store the CA signing key and recovery secrets independently; do not paste generated files into chat")
