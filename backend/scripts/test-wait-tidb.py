"""Regression checks for a forwarding port that accepts before TiDB starts."""
import importlib.util
from pathlib import Path
import socket
import time
import unittest
from unittest.mock import Mock

spec = importlib.util.spec_from_file_location("wait_tidb", Path(__file__).with_name("wait-tidb.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class GreetingTests(unittest.TestCase):
    def check(self, chunks):
        connection = Mock(spec=socket.socket)
        connection.recv.side_effect = chunks
        return module.greeting(connection, time.monotonic() + 5)

    def test_partial_mysql_greeting(self):
        self.assertTrue(self.check([b"\x50", b"\x00\x00", b"\x00\x0a"]))

    def test_accepted_socket_without_mysql(self):
        for chunks in [[b""], [b"\x50\x00", b""], [b"HTTP/"], [b"\x50\x00\x00\x00\xff"], [b"\xff\xff\xff\x00\x0a"]]:
            with self.subTest(chunks=chunks):
                self.assertFalse(self.check(chunks))

    def test_timeout_is_not_readiness(self):
        with self.assertRaises(TimeoutError):
            self.check([TimeoutError()])

    def test_deadline_stops_before_read(self):
        connection = Mock(spec=socket.socket)
        self.assertFalse(module.greeting(connection, time.monotonic() - 1))
        connection.recv.assert_not_called()


if __name__ == "__main__":
    unittest.main()
