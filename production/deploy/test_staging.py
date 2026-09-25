"""Qualification network selection never modifies unrelated Docker networks."""
import ipaddress
import unittest
from staging import fixture_subnets


class FixtureNetworks(unittest.TestCase):
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
