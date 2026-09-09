"""Connect the independent frontend to the local API without exposing proxy secrets to Vite clients."""
import os
from pathlib import Path

frontend = Path(__file__).resolve().parents[1]
output = frontend / ".env"
if output.exists():
    print("Frontend .env already exists; preserved it.")
else:
    source = frontend.parent / "backend" / ".env"
    if not source.exists():
        raise SystemExit("Run make -C backend setup-env first, or configure frontend .env from .env.example.")
    settings = dict(line.split("=", 1) for line in source.read_text().splitlines() if "=" in line)
    proxy = settings.get("PROXY_SHARED_KEY", "")
    if len(proxy) != 64:
        raise SystemExit("Backend proxy secret is missing; run backend setup-env.")
    descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as handle:
        handle.write("APP_ENV=development\nAPI_ORIGIN=http://127.0.0.1:8080\nPROXY_SHARED_KEY=" + proxy + "\n")
    print("Created private frontend .env for the local API.")
