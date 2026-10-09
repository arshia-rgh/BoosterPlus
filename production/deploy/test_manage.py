import copy
import tempfile
from pathlib import Path
import unittest
from manage import check_model, load, read_env, IMAGE_KEYS


def write(path, values):
    path.write_text("".join(k + "=" + v + "\n" for k, v in values.items()))
    path.chmod(0o600)


class DeploymentPolicy(unittest.TestCase):
    def test_private_raw_configuration_never_evaluates_shell(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "config"
            write(path, {"KEY": "$(touch never)${UNEXPANDED}"})
            self.assertEqual(read_env(path)["KEY"], "$(touch never)${UNEXPANDED}")
            path.chmod(0o644)
            with self.assertRaisesRegex(ValueError, "0600"):
                read_env(path)
            path.chmod(0o600)
            path.write_text("KEY=first\nKEY=second\n")
            with self.assertRaisesRegex(ValueError, "duplicate"):
                read_env(path)

    def test_production_settings_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            backend = {"APP_ENV":"production", "PROXY_SHARED_KEY":"a"*64, "PUBLIC_ORIGIN":"https://boost.operator.org", "ADMIN_PUBLIC_ORIGIN":"https://admin.operator.org", "BOOSTER_PUBLIC_ORIGIN":"https://booster.operator.org", "TERMS_VERSION":"approved-v1", "SMTP_TLS":"required", "MEDIA_S3_ENDPOINT":"https://storage.operator.org", "MEDIA_SCANNER_NETWORK":"unix", "DATABASE_DSN":"runtime:placeholder@tcp(db:4000)/app?tls=true"}
            frontend = {"PUBLIC_ORIGIN":"https://boost.operator.org", "ADMIN_PUBLIC_ORIGIN":"https://admin.operator.org", "BOOSTER_PUBLIC_ORIGIN":"https://booster.operator.org", "APP_ENV":"production", "PROXY_SHARED_KEY":"a"*64, "TERMS_VERSION":"approved-v1", "ACCOUNT_TERMS_TEXT":"Test terms"}
            migration = {"APP_ENV":"production", "MIGRATION_DATABASE_DSN":"ddl:placeholder@tcp(db:4000)/app?tls=true"}
            for name, values in (("backend", backend), ("frontend", frontend), ("migration", migration)):
                write(directory/name, values)
            manifest = {"DEPLOY_PROJECT":"boosterplus-test-policy", "SITE_ADDRESS":"boost.operator.org", "ADMIN_SITE_ADDRESS":"admin.operator.org", "BOOSTER_SITE_ADDRESS":"booster.operator.org", "ACME_EMAIL":"ops@operator.org", "EDGE_SUBNET":"172.29.194.0/24", "EDGE_DYNAMIC_RANGE":"172.29.194.128/25", "GATEWAY_IP":"172.29.194.2", **{k: "registry.invalid/app@sha256:" + "b"*64 for k in IMAGE_KEYS}, **{k: str(directory/name) for k,name in (("BACKEND_ENV_FILE","backend"),("FRONTEND_ENV_FILE","frontend"),("MIGRATION_ENV_FILE","migration"))}}
            write(directory/"manifest", manifest)
            self.assertEqual(load(directory/"manifest"), manifest)
            for key,value in (("BACKEND_IMAGE","app:latest"),("GATEWAY_IP","8.8.8.8"),("GATEWAY_IP","172.29.194.130"),("EDGE_DYNAMIC_RANGE","172.29.195.128/25"),("EDGE_SUBNET","0.0.0.0/0"),("SITE_ADDRESS","example.com"),("SITE_ADDRESS",".."),("ADMIN_SITE_ADDRESS",""),("ADMIN_SITE_ADDRESS","boost.operator.org"),("BOOSTER_SITE_ADDRESS","admin.operator.org"),("ADMIN_SITE_ADDRESS","admin.operator.org:443"),("BOOSTER_SITE_ADDRESS","https://booster.operator.org"),("ADMIN_SITE_ADDRESS","admin.localhost"),("ADMIN_SITE_ADDRESS","admin"),("BOOSTER_SITE_ADDRESS","127.0.0.1"),("BOOSTER_SITE_ADDRESS","booster.invalid"),("ACME_EMAIL","bad"),("BACKEND_ENV_FILE","relative.env")):
                with self.subTest(key=key):
                    write(directory/"manifest", dict(manifest, **{key:value}))
                    with self.assertRaises(ValueError):
                        load(directory/"manifest")
            write(directory/"manifest", manifest)
            for key,value in (("APP_ENV","development"),("PROXY_SHARED_KEY","wrong"),("AUTH_KEY","must-not-be-in-frontend"),("TERMS_VERSION","development-preview-v1"),("ACCOUNT_TERMS_TEXT",""),("PUBLIC_ORIGIN","https://wrong.operator.org"),("ADMIN_PUBLIC_ORIGIN","https://boost.operator.org"),("BOOSTER_PUBLIC_ORIGIN","")):
                with self.subTest(key=key):
                    write(directory/"frontend", dict(frontend, **{key:value}))
                    with self.assertRaises(ValueError):
                        load(directory/"manifest")

    def test_every_gateway_origin_is_bound_to_both_runtimes(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            origins = {"PUBLIC_ORIGIN": "https://boost.operator.org", "ADMIN_PUBLIC_ORIGIN": "https://admin.operator.org", "BOOSTER_PUBLIC_ORIGIN": "https://booster.operator.org"}
            backend = {"APP_ENV": "production", "PROXY_SHARED_KEY": "a" * 64, **origins, "TERMS_VERSION": "approved-v1", "SMTP_TLS": "required", "MEDIA_S3_ENDPOINT": "https://storage.operator.org", "MEDIA_SCANNER_NETWORK": "unix", "DATABASE_DSN": "runtime:placeholder@tcp(db:4000)/app?tls=true"}
            frontend = {"APP_ENV": "production", "PROXY_SHARED_KEY": "a" * 64, **origins, "TERMS_VERSION": "approved-v1", "ACCOUNT_TERMS_TEXT": "Test terms"}
            migration = {"APP_ENV": "production", "MIGRATION_DATABASE_DSN": "ddl:placeholder@tcp(db:4000)/app?tls=true"}
            manifest = {"DEPLOY_PROJECT": "boosterplus-test-origins", "SITE_ADDRESS": "boost.operator.org", "ADMIN_SITE_ADDRESS": "admin.operator.org", "BOOSTER_SITE_ADDRESS": "booster.operator.org", "ACME_EMAIL": "ops@operator.org", "EDGE_SUBNET": "172.29.194.0/24", "EDGE_DYNAMIC_RANGE": "172.29.194.128/25", "GATEWAY_IP": "172.29.194.2", **{k: "registry.invalid/app@sha256:" + "b" * 64 for k in IMAGE_KEYS}, **{k: str(directory / name) for k, name in (("BACKEND_ENV_FILE", "backend"), ("FRONTEND_ENV_FILE", "frontend"), ("MIGRATION_ENV_FILE", "migration"))}}
            write(directory / "manifest", manifest)
            for key in origins:
                for filename in ("backend", "frontend"):
                    for value in ("", origins[key] + "/", "http://" + origins[key][8:], "https://foreign.operator.org"):
                        with self.subTest(runtime=filename, key=key, value=value):
                            for name, config in (("backend", backend), ("frontend", frontend), ("migration", migration)):
                                write(directory / name, dict(config, **{key: value}) if name == filename else config)
                            with self.assertRaisesRegex(ValueError, "portal origins"):
                                load(directory / "manifest")

    def test_compose_boundary_mutations_are_rejected(self):
        service = {"read_only":True,"cap_drop":["ALL"],"mem_limit":100,"networks":{"application":{}}}
        model = {"services":{name:copy.deepcopy(service) for name in ("api","worker","storefront","admin","migrate","gateway","scanner")},"networks":{"edge":{"internal":True},"application":{"internal":True}}}
        model["services"]["gateway"].update(networks={"edge":{}}, ports=[{"published":"80"},{"published":"443"}])
        model["services"]["migrate"]["profiles"]=["tools"]
        check_model(model)
        for mutation in (lambda m:m["services"]["api"].update(ports=[{"published":"8080"}]), lambda m:m["services"]["api"].update(privileged=True), lambda m:m["services"]["api"].update(read_only=False), lambda m:m["services"]["gateway"].update(networks={"application":{}}),lambda m:m["services"].update(mailpit={}), lambda m:m["networks"]["edge"].update(internal=False),lambda m:m["services"]["worker"].update(volumes=[{"source":"/var/run/docker.sock"}])):
            changed=copy.deepcopy(model)
            mutation(changed)
            with self.assertRaises(ValueError):
                check_model(changed)


if __name__ == "__main__":
    unittest.main()
