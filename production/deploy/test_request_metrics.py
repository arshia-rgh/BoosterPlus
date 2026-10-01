from datetime import datetime, timezone
import json
import unittest

from dashboard import render
from request_metrics import aggregate


class RequestMetrics(unittest.TestCase):
    def test_bounded_samples_ignore_identifiers_and_old_rows(self):
        at = 1800000000
        stamp = datetime.fromtimestamp(at - 1, timezone.utc).isoformat()
        rows = [json.dumps({'time': stamp, 'msg': 'request completed', 'method': 'GET', 'status': 500 if i > 95 else 200, 'duration_ms': i, 'request_id': 'private-marker'}) for i in range(1, 101)]
        rows += [json.dumps({'time': '2000-01-01T00:00:00Z', 'msg': 'request completed', 'method': 'GET', 'status': 500, 'duration_ms': 999999})]
        result = aggregate('\n'.join(rows).encode(), at)
        self.assertEqual(result['requests'], 100)
        self.assertEqual(result['p95_ms'], 95)
        self.assertEqual(result['server_errors'], 5)
        self.assertNotIn('private-marker', json.dumps(result))
        self.assertTrue(result['sampled'])
        self.assertIsNone(aggregate(b'', at)['p95_ms'])
        with self.assertRaises(ValueError): aggregate(b'x' * ((16 << 20) + 1), at)

    def test_invalid_samples_and_offline_dashboard_escape(self):
        at = 1800000000
        row = {'time': datetime.fromtimestamp(at, timezone.utc).isoformat(), 'msg': 'request completed', 'method': 'GET', 'status': 200, 'duration_ms': -1}
        result = aggregate(json.dumps(row).encode(), at)
        self.assertEqual(result['malformed_lines'], 1)
        self.assertEqual(result['requests'], 0)
        report = render({'observed_at': '<script>bad()</script>', 'alerts': ['<img src=x>'], 'values': {'jobs_failed': 2}, 'runtime': {'password': 'private-marker'}})
        self.assertNotIn('<script>', report)
        self.assertNotIn('<img', report)
        self.assertNotIn('private-marker', report)
        self.assertIn('jobs_failed', report)


if __name__ == '__main__': unittest.main()
