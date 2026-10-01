import copy
import unittest

from load import summarize, validate


class LoadBoundary(unittest.TestCase):
    def test_rejects_public_target_foreign_origin_and_missing_sessions(self):
        plan = {'origin': 'https://127.0.0.1:18443', 'acknowledgement': 'isolated-fixtures-no-live-provider', 'project': 'boosterplus-load-' + 'a' * 12,
                'sessions': [{'fixture_id': 'fixture-' + str(i), 'steps': [{'method': 'GET', 'path': '/api/v1/me', 'class': 'ordinary', 'expected_status': 200}]} for i in range(100)]}
        validate(plan)
        for change in (dict(plan, origin='https://merchant.example.org'), dict(plan, sessions=plan['sessions'][:99]), dict(plan, acknowledgement='production')):
            with self.assertRaises(ValueError): validate(change)
        changed = copy.deepcopy(plan)
        changed['sessions'][0]['steps'][0]['headers'] = {'Origin': 'https://foreign.example.org'}
        with self.assertRaises(ValueError): validate(changed)

    def test_missing_class_errors_latency_and_slow_schedule_fail(self):
        samples = [{'class': kind, 'elapsed_ms': 100, 'passed': True} for kind in ('ordinary', 'estimate', 'chat') for _ in range(100)]
        self.assertTrue(summarize(samples, 15, 300)['passed'])
        self.assertFalse(summarize(samples[:200], 15, 200)['passed'])
        self.assertFalse(summarize(samples, 40, 300)['passed'])
        samples[0]['passed'] = False
        self.assertFalse(summarize(samples, 15, 300)['passed'])


if __name__ == '__main__': unittest.main()
