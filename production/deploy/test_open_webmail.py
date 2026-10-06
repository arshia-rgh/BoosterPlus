"""Never present a browser login before verified end-to-end tunnel readiness."""
import ssl
import unittest
from unittest.mock import MagicMock, patch
from open_webmail import ready


class WebmailReadiness(unittest.TestCase):
    def setUp(self):
        self.tunnel = MagicMock()
        self.tunnel.poll.return_value = None

    @patch('open_webmail.socket.create_connection')
    @patch('open_webmail.ssl.create_default_context')
    def test_checks_hostname_and_response(self, context, connect):
        secure = context.return_value.wrap_socket.return_value.__enter__.return_value
        secure.recv.side_effect = [b'HTTP/1.1 ', b'200 OK\r\n']
        ready(self.tunnel)
        self.assertEqual(context.return_value.wrap_socket.call_args.kwargs['server_hostname'], 'mail.playoragames.com')
        self.assertIn(b'HEAD /', secure.sendall.call_args.args[0])

    @patch('open_webmail.time.sleep')
    @patch('open_webmail.socket.create_connection', side_effect=TimeoutError)
    def test_stalled_tunnel_is_bounded(self, connect, sleep):
        with self.assertRaisesRegex(RuntimeError, 'did not respond'):
            ready(self.tunnel)
        self.assertEqual(connect.call_count, 3)

    @patch('open_webmail.socket.create_connection', side_effect=ssl.SSLCertVerificationError)
    def test_certificate_error_never_retried_or_ignored(self, connect):
        with self.assertRaisesRegex(RuntimeError, 'certificate verification failed'):
            ready(self.tunnel)
        self.assertEqual(connect.call_count, 1)

    def test_dead_tunnel_refuses(self):
        self.tunnel.poll.return_value = 255
        with self.assertRaisesRegex(RuntimeError, 'tunnel exited'):
            ready(self.tunnel)

    @patch('open_webmail.socket.create_connection')
    @patch('open_webmail.ssl.create_default_context')
    def test_unhealthy_http_refuses(self, context, connect):
        context.return_value.wrap_socket.return_value.__enter__.return_value.recv.return_value = b'HTTP/1.1 502 Bad Gateway\r\n'
        with self.assertRaisesRegex(RuntimeError, 'not ready'):
            ready(self.tunnel)


if __name__ == '__main__':
    unittest.main()
