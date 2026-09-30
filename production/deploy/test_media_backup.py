import unittest

from media_backup import covered


class MediaSQLCoverage(unittest.TestCase):
    def test_requires_exact_continuous_recent_coverage_and_schema(self):
        at = 1800000000
        point = (int(at * 1000) - 60000) << 18
        media = {'version': 1, 'schema': 39, 'tso': str(point), 'entries': []}
        base = {'state': 'sql_only', 'commit': 'a' * 40, 'end_tso': str(point - 1)}
        log = {'start_tso': str(point - 2), 'checkpoint_tso': str(point + 1)}
        self.assertEqual(covered(media, base, log, 'a' * 40, 39, at), point)
        for changed in (dict(media, schema=38), dict(media, version=True), dict(media, tso=True), dict(media, tso='-1'), dict(media, tso=str(2 ** 65)), dict(media, entries=None)):
            with self.assertRaises(ValueError):
                covered(changed, base, log, 'a' * 40, 39, at)
        for changed in (dict(base, commit='b' * 40), dict(base, state='failed'), dict(base, end_tso=str(point + 1))):
            with self.assertRaises(ValueError):
                covered(media, changed, log, 'a' * 40, 39, at)
        for changed in (dict(log, checkpoint_tso=str(point - 1)), dict(log, start_tso=str(point)), dict(log, checkpoint_tso=None)):
            with self.assertRaises(ValueError):
                covered(media, base, changed, 'a' * 40, 39, at)
        for now in (at + 901, at - 61):
            with self.assertRaises(ValueError):
                covered(media, base, log, 'a' * 40, 39, now)


if __name__ == '__main__':
    unittest.main()
