import copy
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

from scan_infrastructure import POLICY, assess, audit, findings, inventory


class VendorAcceptance(unittest.TestCase):
    def setUp(self):
        self.image = 'vendor/example:1@sha256:' + 'a' * 64
        self.report = {'SchemaVersion': 2, 'ArtifactType': 'container_image', 'ArtifactName': self.image,
                       'Results': [{'Target': '/bin/example', 'Vulnerabilities': [
                           {'VulnerabilityID': 'CVE-2026-1234', 'PkgName': 'example', 'InstalledVersion': '1',
                            'FixedVersion': '2', 'Severity': 'HIGH', 'PkgPath': '/lib/example'}]}]}
        self.policy = {'schema': 1, 'owner_decision': '2026-10-02-official-vendor-images',
                       'images': {self.image: {'findings': findings(self.report, self.image)}}}

    def test_exact_accepted_findings_remain_visible(self):
        actual, unexpected = assess(self.report, self.image, self.policy)
        self.assertEqual(len(actual), 1)
        self.assertEqual(unexpected, [])

    def test_acceptance_does_not_extend_to_changed_artifacts_or_findings(self):
        for field, value in [('VulnerabilityID', 'CVE-2026-9876'), ('PkgName', 'other'),
                             ('InstalledVersion', '1.1'), ('FixedVersion', '2.1'),
                             ('Severity', 'CRITICAL'), ('PkgPath', '/other')]:
            changed = copy.deepcopy(self.report)
            changed['Results'][0]['Vulnerabilities'][0][field] = value
            with self.subTest(field=field):
                self.assertEqual(len(assess(changed, self.image, self.policy)[1]), 1)
        changed = copy.deepcopy(self.report)
        changed['Results'][0]['Target'] = '/another/binary'
        self.assertEqual(len(assess(changed, self.image, self.policy)[1]), 1)
        changed = copy.deepcopy(self.report)
        image = self.image[:-1] + 'b'
        changed['ArtifactName'] = image
        self.assertEqual(len(assess(changed, image, self.policy)[1]), 1)

    def test_resolved_findings_need_no_exception_and_new_findings_block(self):
        clean = copy.deepcopy(self.report)
        clean['Results'][0]['Vulnerabilities'] = []
        self.assertEqual(assess(clean, self.image, self.policy), ([], []))
        changed = copy.deepcopy(self.report)
        new = dict(changed['Results'][0]['Vulnerabilities'][0], VulnerabilityID='CVE-2026-9876')
        changed['Results'][0]['Vulnerabilities'].append(new)
        actual, unexpected = assess(changed, self.image, self.policy)
        self.assertEqual((len(actual), len(unexpected)), (2, 1))

    def test_missing_or_mismatched_report_never_passes(self):
        for key, value in [('SchemaVersion', 0), ('ArtifactName', 'different'),
                           ('ArtifactType', 'filesystem'), ('Results', None)]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                findings(dict(self.report, **{key: value}), self.image)
        for key in ['VulnerabilityID', 'PkgName', 'InstalledVersion', 'FixedVersion', 'Severity']:
            changed = copy.deepcopy(self.report)
            del changed['Results'][0]['Vulnerabilities'][0][key]
            with self.subTest(missing=key), self.assertRaises(ValueError):
                findings(changed, self.image)
        with self.assertRaises(ValueError):
            assess(self.report, self.image, {})
        for value in ({}, "", 0):
            changed = copy.deepcopy(self.report)
            changed['Results'][0]['Vulnerabilities'] = value
            with self.subTest(invalid_list=value), self.assertRaises(ValueError):
                findings(changed, self.image)

    def test_scanner_failure_or_absent_report_cannot_reuse_stale_success(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'report.json'
            for code in (1, 2):
                path.write_text(json.dumps(self.report))
                def failed(args, **kwargs):
                    self.assertFalse(path.exists())
                    return subprocess.CompletedProcess(args, code)
                with self.assertRaises(RuntimeError):
                    audit(self.image, path, self.policy, failed)
            with self.assertRaises(FileNotFoundError):
                audit(self.image, path, self.policy, lambda args, **kwargs: subprocess.CompletedProcess(args, 0))
            def success(args, **kwargs):
                path.write_text(json.dumps(self.report))
                return subprocess.CompletedProcess(args, 0)
            self.assertEqual(len(audit(self.image, path, self.policy, success)[0]), 1)

    def test_committed_acceptance_covers_only_current_vendor_digests(self):
        policy = json.loads(POLICY.read_text())
        current = set(inventory())
        self.assertTrue(set(policy['images']).issubset(current))
        self.assertEqual(len(current), 8)
        for image, entry in policy['images'].items():
            self.assertIn('@sha256:', image)
            self.assertIn(entry['reviewed_on'], ('2026-10-02', '2026-10-04'))
            self.assertTrue(entry['findings'])
            self.assertEqual(len(entry['source_report_sha256']), 64)


if __name__ == '__main__':
    unittest.main()
