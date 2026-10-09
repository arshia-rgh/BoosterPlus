import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import {
  portalOrigins,
  portalForHost,
  legacyPortalTarget,
} from "../portal-hosts.mjs";

const config = {
  APP_ENV: "production",
  PUBLIC_ORIGIN: "https://playora.example",
  ADMIN_PUBLIC_ORIGIN: "https://admin.playora.example",
  BOOSTER_PUBLIC_ORIGIN: "https://pro.playora.example",
};
const origins = portalOrigins(config);

test("portal origins require three exact, distinct HTTPS hostnames", () => {
  assert.equal(portalOrigins({}), null);
  assert.equal(origins.booster, config.BOOSTER_PUBLIC_ORIGIN);
  for (const invalid of [
    { ADMIN_PUBLIC_ORIGIN: "" },
    { BOOSTER_PUBLIC_ORIGIN: "https://admin.playora.example" },
    { BOOSTER_PUBLIC_ORIGIN: "https://admin.playora.example:8443" },
    { ADMIN_PUBLIC_ORIGIN: "https://admin.playora.example/" },
    { ADMIN_PUBLIC_ORIGIN: "https://user:pass@admin.playora.example" },
    { ADMIN_PUBLIC_ORIGIN: "https://admin.playora.example?override=1" },
    { ADMIN_PUBLIC_ORIGIN: "http://admin.playora.example" },
  ])
    assert.throws(() => portalOrigins({ ...config, ...invalid }));
  assert.equal(
    portalOrigins({
      APP_ENV: "test",
      PUBLIC_ORIGIN: "http://localhost:3000",
      ADMIN_PUBLIC_ORIGIN: "http://admin.localhost:3000",
      BOOSTER_PUBLIC_ORIGIN: "http://pro.localhost:3000",
    }).admin,
    "http://admin.localhost:3000",
  );
});

test("raw Host and application select exactly one trusted portal", () => {
  assert.equal(
    portalForHost("ADMIN.PLAYORA.EXAMPLE", origins, "admin"),
    "admin",
  );
  assert.equal(
    portalForHost("pro.playora.example", origins, "storefront"),
    "booster",
  );
  for (const host of [
    "unknown.example",
    "admin.playora.example:443",
    "admin.playora.example.evil.test",
    "admin.playora.example,playora.example",
    "admin.playora.example/",
    "user@admin.playora.example",
    undefined,
  ])
    assert.equal(portalForHost(host, origins, "both"), null);
  assert.equal(
    portalForHost("admin.playora.example", origins, "storefront"),
    null,
  );
  assert.equal(portalForHost("playora.example", origins, "admin"), null);
});

test("legacy redirects retain bounded workspace state, never callback credentials", () => {
  assert.deepEqual(
    legacyPortalTarget(
      "/admin/orders/123?section=messages&code=private&token=private&returnTo=%2Fadmin%2Forders%2F123",
      "customer",
      origins,
    ),
    {
      status: 302,
      location:
        "https://admin.playora.example/orders/123?section=messages&returnTo=%2Fadmin%2Forders%2F123",
    },
  );
  assert.deepEqual(legacyPortalTarget("/booster", "customer", origins), {
    status: 302,
    location: "https://pro.playora.example/",
  });
  assert.deepEqual(
    legacyPortalTarget(
      "/admin/login?returnTo=https%3A%2F%2Fevil.test&section=" +
        "x".repeat(257),
      "customer",
      origins,
    ),
    { status: 302, location: "https://admin.playora.example/login" },
  );
  for (const path of [
    "/admin.data",
    "/admin/orders.data",
    "/admin/%2e%2e/",
    "/admin/../account",
    "/admin//evil.test",
    "/admin/\\evil.test",
    "/%62ooster/login",
    "/ad%6din/orders",
    "/%61dmin%2Flogin",
    "/./booster/login",
    "/%2e/booster/login",
    "/other/../booster/login",
    "/other/%2e%2e/booster/login",
  ])
    assert.deepEqual(legacyPortalTarget(path, "customer", origins), {
      status: 409,
    });
  assert.deepEqual(legacyPortalTarget("/admin/orders", "booster", origins), {
    status: 404,
  });
  for (const path of [
    "/admin/assets/app-123.js",
    "/booster/assets/app-123.js",
    "/api/v1/auth/portals/admin/google/callback",
    "/administrator",
    "/login",
  ])
    assert.equal(legacyPortalTarget(path, "customer", origins), null);
});

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}
async function send(port, host, path, { method = "GET", headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: { ...headers, Host: host },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("error", reject);
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString(),
          }),
        );
      },
    );
    req.setTimeout(4000, () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    req.end();
  });
}
async function start(t, application, apiPort, secret) {
  const reservation = createServer();
  const port = await listen(reservation);
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, ["server.mjs"], {
    env: {
      ...process.env,
      ...config,
      FRONTEND_APP: application,
      HOST: "127.0.0.1",
      PORT: String(port),
      API_ORIGIN: `http://127.0.0.1:${apiPort}`,
      PROXY_SHARED_KEY: secret,
      TERMS_VERSION: "retained-v1",
      ACCOUNT_TERMS_TEXT: "Retained fixture terms",
      TRUST_PROXY_CIDRS: "",
    },
    stdio: "ignore",
  });
  t.after(async () => {
    if (child.exitCode !== null) return;
    const closed = once(child, "exit");
    child.kill("SIGTERM");
    await closed;
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null)
      throw new Error(`${application} server failed to start`);
    try {
      if ((await send(port, "127.0.0.1", "/healthz")).status === 200)
        return port;
    } catch {
      /* Bounded readiness retry, no application mutation. */
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Portal server startup timed out");
}

for (const application of ["storefront", "admin"]) {
  test(
    `split ${application} serves clean routes and binds API authority`,
    { timeout: 30000 },
    async (t) => {
      const secret = randomBytes(32).toString("hex");
      const backend = createServer((req, res) => {
        res.setHeader("Content-Type", "application/json");
        const authority = req.headers["x-playora-request-origin"];
        if (
          req.headers["x-booster-proxy-key"] !== secret ||
          !Object.values(origins).includes(authority)
        ) {
          res.writeHead(403).end("{}");
          return;
        }
        if (
          /^\/api\/v1\/auth\/portals\/(customer|admin|booster)\/session$/.test(
            req.url,
          )
        ) {
          res.end(JSON.stringify({ terms_version: "published-v2" }));
          return;
        }
        if (req.url === "/api/v1/site/legal") {
          // Real API rejects a staff selector on this public endpoint.
          if (req.headers["x-playora-portal"]) {
            res.writeHead(403).end("{}");
            return;
          }
          res.end(
            JSON.stringify({
              release_id: "fixture-legal",
              kind: "legal",
              label: "published-v2",
              data: { text: "Published fixture terms" },
            }),
          );
          return;
        }
        res.end(
          JSON.stringify({
            authority,
            selector: req.headers["x-playora-portal"] ?? null,
            internal: req.headers["x-playora-frontend-portal"] ?? null,
            forwardedHost: req.headers["x-forwarded-host"] ?? null,
          }),
        );
      });
      const apiPort = await listen(backend);
      t.after(() => new Promise((resolve) => backend.close(resolve)));
      const port = await start(t, application, apiPort, secret);
      const portals =
        application === "admin" ? ["admin"] : ["customer", "booster"];
      for (const portal of portals) {
        const host = new URL(origins[portal]).host;
        const result = await send(port, host, "/login", {
          headers: {
            "X-Playora-Frontend-Portal": "admin",
            "X-Forwarded-Host": "evil.example",
          },
        });
        assert.equal(result.status, 200, result.body.slice(0, 200));
        assert.match(result.body, new RegExp(`data-portal="${portal}"`));
        assert.equal(result.headers["cache-control"], "no-store");
        assert.equal(result.headers["x-robots-tag"], "noindex, nofollow");
        if (portal !== "customer") {
          assert.doesNotMatch(result.body, /data-portal="customer"/);
          const asset = [
            ...result.body.matchAll(/(?:src|href)="([^"?]+\/assets\/[^"?]+)"/g),
          ][0]?.[1];
          assert.ok(asset, "Isolated staff asset is present");
          const bytes = await send(port, host, asset);
          assert.equal(bytes.status, 200);
          assert.match(bytes.headers["cache-control"], /immutable/);
          assert.equal(
            (await send(port, host, "/orders/fixture?section=messages")).status,
            200,
          );
          assert.equal((await send(port, host, "/games")).status, 404);
        }
        const response = await send(port, host, "/api/v1/probe", {
          headers: {
            "X-Playora-Request-Origin": "https://evil.example",
            "X-Playora-Frontend-Portal": "admin",
            "X-Forwarded-Host": "admin.playora.example",
            "X-Playora-Portal": portal,
          },
        });
        assert.deepEqual(JSON.parse(response.body), {
          authority: origins[portal],
          selector: portal,
          internal: null,
          forwardedHost: null,
        });
        const opposite = portal === "admin" ? "booster" : "admin";
        const mismatch = await send(port, host, "/api/v1/probe", {
          headers: { "X-Playora-Portal": opposite },
        });
        assert.equal(
          JSON.parse(mismatch.body).authority,
          origins[portal],
          "Selector cannot change trusted host authority; backend rejects mismatches",
        );
      }
      for (const host of [
        "evil.example",
        application === "admin" ? "playora.example" : "admin.playora.example",
      ])
        assert.equal((await send(port, host, "/login")).status, 421);
      if (application === "storefront") {
        const legacy = await send(
          port,
          "playora.example",
          "/admin/orders/fixture?section=messages&code=secret",
        );
        assert.equal(legacy.status, 302);
        assert.equal(
          legacy.headers.location,
          "https://admin.playora.example/orders/fixture?section=messages",
        );
        assert.equal(legacy.headers["cache-control"], "no-store");
        for (const method of ["POST", "PUT", "DELETE"]) {
          const unsafe = await send(
            port,
            "playora.example",
            "/admin/orders/fixture",
            { method },
          );
          assert.equal(unsafe.status, 405);
          assert.equal(unsafe.headers.location, undefined);
        }
        assert.equal(
          (await send(port, "playora.example", "/booster/orders.data")).status,
          409,
        );
      }
    },
  );
}
