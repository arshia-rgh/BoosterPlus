import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { access, readdir } from "node:fs/promises";
import { resolve } from "node:path";

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
    const roots = resolve(".react-router/dev");
    const before = new Set(await readdir(roots).catch(() => []));
    let launchRoot;
    const child = spawn(process.execPath, ["scripts/dev.mjs"], {
      env: {
        ...process.env,
        DEV_STOREFRONT_PORT: String(storefront),
        DEV_ADMIN_PORT: String(admin),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let startupOutput = "";
    const capture = (chunk) => {
      startupOutput = (startupOutput + chunk.toString()).slice(-16384);
    };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    const closed = once(child, "exit");
    const origin = "http://127.0.0.1:" + storefront;
    try {
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        if (child.exitCode !== null)
          throw new Error(
            `Development launcher exited before readiness (code ${child.exitCode}, signal ${child.signalCode}):\n${startupOutput}`,
          );
        try {
          const result = await fetch(origin + "/admin/orders", {
            signal: AbortSignal.timeout(500),
          });
          if (result.ok && (await result.text()).includes("Admin workspace")) {
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
        `Both Vite applications must start and render admin deep links through one origin:\n${startupOutput}`,
      );
      const created = (await readdir(roots)).filter(
        (name) => name.startsWith(`launch-${child.pid}-`) && !before.has(name),
      );
      assert.equal(created.length, 1);
      launchRoot = resolve(roots, created[0]);
      for (const application of ["admin", "storefront"]) {
        await access(
          resolve(
            launchRoot,
            application,
            ".react-router/types/+server-build.d.ts",
          ),
        );
      }
      const home = await fetch(origin);
      assert.equal(home.status, 200);
      const homeHTML = await home.text();
      assert.match(homeHTML, /discovery-home/);
      assert.match(homeHTML, /id="game-selection"/);
      assert.doesNotMatch(homeHTML, /rank-journey/);
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
    await assert.rejects(access(launchRoot), { code: "ENOENT" });
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
