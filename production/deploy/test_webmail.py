import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from manage import compose
from webmail import IMAGE, check_prepared, enabled


class WebmailScope(unittest.TestCase):
    def test_operator_webmail_is_explicit_and_requires_private_self_hosted_mail(self):
        self.assertFalse(enabled({}))
        for manifest in ({'WEBMAIL_ENABLED':'yes'}, {'WEBMAIL_ENABLED':'true'},
                         {'WEBMAIL_ENABLED':'true','MAIL_MODE':'external'}):
            with self.assertRaises(ValueError):
                enabled(manifest)
        manifest = {'WEBMAIL_ENABLED':'true','MAIL_MODE':'self-hosted',
                    'DATA_TOPOLOGY':'self-hosted-single','DEPLOY_PROJECT':'boosterplus-webmail'}
        self.assertTrue(enabled(manifest))
        self.assertTrue(any(p.endswith('compose.webmail.yaml') for p in compose(manifest)))
        with self.assertRaises(ValueError):
            compose(manifest, staging=True)

    def test_partial_wrong_image_and_public_settings_refuse_deployment(self):
        with TemporaryDirectory() as name:
            manifest = {'WEBMAIL_ENABLED':'true', 'MAIL_MODE':'self-hosted', 'DATA_DIRECTORY':name}
            root = Path(name) / 'mail/webmail'
            root.mkdir(parents=True)
            with self.assertRaises(ValueError):
                check_prepared(manifest)
            (root / 'PREPARED').write_text(IMAGE + '\n')
            for filename in ('code/public_html/index.php', 'code/public_html/static.php',
                             'code/config/config.inc.php', 'db/roundcube.db', 'des-key'):
                path = root / filename
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('fixture')
                path.chmod(0o600)
            (root / 'db').chmod(0o700)
            check_prepared(manifest)
            (root / 'des-key').chmod(0o644)
            with self.assertRaises(ValueError):
                check_prepared(manifest)
            (root / 'des-key').chmod(0o600)
            (root / 'PREPARED').write_text('other-image\n')
            with self.assertRaises(ValueError):
                check_prepared(manifest)


if __name__ == '__main__':
    unittest.main()
