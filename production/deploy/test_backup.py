import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from backup import policy, restic, restore_files, snapshot_id, cold_backup
from provision import private_write
from restore import isolated_model
from state import write
from test_artifacts import fixture


class BackupSafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.installation = self.root / "installation"
        self.installation.mkdir(mode=0o700)
        (self.installation / "operations").mkdir(mode=0o700)
        private_write(self.root / "password", "a" * 64)
        self.settings = {"RESTIC_REPOSITORY": "s3:https://backup.operator.org/private/primary",
                         "RESTIC_PASSWORD_FILE": str(self.root / "password"),
                         "AWS_ACCESS_KEY_ID": "fixture", "AWS_SECRET_ACCESS_KEY": "fixture"}
        self.config = self.root / "backup.env"
        private_write(self.config, "".join(k + "=" + v + "\n" for k, v in self.settings.items()))
        self.manifest = {"BACKUP_ENV_FILE": str(self.config), "DATA_DIRECTORY": str(self.installation),
                         "PRIMARY_PUBLIC_IP": "8.8.8.8", "BACKUP_OFFHOST_CONFIRMED": "true",
                         "DEPLOY_PROJECT": "boosterplus-fixture"}

    def test_destination_credentials_and_password_boundaries(self):
        policy(self.manifest, resolve=False)
        with patch("backup.socket.getaddrinfo", return_value=[(0, 0, 0, "", ("8.8.8.8", 443))]):
            with self.assertRaisesRegex(ValueError, "primary"):
                policy(self.manifest)
        for url in ("/local/disk", "s3:http://backup.test/bucket/prefix", "s3:https://user:password@backup.test/bucket/prefix", "s3:https://backup.test/bucket/prefix?secret=yes"):
            self.config.write_text("".join(k + "=" + v + "\n" for k, v in dict(self.settings, RESTIC_REPOSITORY=url).items()))
            with self.assertRaises(ValueError):
                policy(self.manifest, resolve=False)

    def test_partial_backup_status_three_is_failure(self):
        class Result:
            returncode = 3
            stdout = '{"message_type":"summary","snapshot_id":"' + "a" * 64 + '"}'
            stderr = "private inaccessible file"
        with patch("backup.policy", return_value=(self.config, self.root / "password", self.settings)):
            with self.assertRaises(RuntimeError):
                restic(self.manifest, ["backup"], runner=lambda *a, **kw: Result())
        for output in ("", '{"message_type":"summary","snapshot_id":"short"}'):
            with self.assertRaises(ValueError):
                snapshot_id(output)

    def test_restore_rejects_primary_existing_path_missing_ack_and_foreign_snapshot(self):
        for target, ack in ((self.installation, str(self.installation)), (self.installation / "new", str(self.installation / "new")), (self.root / "restore", "")):
            with self.assertRaises(ValueError):
                restore_files(self.manifest, "a" * 64, target, ack)
        target = self.root / "restore"
        with patch("backup.restic", return_value='[]'):
            with self.assertRaisesRegex(ValueError, "snapshot"):
                restore_files(self.manifest, "a" * 64, target, str(target))
        self.assertFalse(target.exists())

    def test_failed_restore_keeps_quarantine_and_never_changes_primary(self):
        target = self.root / "restore"
        matches = json.dumps([{"id": "a" * 64, "hostname": "boosterplus-fixture", "tags": ["playora-cold-v1"]}])
        with patch("backup.restic", side_effect=[matches, RuntimeError("fixture interruption")]):
            with self.assertRaises(RuntimeError):
                restore_files(self.manifest, "a" * 64, target, str(target))
        self.assertTrue((target / "RESTORE_QUARANTINED").exists())
        self.assertFalse((target / "restore-files.json").exists())

    def test_failed_upload_restores_only_previously_running_services(self):
        release = {"project": "boosterplus-fixture", "state": "complete", "release": fixture()}
        write(self.installation / "operations", "boosterplus-fixture-current.json", release)
        for key in ("BACKEND_ENV_FILE", "FRONTEND_ENV_FILE", "MIGRATION_ENV_FILE"):
            private_write(self.root / key, "APP_ENV=production\n")
            self.manifest[key] = str(self.root / key)
        calls = []
        def command(manifest, args, **kw):
            calls.append(args)
            return ""
        with patch("backup.policy"), patch("backup.running_services", return_value=["pd", "tikv", "tidb"]), patch("backup.run", side_effect=command), patch("backup.restic", side_effect=RuntimeError("upload failed")):
            with self.assertRaisesRegex(RuntimeError, "upload"):
                cold_backup(self.manifest, "boosterplus-fixture")
        self.assertEqual(calls[-1], ["up", "-d", "--no-deps", "pd", "tikv", "tidb"])
        self.assertFalse((self.installation / "operations/boosterplus-fixture-backup.json").exists())

    def test_restore_model_has_no_worker_mail_public_port_or_egress(self):
        service = {"networks": {"outbound": {}, "data-client": {}}, "ports": [{"target": 1}], "depends_on": {"worker": {}}, "container_name": "primary"}
        model = {"services": {name: copy.deepcopy(service) for name in ("pd", "tikv", "tidb", "api", "migrate", "worker", "mailserver", "gateway", "storage", "object-gateway")}}
        result = isolated_model(model, "boosterplus-restore-fixture", "boosterplus-primary")
        self.assertFalse({"worker", "mailserver", "gateway"} & set(result["services"]))
        self.assertTrue(all(net["internal"] for net in result["networks"].values()))
        for service in result["services"].values():
            self.assertNotIn("ports", service)
            self.assertNotIn("outbound", service["networks"])
            self.assertNotIn("container_name", service)


if __name__ == "__main__":
    unittest.main()
