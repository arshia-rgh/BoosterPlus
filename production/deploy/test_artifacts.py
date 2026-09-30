import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from artifacts import COMPONENTS, REPOSITORY, check_remote_run, compatible_rollback, validate, verify


def fixture():
    return {"format": 1, "repository": REPOSITORY, "commit": "a" * 40, "schema": 39,
            "platform": "linux/amd64", "build_run": "https://github.com/" + REPOSITORY + "/actions/runs/1",
            "quality_run": "https://github.com/" + REPOSITORY + "/actions/runs/2",
            "images": {name: {"image": "ghcr.io/arshia-rgh/boosterplus-" + name + "@sha256:" + "b" * 64,
                              "sbom_sha256": hashlib.sha256(b'{}').hexdigest()} for name in COMPONENTS}}


class ArtifactPolicy(unittest.TestCase):
    def test_exact_remote_evidence(self):
        run = {"head_sha": "a" * 40, "head_branch": "main", "path": ".github/workflows/ci.yml",
               "event": "push", "status": "completed", "conclusion": "success",
               "head_repository": {"full_name": REPOSITORY}}
        check_remote_run(run, "a" * 40, ".github/workflows/ci.yml", "push")
        for key, value in (("head_sha", "b" * 40), ("head_branch", "other"), ("path", "other.yml"),
                           ("event", "pull_request"), ("status", "in_progress"), ("conclusion", "failure"),
                           ("head_repository", {"full_name": "other/repo"})):
            with self.subTest(key=key), self.assertRaises(ValueError):
                check_remote_run(dict(run, **{key: value}), "a" * 40, ".github/workflows/ci.yml", "push")

    def test_mutations_and_incompatible_rollback(self):
        good = fixture()
        validate(good)
        compatible_rollback(39, good)
        for mutation in (lambda d:d.update(commit="main"), lambda d:d.update(schema=True),
                         lambda d:d.update(repository="other/repository"), lambda d:d.update(platform="linux/arm64"),
                         lambda d:d.update(build_run="https://elsewhere.invalid/run"),
                         lambda d:d["images"].pop("admin"),
                         lambda d:d["images"]["backend"].update(image="app:latest"),
                         lambda d:d["images"]["backend"].update(sbom_sha256="invalid")):
            changed = copy.deepcopy(good)
            mutation(changed)
            with self.assertRaises(ValueError):
                validate(changed)
        with self.assertRaisesRegex(ValueError, "incompatible"):
            compatible_rollback(40, good)

    def test_real_signature_changed_manifest_sbom_and_key(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            def openssl(*args):
                subprocess.run(["openssl", *map(str, args)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30, check=True)
            openssl("genrsa", "-out", root / "key.pem", "2048")
            openssl("rsa", "-in", root / "key.pem", "-pubout", "-out", root / "public.pem")
            (root / "release.json").write_text(json.dumps(fixture()))
            for component in COMPONENTS:
                (root / (component + ".sbom.json")).write_bytes(b'{}')
            openssl("dgst", "-sha256", "-sign", root / "key.pem", "-out", root / "release.sig", root / "release.json")
            fingerprint = hashlib.sha256((root / "public.pem").read_bytes()).hexdigest()
            self.assertEqual(verify(root, root / "public.pem", fingerprint), fixture())
            with self.assertRaisesRegex(ValueError, "fingerprint"):
                verify(root, root / "public.pem", "0" * 64)
            (root / "backend.sbom.json").write_bytes(b'{"changed":true}')
            with self.assertRaisesRegex(ValueError, "SBOM"):
                verify(root, root / "public.pem", fingerprint)
            (root / "release.json").write_text(json.dumps(dict(fixture(), schema=40)))
            with self.assertRaisesRegex(ValueError, "signature"):
                verify(root, root / "public.pem", fingerprint)


if __name__ == "__main__":
    unittest.main()
