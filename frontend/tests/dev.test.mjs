import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
test(
  "development launcher routes both applications and stops both children",
  { timeout: 45000 },
  async () => {
    const storefront = await freePort();
    const admin = await freePort();
    assert.notEqual(storefront, admin);
    const child = spawn(process.execPath, ["scripts/dev.mjs"], {
      env: {
        ...process.env,
        DEV_STOREFRONT_PORT: String(storefront),
        DEV_ADMIN_PORT: String(admin),
      },
      stdio: "ignore",
    });
    const closed = once(child, "exit");
    const origin = "http://127.0.0.1:" + storefront;
    try {
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        if (child.exitCode !== null)
          throw new Error("Development launcher exited before readiness");
        try {
          const result = await fetch(origin + "/admin/orders", {
            signal: AbortSignal.timeout(500),
          });
          if (result.ok && (await result.text()).includes("Staff workspace")) {
            ready = true;
            break;
          }
        } catch {
          /* Startup is bounded and checked below. */
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      assert.ok(
        ready,
        "Both Vite applications must start and render admin deep links through one origin",
      );
      const home = await fetch(origin);
      assert.equal(home.status, 200);
      assert.match(await home.text(), /rank-journey/);
      const asset = await fetch(origin + "/admin/@vite/client");
      assert.equal(asset.status, 200);
      assert.match(asset.headers.get("content-type"), /javascript/);
      assert.equal((await fetch(origin + "/admin/not-a-page")).status, 404);
    } finally {
      child.kill("SIGTERM");
      await closed;
    }
    for (const port of [storefront, admin]) {
      await assert.rejects(
        fetch("http://127.0.0.1:" + port, { signal: AbortSignal.timeout(500) }),
      );
    }
  },
);
test(
  "development launcher refuses an occupied port without replacing the listener",
  { timeout: 5000 },
  async () => {
    const server = createServer();
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const child = spawn(process.execPath, ["scripts/dev.mjs"], {
        env: {
          ...process.env,
          DEV_STOREFRONT_PORT: String(server.address().port),
          DEV_ADMIN_PORT: String(await freePort()),
        },
        stdio: "ignore",
      });
      const [code] = await once(child, "exit");
      assert.notEqual(code, 0);
      assert.ok(server.listening);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
