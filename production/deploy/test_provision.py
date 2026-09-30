import json
import os
from pathlib import Path
import subprocess
import ssl
import tempfile
import unittest
from provision import COMPONENTS, prepare, private_write
from manage import read_env


def handshake(leaf, hostname):
    """Actual TLS hostname/chain verification without opening a listener."""
    server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    server_context.load_cert_chain(leaf / "server.crt", leaf / "server.key")
    client_context = ssl.create_default_context(cafile=str(leaf / "ca.crt"))
    client_in, client_out, server_in, server_out = [ssl.MemoryBIO() for _ in range(4)]
    client = client_context.wrap_bio(client_in, client_out, server_hostname=hostname)
    server = server_context.wrap_bio(server_in, server_out, server_side=True)
    for _ in range(20):
        try:
            client.do_handshake()
            return
        except ssl.SSLWantReadError:
            pass
        server_in.write(client_out.read())
        try:
            server.do_handshake()
        except ssl.SSLWantReadError:
            pass
        client_in.write(server_out.read())
    raise AssertionError("TLS handshake did not finish")


class ProvisionMaterial(unittest.TestCase):
    def test_complete_material_tls_identity_privileges_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = prepare(Path(directory) / "install")
            self.assertEqual(root.stat().st_mode & 0o777, 0o700)
            creds = read_env(root / "secrets/provisioned.env")
            self.assertNotEqual(creds["DATABASE_DSN"], creds["MIGRATION_DATABASE_DSN"])
            sql = (root / "secrets/initialize.sql").read_text()
            self.assertIn("REQUIRE SSL", sql)
            self.assertIn("GRANT SELECT, INSERT, UPDATE, DELETE ON playora.*", sql)
            self.assertNotIn("CREATE TABLE", sql)  # schema is exclusively the explicit migration job
            identities = json.loads((root / "secrets/storage.json").read_text())["identities"]
            self.assertEqual(identities[1]["actions"], ["Read:playora/media/*", "Write:playora/media/*"])
            self.assertNotIn("Admin", identities[2]["actions"])
            for name in COMPONENTS:
                leaf = root / "pki" / name
                result = subprocess.run(["openssl", "verify", "-CAfile", str(root / "pki/ca.crt"), str(leaf / "server.crt")],
                                        capture_output=True, timeout=10, check=False)
                self.assertEqual(result.returncode, 0, name)
                handshake(leaf, name)
                with self.assertRaises(ssl.SSLCertVerificationError):
                    handshake(leaf, "wrong-host")
                self.assertEqual((leaf / "server.key").stat().st_mode & 0o777, 0o600)
                self.assertFalse((leaf / "ca.key").exists())
            before = (root / "secrets/provisioned.env").read_bytes()
            with self.assertRaises(FileExistsError):
                prepare(root)
            self.assertEqual(before, (root / "secrets/provisioned.env").read_bytes())
            for path in (root / "secrets").iterdir():
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_symlink_and_existing_file_refuse_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            private_write(root / "secret", "private")
            (root / "alias").symlink_to(root / "secret")
            with self.assertRaises(FileExistsError):
                private_write(root / "alias", "replacement")
            with self.assertRaises(FileExistsError):
                prepare(root / "alias")
            self.assertEqual((root / "secret").read_text(), "private")

    def test_failure_restores_umask_and_retains_private_partial_material(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as directory:
            mask = os.umask(0o022)
            try:
                with patch("provision.openssl", side_effect=ValueError("fixture failure")):
                    with self.assertRaises(ValueError):
                        prepare(Path(directory) / "partial")
                current = os.umask(0o022)
                self.assertEqual(current, 0o022)
                self.assertFalse((Path(directory) / "partial/PREPARED").exists())
                self.assertEqual((Path(directory) / "partial").stat().st_mode & 0o777, 0o700)
            finally:
                os.umask(mask)


if __name__ == "__main__":
    unittest.main()
