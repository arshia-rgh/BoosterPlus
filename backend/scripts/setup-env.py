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
