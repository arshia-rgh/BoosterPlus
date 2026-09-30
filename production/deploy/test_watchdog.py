from datetime import datetime, timezone
import json
import unittest

from watchdog import collect, heartbeat, probe


class IndependentWatchdog(unittest.TestCase):
    def test_stale_future_naive_or_malformed_heartbeat_fails(self):
        value = {'observed_at': datetime.fromtimestamp(1000, timezone.utc).isoformat(), 'alerts': ['jobs_failed']}
        self.assertEqual(heartbeat(json.dumps(value), 1001), ['jobs_failed'])
        for at in (999, 1181):
            with self.assertRaises(ValueError):
                heartbeat(json.dumps(value), at)
        for bad in ('{}', '[]', '{"observed_at":"1970-01-01T00:16:40","alerts":[]}', json.dumps(dict(value, alerts=['private email@domain.org']))):
            with self.assertRaises(ValueError):
                heartbeat(bad, 1001)

    def test_whole_host_outage_and_host_key_failure_are_detected(self):
        cfg = dict(WATCHDOG_ORIGIN='https://operator.test', WATCHDOG_KNOWN_HOSTS_FILE='/private/hosts',
                   WATCHDOG_IDENTITY_FILE='/private/key', WATCHDOG_SSH_PORT='22',
                   WATCHDOG_SSH_USER='monitor', WATCHDOG_SSH_HOST='primary.test')
        commands = []
        class Result:
            returncode = 255
            stdout = 'private raw SSH diagnostic'
        def runner(command, **kwargs):
            commands.append(command)
            return Result()
        def unavailable(_):
            raise OSError('private network detail')
        result = collect(cfg, runner, unavailable)
        self.assertEqual(result['alerts'], ['independent_heartbeat_unavailable', 'independent_public_unavailable'])
        self.assertNotIn('private', json.dumps(result))
        self.assertIn('StrictHostKeyChecking=yes', commands[0])
        self.assertIn('ClearAllForwardings=yes', commands[0])

    def test_redirect_error_page_and_wrong_type_do_not_pass(self):
        class Response:
            status = 200
            headers = {'Content-Type': 'text/html; charset=utf-8'}
            def __enter__(self): return self
            def __exit__(self, *args): return None
            def read(self, size):
                if size != 4096: raise AssertionError('unbounded page read')
                return b'fixture'
        class Client:
            def open(self, request, **kwargs): return Response()
        self.assertGreaterEqual(probe('https://operator.test', Client()), 0)
        for status, kind in ((302, 'text/html'), (503, 'text/html'), (200, 'application/json')):
            Response.status = status
            Response.headers = {'Content-Type': kind}
            with self.assertRaises(ValueError):
                probe('https://operator.test', Client())


if __name__ == '__main__':
    unittest.main()
