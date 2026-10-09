"""Qualification network selection never modifies unrelated Docker networks."""
import ipaddress
import os
from pathlib import Path
import ssl
import socket
import tempfile
import unittest
from unittest.mock import patch
from staging import fixture_resolution, fixture_subnets, prepare
from manage import read_env


class FixtureNetworks(unittest.TestCase):
    def test_portal_resolver_is_bounded_and_restored_on_failure(self):
        with patch("socket.getaddrinfo", return_value=[]) as resolver:
            with self.assertRaisesRegex(RuntimeError, "fixture failure"):
                with fixture_resolution():
                    socket.getaddrinfo("admin.localhost", 443)
                    resolver.assert_called_with("127.0.0.1", 443)
                    socket.getaddrinfo("booster.localhost", 443)
                    resolver.assert_called_with("127.0.0.1", 443)
                    socket.getaddrinfo("foreign.example", 443)
                    resolver.assert_called_with("foreign.example", 443)
                    raise RuntimeError("fixture failure")
            self.assertIs(socket.getaddrinfo, resolver)

    def test_fixture_public_certificates_are_readable_under_private_umask(self):
        for mask in (0o022, 0o077):
            with self.subTest(umask=mask), tempfile.TemporaryDirectory() as directory:
                previous = os.umask(mask)
                try:
                    with patch("staging.network_settings", return_value={}), patch("staging.image_id", return_value="sha256:" + "a" * 64), patch("staging.load", return_value={}), patch("staging.free_port", side_effect=[18443, 18080]):
                        prepare(Path(directory))
                finally:
                    os.umask(previous)
                certs = Path(directory) / "certs"
                self.assertEqual(certs.stat().st_mode & 0o777, 0o755)
                for name in ("ca.crt", "server.crt", "server.key"):
                    self.assertEqual((certs / name).stat().st_mode & 0o777, 0o444)
                self.assertEqual((certs / "ca.key").stat().st_mode & 0o777, 0o600)
                self.assertEqual(Path(directory).stat().st_mode & 0o777, 0o700)
                self.assertEqual((Path(directory) / "backend.env").stat().st_mode & 0o777, 0o600)
                context = ssl.create_default_context(cafile=str(certs / "ca.crt"))
                self.assertEqual(len(context.get_ca_certs()), 1)
                backend = read_env(Path(directory) / "backend.env")
                frontend = read_env(Path(directory) / "frontend.env")
                for key, host in (("PUBLIC_ORIGIN", "localhost"), ("ADMIN_PUBLIC_ORIGIN", "admin.localhost"), ("BOOSTER_PUBLIC_ORIGIN", "booster.localhost")):
                    self.assertEqual(backend[key], "https://" + host + ":18443")
                    self.assertEqual(frontend[key], backend[key])
                gateway = (Path(directory) / "Caddyfile").read_text()
                self.assertEqual(gateway.count("tls /certs/server.crt /certs/server.key"), 3)
                for host in ("localhost", "admin.localhost", "booster.localhost"):
                    self.assertIn("redir https://" + host + ":18443{uri} 308", gateway)

    def test_automatic_pool_cannot_overlap_explicit_edge(self):
        # Reproduces the previous auto /16 versus fixed edge /24 collision.
        occupied = ["172.29.0.0/16", "10.253.0.0/23", "fc00::/64", ""]
        selected = fixture_subnets(occupied)
        self.assertEqual(len(set(selected)), 3)
        for network in selected:
            self.assertEqual(network.prefixlen, 24)
            self.assertTrue(network.is_private)
            for current in occupied:
                if current and ipaddress.ip_network(current).version == 4:
                    self.assertFalse(network.overlaps(ipaddress.ip_network(current)))
            for other in selected:
                if other != network:
                    self.assertFalse(network.overlaps(other))

    def test_exhaustion_and_invalid_inventory_fail_closed(self):
        for occupied in (["10.0.0.0/8"], ["10.253.0.0/16"], ["invalid"]):
            with self.subTest(occupied=occupied), self.assertRaises(ValueError):
                fixture_subnets(occupied)


if __name__ == "__main__":
    unittest.main()
