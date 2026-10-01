import unittest
from host import GIB, evaluate
from capacity import SMALL, budget


class HostPolicy(unittest.TestCase):
    def setUp(self):
        self.good = {
            "system": "Linux", "architecture": "x86_64", "os_id": "ubuntu", "os_version": "24.04",
            "cpu_count": 16, "memory_bytes": 64 * GIB,
            "disk_total_bytes": 931 * GIB, "disk_free_bytes": 500 * GIB, "filesystem": "ext4",
            "compose_version": "v2.30.0", "docker_os": "linux", "docker_arch": "x86_64",
            "docker_cpus": 16, "docker_memory_bytes": 64 * GIB,
            "local_docker": True, "clock_synchronized": True,
        }

    def test_supported_inventory(self):
        self.assertEqual(evaluate(self.good), [])
        self.assertEqual(evaluate(dict(self.good, filesystem="xfs", compose_version="2.40.1")), [])

    def test_each_unsafe_inventory_is_rejected(self):
        for key, value in (
            ("system", "Darwin"), ("architecture", "arm64"), ("os_id", "other"),
            ("os_version", "22.04"), ("cpu_count", 8), ("memory_bytes", 32 * GIB),
            ("disk_total_bytes", 500 * GIB), ("disk_free_bytes", 20 * GIB),
            ("filesystem", "tmpfs"), ("compose_version", "2.29.9"), ("compose_version", "invalid"),
            ("docker_os", "windows"), ("docker_arch", "arm64"), ("docker_cpus", 4),
            ("docker_memory_bytes", 8 * GIB), ("local_docker", False), ("clock_synchronized", False),
        ):
            with self.subTest(key=key):
                self.assertTrue(evaluate(dict(self.good, **{key: value})))

    def test_small_profile_is_explicit_and_preserves_headroom_boundaries(self):
        limits = budget(SMALL)
        small = dict(self.good, cpu_count=8, docker_cpus=8, memory_bytes=16 * GIB,
                     docker_memory_bytes=16 * GIB, disk_total_bytes=145 * GIB, disk_free_bytes=90 * GIB)
        self.assertTrue(evaluate(small))
        self.assertEqual(evaluate(small, SMALL), [])
        for field, bound in (("memory_bytes", limits["memory"]), ("docker_memory_bytes", limits["memory"]),
                             ("disk_total_bytes", limits["disk"]), ("disk_free_bytes", limits["startup_free"]),
                             ("cpu_count", 8), ("docker_cpus", 8)):
            with self.subTest(field=field):
                self.assertEqual(evaluate(dict(small, **{field: bound}), SMALL), [])
                self.assertTrue(evaluate(dict(small, **{field: bound - 1}), SMALL))
        for field, value in (("clock_synchronized", False), ("local_docker", False), ("filesystem", "tmpfs")):
            self.assertTrue(evaluate(dict(small, **{field: value}), SMALL))
        with self.assertRaises(ValueError):
            evaluate(small, "single-8gb")


if __name__ == "__main__":
    unittest.main()
