"""Create local-only credentials without printing them or overwriting existing configuration."""
import os
import secrets
from pathlib import Path

output = Path(__file__).resolve().parents[1] / ".env"
if output.exists():
    print("Local .env already exists; preserved it.")
else:
    content = (
        "APP_ENV=development\n"
        "DEV_DATABASE_PASSWORD=" + secrets.token_hex(24) + "\n"
        "DEV_S3_SECRET_KEY=" + secrets.token_hex(24) + "\n"
    )
    descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as handle:
        handle.write(content)
    print("Created private local .env. Never reuse these credentials in production.")

# Upgrade existing local setup without rotating any existing secret.
existing = output.read_text()
additions = ""
for key in ["AUTH_KEY", "PROXY_SHARED_KEY"]:
    if not any(line.startswith(key + "=") for line in existing.splitlines()):
        additions += key + "=" + secrets.token_hex(32) + "\n"
if additions:
    with output.open("a") as handle:
        handle.write(additions)
    print("Added missing identity secrets; existing credentials preserved.")

# Vault keys are independent of authentication/proxy keys and remain outside SQL.
existing = output.read_text()
values = dict(line.split("=", 1) for line in existing.splitlines() if "=" in line and not line.startswith("#"))
additions = ""
if "VAULT_ACTIVE_KEY" not in values:
    additions += "VAULT_ACTIVE_KEY=v1\n"
if "VAULT_KEYS" not in values:
    additions += "VAULT_KEYS=" + values.get("VAULT_ACTIVE_KEY", "v1") + ":" + secrets.token_hex(32) + "\n"
if additions:
    with output.open("a") as handle:
        handle.write(additions)
    print("Added missing vault key configuration; existing keys preserved.")
