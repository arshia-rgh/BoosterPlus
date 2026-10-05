"""Non-root validation must work with private operator umasks/checkouts."""
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
from config_test import webmail_validation_files


class WebmailValidationFilesTest(unittest.TestCase):
    def test_private_source_and_umask_copy_only_public_configuration(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            source = root / "source"
            original = source / "webmail"
            (original / "playora_support").mkdir(parents=True, mode=0o700)
            names = ("config.inc.php", "playora_support/playora_support.php", "fpm.conf")
            for filename in names:
                (original / filename).write_text("non-secret fixture " + filename)
                (original / filename).chmod(0o600)
            (original / "runtime-secret").write_text("must not be copied")
            mode = os.umask(0o077)
            try:
                with patch("config_test.ROOT", source):
                    checked = webmail_validation_files(root)
            finally:
                os.umask(mode)
            self.assertEqual({str(p.relative_to(checked)) for p in checked.rglob("*") if p.is_file()}, set(names))
            for filename in names:
                self.assertEqual((checked / filename).read_bytes(), (original / filename).read_bytes())
                self.assertEqual(stat.S_IMODE((checked / filename).stat().st_mode), 0o444)
                self.assertEqual(stat.S_IMODE((original / filename).stat().st_mode), 0o600)
            for directory in (checked, checked / "playora_support"):
                self.assertEqual(stat.S_IMODE(directory.stat().st_mode), 0o755)
            self.assertEqual(stat.S_IMODE(root.stat().st_mode), 0o700)


if __name__ == "__main__":
    unittest.main()
